import type {
  ConsumedOAuthSession,
  IntegrationConnectionSummary,
  IntegrationProvider,
  IntercomAccountMetadata,
  IntercomRegion,
  NotionAccountMetadata,
  OAuthSession,
  ProviderToken,
  SentryAccountMetadata,
  StoredIntegrationConnection,
} from "./domain.js";

export interface IntegrationRepository {
  createOAuthSession(session: OAuthSession): Promise<void>;
  consumeOAuthSession(
    provider: IntegrationProvider,
    stateHash: Buffer,
    consumedAt: Date,
  ): Promise<ConsumedOAuthSession | null>;
  listConnections(workspaceId: string): Promise<IntegrationConnectionSummary[]>;
  getConnection(
    workspaceId: string,
    provider: IntegrationProvider,
  ): Promise<StoredIntegrationConnection | null>;
  findWorkspaceIdByIntercomWorkspaceId(
    intercomWorkspaceId: string,
  ): Promise<string | null>;
  upsertConnection(
    connection: StoredIntegrationConnection,
  ): Promise<IntegrationConnectionSummary>;
  deleteConnection(
    workspaceId: string,
    provider: IntegrationProvider,
  ): Promise<boolean>;
}

export interface IntercomOAuthClient {
  authorizationUrl(state: string, region: IntercomRegion): string;
  exchangeCode(code: string, signal?: AbortSignal): Promise<ProviderToken>;
  validateAccount(
    accessToken: string,
    region: IntercomRegion,
    signal?: AbortSignal,
  ): Promise<IntercomAccountMetadata>;
  uninstall(
    accessToken: string,
    region: IntercomRegion,
    signal?: AbortSignal,
  ): Promise<void>;
}

export interface SentryOAuthClient {
  authorizationUrl(state: string, codeChallenge: string): string;
  exchangeCode(
    code: string,
    codeVerifier: string,
    signal?: AbortSignal,
  ): Promise<ProviderToken>;
  validateAccount(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<SentryAccountMetadata>;
}

export interface NotionOAuthClient {
  authorizationUrl(state: string): string;
  exchangeCode(code: string, signal?: AbortSignal): Promise<ProviderToken>;
  validateAccount(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<NotionAccountMetadata>;
  revoke(accessToken: string, signal?: AbortSignal): Promise<void>;
}

export interface IntercomReadClient {
  getConversation(
    workspaceId: string,
    conversationId: string,
    signal?: AbortSignal,
  ): Promise<unknown>;
  getTicket(
    workspaceId: string,
    ticketId: string,
    signal?: AbortSignal,
  ): Promise<unknown>;
  getContact(
    workspaceId: string,
    contactId: string,
    signal?: AbortSignal,
  ): Promise<unknown>;
}

export interface SentryReadClient {
  searchErrorEvents(
    workspaceId: string,
    input: { query: string; start: string; end: string; limit?: number },
    signal?: AbortSignal,
  ): Promise<Array<{ organizationSlug: string; data: unknown[] }>>;
  getIssue(
    workspaceId: string,
    organizationSlug: string,
    issueId: string,
    signal?: AbortSignal,
  ): Promise<unknown>;
  getIssueEvent(
    workspaceId: string,
    organizationSlug: string,
    issueId: string,
    eventId?: string,
    signal?: AbortSignal,
  ): Promise<unknown>;
}

export interface NotionReadClient {
  searchPages(
    workspaceId: string,
    query?: string,
    signal?: AbortSignal,
  ): Promise<unknown>;
  getPageMarkdown(
    workspaceId: string,
    pageId: string,
    signal?: AbortSignal,
  ): Promise<unknown>;
}

export type IntegrationReadClients = {
  intercom: IntercomReadClient;
  sentry: SentryReadClient;
  notion: NotionReadClient;
};
