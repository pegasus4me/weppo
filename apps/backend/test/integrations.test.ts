import assert from "node:assert/strict";
import { test } from "node:test";

import Fastify from "fastify";

import type { Auth } from "../src/lib/auth.js";
import {
  createPkceChallenge,
  IntegrationSecretCipher,
} from "../src/modules/integrations/crypto.js";
import type {
  ConsumedOAuthSession,
  IntegrationConnectionSummary,
  IntegrationProvider,
  OAuthSession,
  StoredIntegrationConnection,
} from "../src/modules/integrations/domain.js";
import { IntegrationFlowError } from "../src/modules/integrations/domain.js";
import type {
  IntegrationRepository,
  IntercomOAuthClient,
  NotionOAuthClient,
  SentryOAuthClient,
} from "../src/modules/integrations/ports.js";
import { integrationRoutes } from "../src/modules/integrations/routes.js";
import { IntegrationService } from "../src/modules/integrations/service.js";

const actor = { userId: "user-1", workspaceId: "workspace-1" };
const encryptionKey = Buffer.alloc(32, 9).toString("base64");

class MemoryIntegrationRepository implements IntegrationRepository {
  readonly sessions: Array<OAuthSession & { consumed: boolean }> = [];
  readonly connections = new Map<string, StoredIntegrationConnection>();

  async createOAuthSession(session: OAuthSession) {
    this.sessions.push({
      ...structuredClone(session),
      stateHash: Buffer.from(session.stateHash),
      consumed: false,
    });
  }

  async consumeOAuthSession(
    provider: IntegrationProvider,
    stateHash: Buffer,
    consumedAt: Date,
  ): Promise<ConsumedOAuthSession | null> {
    const session = this.sessions.find(
      (candidate) =>
        candidate.provider === provider &&
        !candidate.consumed &&
        candidate.expiresAt > consumedAt &&
        candidate.stateHash.equals(stateHash),
    );
    if (!session) return null;
    session.consumed = true;
    return {
      id: session.id,
      provider: session.provider,
      workspaceId: session.workspaceId,
      initiatedBy: session.initiatedBy,
      region: session.region,
      encryptedPkceVerifier: session.encryptedPkceVerifier,
      expiresAt: session.expiresAt,
    };
  }

  async listConnections(workspaceId: string) {
    return [...this.connections.values()]
      .filter((connection) => connection.workspaceId === workspaceId)
      .map(
        (connection): IntegrationConnectionSummary => ({
          id: connection.id,
          provider: connection.provider,
          account: structuredClone(connection.account),
          grantedScopes: [...connection.grantedScopes],
          expiresAt: connection.expiresAt,
          connectedAt: connection.connectedAt,
          updatedAt: connection.updatedAt,
        }),
      );
  }

  async getConnection(workspaceId: string, provider: IntegrationProvider) {
    const connection = this.connections.get(`${workspaceId}:${provider}`);
    return connection ? structuredClone(connection) : null;
  }

  async findWorkspaceIdByIntercomWorkspaceId(intercomWorkspaceId: string) {
    const matches = [...this.connections.values()].filter(
      (connection) =>
        connection.account.provider === "intercom" &&
        connection.account.workspace.id === intercomWorkspaceId,
    );
    return matches.length === 1 ? (matches[0]?.workspaceId ?? null) : null;
  }

  async upsertConnection(connection: StoredIntegrationConnection) {
    this.connections.set(
      `${connection.workspaceId}:${connection.provider}`,
      structuredClone(connection),
    );
    return (await this.listConnections(connection.workspaceId)).find(
      (candidate) => candidate.provider === connection.provider,
    )!;
  }

  async deleteConnection(workspaceId: string, provider: IntegrationProvider) {
    return this.connections.delete(`${workspaceId}:${provider}`);
  }
}

class FakeIntercom implements IntercomOAuthClient {
  authorizationState = "";
  exchangedCode = "";
  uninstalledToken = "";

  authorizationUrl(state: string, region: "us" | "eu" | "au") {
    this.authorizationState = state;
    return `https://app.${region}.intercom.test/oauth?state=${state}`;
  }

  async exchangeCode(code: string) {
    this.exchangedCode = code;
    return {
      accessToken: "intercom-access-secret",
      refreshToken: null,
      tokenType: "Bearer",
      grantedScopes: ["Read conversations"],
      expiresAt: null,
    };
  }

  async validateAccount(_accessToken: string, region: "us" | "eu" | "au") {
    return {
      provider: "intercom" as const,
      region,
      admin: { id: "admin-private-id", name: "Support admin" },
      workspace: { id: "workspace-domain", name: "Acme support" },
    };
  }

  async uninstall(accessToken: string) {
    this.uninstalledToken = accessToken;
  }
}

class FakeSentry implements SentryOAuthClient {
  authorizationState = "";
  codeChallenge = "";
  codeVerifier = "";

  authorizationUrl(state: string, codeChallenge: string) {
    this.authorizationState = state;
    this.codeChallenge = codeChallenge;
    return `https://sentry.io/oauth/authorize/?state=${state}`;
  }

  async exchangeCode(_code: string, codeVerifier: string) {
    this.codeVerifier = codeVerifier;
    return {
      accessToken: "sentry-access-secret",
      refreshToken: "sentry-refresh-secret",
      tokenType: "Bearer",
      grantedScopes: ["org:read", "project:read", "event:read"],
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    };
  }

  async validateAccount() {
    return {
      provider: "sentry" as const,
      organizations: [
        {
          id: "org-private-id",
          slug: "acme",
          name: "Acme",
          apiBaseUrl: "https://us.sentry.io",
        },
      ],
    };
  }
}

class FakeNotion implements NotionOAuthClient {
  authorizationState = "";
  exchangedCode = "";
  revokedToken = "";

  authorizationUrl(state: string) {
    this.authorizationState = state;
    return `https://api.notion.com/v1/oauth/authorize?state=${state}`;
  }

  async exchangeCode(code: string) {
    this.exchangedCode = code;
    return {
      accessToken: "notion-access-secret",
      refreshToken: "notion-refresh-secret",
      tokenType: "bearer",
      grantedScopes: ["Search pages shared with Weppo"],
      expiresAt: null,
    };
  }

  async validateAccount() {
    return {
      provider: "notion" as const,
      botId: "notion-bot-private-id",
      workspace: {
        id: "notion-workspace-private-id",
        name: "Acme knowledge",
        icon: null,
      },
    };
  }

  async revoke(accessToken: string) {
    this.revokedToken = accessToken;
  }
}

function authFor(testActor: typeof actor): Auth {
  return {
    api: {
      getSession: async () => ({
        user: { id: testActor.userId },
        session: { activeOrganizationId: testActor.workspaceId },
      }),
    },
  } as unknown as Auth;
}

test("list returns flat safe DTOs when providers are not configured", async () => {
  const service = new IntegrationService({
    repository: new MemoryIntegrationRepository(),
  });

  assert.deepEqual(await service.list(actor), [
    {
      provider: "intercom",
      configured: false,
      connected: false,
      status: "disconnected",
      accountLabel: null,
      accountDomain: null,
      scopes: [
        "Read conversations",
        "Read tickets",
        "Read and list users and companies",
      ],
      updatedAt: null,
    },
    {
      provider: "sentry",
      configured: false,
      connected: false,
      status: "disconnected",
      accountLabel: null,
      accountDomain: null,
      scopes: ["org:read", "project:read", "event:read"],
      updatedAt: null,
    },
    {
      provider: "notion",
      configured: false,
      connected: false,
      status: "disconnected",
      accountLabel: null,
      accountDomain: null,
      scopes: [
        "Search pages shared with Weppo",
        "Read page properties",
        "Retrieve page content as Markdown",
      ],
      updatedAt: null,
    },
  ]);
});

test("Sentry OAuth uses encrypted PKCE and consumes state exactly once", async () => {
  const repository = new MemoryIntegrationRepository();
  const cipher = new IntegrationSecretCipher(encryptionKey);
  const sentry = new FakeSentry();
  const service = new IntegrationService({ repository, cipher, sentry });

  await service.authorizeSentry(actor);
  const session = repository.sessions[0];
  assert.ok(session);
  assert.equal(session.provider, "sentry");
  assert.ok(session.encryptedPkceVerifier);
  assert.equal(
    session.encryptedPkceVerifier.includes(sentry.codeChallenge),
    false,
  );

  const summary = await service.completeSentry({
    state: sentry.authorizationState,
    code: "authorization-code-with-trailing=",
  });
  assert.equal(sentry.codeChallenge, createPkceChallenge(sentry.codeVerifier));
  assert.equal(summary.provider, "sentry");

  const stored = repository.connections.get("workspace-1:sentry");
  assert.ok(stored);
  assert.equal(
    stored.encryptedAccessToken.includes("sentry-access-secret"),
    false,
  );
  assert.equal(
    stored.encryptedRefreshToken?.includes("sentry-refresh-secret"),
    false,
  );
  assert.equal(
    JSON.stringify(await service.list(actor)).includes("sentry-access-secret"),
    false,
  );

  await assert.rejects(
    service.completeSentry({
      state: sentry.authorizationState,
      code: "replayed-code",
    }),
    (error: unknown) =>
      error instanceof IntegrationFlowError && error.reason === "invalid_state",
  );
});

test("Intercom disconnect revokes the token before tenant-scoped deletion", async () => {
  const repository = new MemoryIntegrationRepository();
  const cipher = new IntegrationSecretCipher(encryptionKey);
  const intercom = new FakeIntercom();
  const service = new IntegrationService({ repository, cipher, intercom });

  await service.authorizeIntercom(actor, "eu");
  await service.completeIntercom({
    state: intercom.authorizationState,
    code: "intercom-code",
  });
  assert.equal((await service.list(actor))[0]?.accountLabel, "Acme support");

  await service.delete(actor, "intercom");
  assert.equal(intercom.uninstalledToken, "intercom-access-secret");
  assert.equal(repository.connections.size, 0);
});

test("integration routes return 503 when unconfigured and safe callback redirects", async () => {
  const service = new IntegrationService({
    repository: new MemoryIntegrationRepository(),
  });
  const app = Fastify({ logger: false });
  await app.register(integrationRoutes, {
    auth: authFor(actor),
    service,
    webOrigin: "https://app.weppo.test",
  });

  const unavailable = await app.inject({
    method: "POST",
    url: "/api/v1/integrations/sentry/authorize",
  });
  assert.equal(unavailable.statusCode, 503);
  assert.equal(unavailable.json().error.code, "INTEGRATION_NOT_CONFIGURED");

  const callback = await app.inject({
    method: "GET",
    url: "/api/v1/integrations/sentry/callback?code=private-code&state=short",
  });
  assert.equal(callback.statusCode, 303);
  const location = new URL(callback.headers.location!);
  assert.equal(location.origin, "https://app.weppo.test");
  assert.equal(location.searchParams.get("integration_error"), "invalid_state");
  assert.equal(location.searchParams.get("provider"), "sentry");
  assert.equal(location.toString().includes("private-code"), false);
  assert.equal(location.toString().includes("state=short"), false);

  await app.close();
});

test("OAuth callbacks persist the connection and redirect without sensitive query data", async () => {
  const repository = new MemoryIntegrationRepository();
  const intercom = new FakeIntercom();
  const service = new IntegrationService({
    repository,
    intercom,
    cipher: new IntegrationSecretCipher(encryptionKey),
  });
  const app = Fastify({ logger: false });
  await app.register(integrationRoutes, {
    auth: authFor(actor),
    service,
    webOrigin: "https://app.weppo.test",
  });

  const authorize = await app.inject({
    method: "POST",
    url: "/api/v1/integrations/intercom/authorize",
    payload: { region: "eu" },
  });
  assert.equal(authorize.statusCode, 201);

  const callback = await app.inject({
    method: "GET",
    url: `/api/v1/integrations/intercom/callback?code=private-code%3D&state=${intercom.authorizationState}`,
  });
  assert.equal(callback.statusCode, 303);
  const location = new URL(callback.headers.location!);
  assert.equal(location.searchParams.get("connected"), "intercom");
  assert.equal(location.searchParams.has("integration_error"), false);
  assert.equal(location.toString().includes("private-code"), false);
  assert.equal(
    location.toString().includes(intercom.authorizationState),
    false,
  );
  assert.equal(intercom.exchangedCode, "private-code=");

  const list = await app.inject({
    method: "GET",
    url: "/api/v1/integrations",
  });
  assert.equal(list.statusCode, 200);
  const row = list.json().integrations[0];
  assert.deepEqual(row, {
    provider: "intercom",
    configured: true,
    connected: true,
    status: "connected",
    accountLabel: "Acme support",
    accountDomain: "workspace-domain",
    scopes: ["Read conversations"],
    updatedAt: row.updatedAt,
  });
  assert.equal(typeof row.updatedAt, "string");
  assert.equal(JSON.stringify(row).includes("private-id"), false);
  assert.equal(JSON.stringify(row).includes("access-secret"), false);

  await app.close();
});

test("Notion OAuth stores encrypted tokens and revokes them on disconnect", async () => {
  const repository = new MemoryIntegrationRepository();
  const notion = new FakeNotion();
  const service = new IntegrationService({
    repository,
    notion,
    cipher: new IntegrationSecretCipher(encryptionKey),
  });

  await service.authorizeNotion(actor);
  const session = repository.sessions[0];
  assert.ok(session);
  assert.equal(session.provider, "notion");
  assert.equal(session.encryptedPkceVerifier, null);

  const summary = await service.completeNotion({
    state: notion.authorizationState,
    code: "notion-private-code",
  });
  assert.equal(summary.provider, "notion");
  assert.equal(notion.exchangedCode, "notion-private-code");

  const stored = repository.connections.get("workspace-1:notion");
  assert.ok(stored);
  assert.equal(
    stored.encryptedAccessToken.includes("notion-access-secret"),
    false,
  );
  assert.equal(
    stored.encryptedRefreshToken?.includes("notion-refresh-secret"),
    false,
  );
  const status = (await service.list(actor))[2];
  assert.equal(status?.connected, true);
  assert.equal(status?.accountLabel, "Acme knowledge");
  assert.equal(JSON.stringify(status).includes("private-id"), false);

  await service.delete(actor, "notion");
  assert.equal(notion.revokedToken, "notion-access-secret");
  assert.equal(repository.connections.size, 0);
});
