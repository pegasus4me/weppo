import { randomUUID } from "node:crypto";

import {
  createPkceChallenge,
  generateOAuthState,
  generatePkceVerifier,
  hashOAuthState,
  IntegrationSecretCipher,
  secretAssociatedData,
} from "./crypto.js";
import {
  IntegrationFlowError,
  integrationProviders,
  intercomExpectedPermissions,
  notionReadPermissions,
  sentryScopes,
  type IntegrationActor,
  type IntegrationConnectionSummary,
  type IntegrationProvider,
  type IntegrationStatus,
  type IntercomRegion,
  type ProviderToken,
  type StoredIntegrationConnection,
} from "./domain.js";
import type {
  IntegrationRepository,
  IntercomOAuthClient,
  NotionOAuthClient,
  SentryOAuthClient,
} from "./ports.js";

const OAUTH_SESSION_TTL_MS = 10 * 60 * 1_000;

type ServiceDependencies = {
  repository: IntegrationRepository;
  cipher?: IntegrationSecretCipher;
  intercom?: IntercomOAuthClient;
  sentry?: SentryOAuthClient;
  notion?: NotionOAuthClient;
  now?: () => Date;
};

type CallbackInput = {
  state: string;
  code?: string;
  error?: string;
  signal?: AbortSignal;
};

function statusFor(
  provider: IntegrationProvider,
  configured: boolean,
  connection: IntegrationConnectionSummary | null,
  now: Date,
): IntegrationStatus {
  const expired = Boolean(
    connection?.expiresAt && connection.expiresAt.getTime() <= now.getTime(),
  );
  const account = connection?.account;
  const accountLabel =
    account?.provider === "intercom"
      ? (account.workspace.name ?? account.admin.name ?? "Intercom workspace")
      : account?.provider === "sentry"
        ? (account.organizations[0]?.name ?? "Sentry organization")
        : account?.provider === "notion"
          ? (account.workspace.name ?? "Notion workspace")
          : null;
  const accountDomain =
    account?.provider === "intercom"
      ? (account.workspace.id ?? `${account.region.toUpperCase()} region`)
      : account?.provider === "sentry"
        ? (account.organizations[0]?.slug ?? null)
        : account?.provider === "notion"
          ? null
          : null;
  return {
    provider,
    configured,
    connected: Boolean(connection) && !expired,
    status: connection ? (expired ? "expired" : "connected") : "disconnected",
    accountLabel,
    accountDomain,
    scopes:
      connection?.grantedScopes ??
      (provider === "intercom"
        ? intercomExpectedPermissions
        : provider === "sentry"
          ? sentryScopes
          : notionReadPermissions),
    updatedAt: connection?.updatedAt.toISOString() ?? null,
  };
}

export class IntegrationService {
  private readonly now: () => Date;

  constructor(private readonly dependencies: ServiceDependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  resolveIntercomWorkspace(intercomWorkspaceId: string) {
    return this.dependencies.repository.findWorkspaceIdByIntercomWorkspaceId(
      intercomWorkspaceId,
    );
  }

  async list(actor: IntegrationActor) {
    const connections = await this.dependencies.repository.listConnections(
      actor.workspaceId,
    );
    const byProvider = new Map(
      connections.map((connection) => [connection.provider, connection]),
    );
    const now = this.now();
    return integrationProviders.map((provider) =>
      statusFor(
        provider,
        provider === "intercom"
          ? Boolean(this.dependencies.intercom && this.dependencies.cipher)
          : provider === "sentry"
            ? Boolean(this.dependencies.sentry && this.dependencies.cipher)
            : Boolean(this.dependencies.notion && this.dependencies.cipher),
        byProvider.get(provider) ?? null,
        now,
      ),
    );
  }

  async authorizeIntercom(actor: IntegrationActor, region: IntercomRegion) {
    const provider = this.requireIntercom();
    this.requireCipher();
    const state = generateOAuthState();
    const now = this.now();
    await this.dependencies.repository.createOAuthSession({
      id: randomUUID(),
      provider: "intercom",
      workspaceId: actor.workspaceId,
      initiatedBy: actor.userId,
      stateHash: hashOAuthState(state),
      region,
      encryptedPkceVerifier: null,
      expiresAt: new Date(now.getTime() + OAUTH_SESSION_TTL_MS),
    });
    return { authorizationUrl: provider.authorizationUrl(state, region) };
  }

  async authorizeSentry(actor: IntegrationActor) {
    const provider = this.requireSentry();
    const cipher = this.requireCipher();
    const state = generateOAuthState();
    const verifier = generatePkceVerifier();
    const now = this.now();
    await this.dependencies.repository.createOAuthSession({
      id: randomUUID(),
      provider: "sentry",
      workspaceId: actor.workspaceId,
      initiatedBy: actor.userId,
      stateHash: hashOAuthState(state),
      region: null,
      encryptedPkceVerifier: cipher.encrypt(
        verifier,
        secretAssociatedData(actor.workspaceId, "sentry", "pkce"),
      ),
      expiresAt: new Date(now.getTime() + OAUTH_SESSION_TTL_MS),
    });
    return {
      authorizationUrl: provider.authorizationUrl(
        state,
        createPkceChallenge(verifier),
      ),
    };
  }

  async authorizeNotion(actor: IntegrationActor) {
    const provider = this.requireNotion();
    this.requireCipher();
    const state = generateOAuthState();
    const now = this.now();
    await this.dependencies.repository.createOAuthSession({
      id: randomUUID(),
      provider: "notion",
      workspaceId: actor.workspaceId,
      initiatedBy: actor.userId,
      stateHash: hashOAuthState(state),
      region: null,
      encryptedPkceVerifier: null,
      expiresAt: new Date(now.getTime() + OAUTH_SESSION_TTL_MS),
    });
    return { authorizationUrl: provider.authorizationUrl(state) };
  }

  async completeIntercom(input: CallbackInput) {
    const session = await this.consume("intercom", input.state);
    if (input.error) return this.authorizationDenied();
    if (!input.code || session.region === null) return this.invalidState();
    const provider = this.requireIntercom();
    const token = await provider.exchangeCode(input.code, input.signal);
    const account = await provider.validateAccount(
      token.accessToken,
      session.region,
      input.signal,
    );
    return this.persistConnection(session, token, account);
  }

  async completeSentry(input: CallbackInput) {
    const session = await this.consume("sentry", input.state);
    if (input.error) return this.authorizationDenied();
    if (!input.code || !session.encryptedPkceVerifier) {
      return this.invalidState();
    }
    const provider = this.requireSentry();
    const cipher = this.requireCipher();
    const verifier = cipher.decrypt(
      session.encryptedPkceVerifier,
      secretAssociatedData(session.workspaceId, "sentry", "pkce"),
    );
    const token = await provider.exchangeCode(
      input.code,
      verifier,
      input.signal,
    );
    const account = await provider.validateAccount(
      token.accessToken,
      input.signal,
    );
    return this.persistConnection(session, token, account);
  }

  async completeNotion(input: CallbackInput) {
    const session = await this.consume("notion", input.state);
    if (input.error) return this.authorizationDenied();
    if (!input.code) return this.invalidState();
    const provider = this.requireNotion();
    const token = await provider.exchangeCode(input.code, input.signal);
    const account = await provider.validateAccount(
      token.accessToken,
      input.signal,
    );
    return this.persistConnection(session, token, account);
  }

  async delete(actor: IntegrationActor, provider: IntegrationProvider) {
    const connection = await this.dependencies.repository.getConnection(
      actor.workspaceId,
      provider,
    );
    if (
      provider === "intercom" &&
      connection?.account.provider === "intercom" &&
      this.dependencies.intercom &&
      this.dependencies.cipher
    ) {
      const token = this.dependencies.cipher.decrypt(
        connection.encryptedAccessToken,
        secretAssociatedData(actor.workspaceId, "intercom", "access"),
      );
      await this.dependencies.intercom.uninstall(
        token,
        connection.account.region,
      );
    }
    if (
      provider === "notion" &&
      connection?.account.provider === "notion" &&
      this.dependencies.notion &&
      this.dependencies.cipher
    ) {
      const token = this.dependencies.cipher.decrypt(
        connection.encryptedAccessToken,
        secretAssociatedData(actor.workspaceId, "notion", "access"),
      );
      await this.dependencies.notion.revoke(token);
    }
    return this.dependencies.repository.deleteConnection(
      actor.workspaceId,
      provider,
    );
  }

  private async consume(provider: IntegrationProvider, state: string) {
    const session = await this.dependencies.repository.consumeOAuthSession(
      provider,
      hashOAuthState(state),
      this.now(),
    );
    if (!session) return this.invalidState();
    return session;
  }

  private async persistConnection(
    session: Awaited<ReturnType<IntegrationService["consume"]>>,
    token: ProviderToken,
    account: StoredIntegrationConnection["account"],
  ) {
    const cipher = this.requireCipher();
    const now = this.now();
    const connection: StoredIntegrationConnection = {
      id: randomUUID(),
      workspaceId: session.workspaceId,
      provider: session.provider,
      encryptedAccessToken: cipher.encrypt(
        token.accessToken,
        secretAssociatedData(session.workspaceId, session.provider, "access"),
      ),
      encryptedRefreshToken: token.refreshToken
        ? cipher.encrypt(
            token.refreshToken,
            secretAssociatedData(
              session.workspaceId,
              session.provider,
              "refresh",
            ),
          )
        : null,
      tokenType: token.tokenType,
      grantedScopes: token.grantedScopes,
      account,
      expiresAt: token.expiresAt,
      connectedBy: session.initiatedBy,
      connectedAt: now,
      updatedAt: now,
    };
    return this.dependencies.repository.upsertConnection(connection);
  }

  private requireCipher() {
    if (!this.dependencies.cipher) return this.notConfigured();
    return this.dependencies.cipher;
  }

  private requireIntercom() {
    if (!this.dependencies.intercom) return this.notConfigured();
    return this.dependencies.intercom;
  }

  private requireSentry() {
    if (!this.dependencies.sentry) return this.notConfigured();
    return this.dependencies.sentry;
  }

  private requireNotion() {
    if (!this.dependencies.notion) return this.notConfigured();
    return this.dependencies.notion;
  }

  private notConfigured(): never {
    throw new IntegrationFlowError(
      "not_configured",
      "This integration provider is not configured.",
    );
  }

  private invalidState(): never {
    throw new IntegrationFlowError(
      "invalid_state",
      "The OAuth session is invalid, expired, or already used.",
    );
  }

  private authorizationDenied(): never {
    throw new IntegrationFlowError(
      "authorization_denied",
      "Authorization was not completed.",
    );
  }
}
