export const integrationProviders = ["intercom", "sentry", "notion"] as const;
export type IntegrationProvider = (typeof integrationProviders)[number];

export const intercomRegions = ["us", "eu", "au"] as const;
export type IntercomRegion = (typeof intercomRegions)[number];

export const intercomExpectedPermissions = [
  "Read conversations",
  "Read tickets",
  "Read and list users and companies",
] as const;

export const sentryScopes = ["org:read", "project:read", "event:read"] as const;

export const notionReadPermissions = [
  "Search pages shared with Weppo",
  "Read page properties",
  "Retrieve page content as Markdown",
] as const;

export type IntegrationActor = {
  userId: string;
  workspaceId: string;
};

export type IntercomAccountMetadata = {
  provider: "intercom";
  region: IntercomRegion;
  admin: { id: string | null; name: string | null };
  workspace: { id: string | null; name: string | null };
};

export type SentryOrganizationMetadata = {
  id: string;
  slug: string;
  name: string;
  apiBaseUrl: string;
};

export type SentryAccountMetadata = {
  provider: "sentry";
  organizations: SentryOrganizationMetadata[];
};

export type NotionAccountMetadata = {
  provider: "notion";
  botId: string;
  workspace: {
    id: string;
    name: string | null;
    icon: string | null;
  };
};

export type IntegrationAccountMetadata =
  | IntercomAccountMetadata
  | SentryAccountMetadata
  | NotionAccountMetadata;

export type OAuthSession = {
  id: string;
  provider: IntegrationProvider;
  workspaceId: string;
  initiatedBy: string;
  stateHash: Buffer;
  region: IntercomRegion | null;
  encryptedPkceVerifier: string | null;
  expiresAt: Date;
};

export type ConsumedOAuthSession = Omit<OAuthSession, "stateHash">;

export type StoredIntegrationConnection = {
  id: string;
  workspaceId: string;
  provider: IntegrationProvider;
  encryptedAccessToken: string;
  encryptedRefreshToken: string | null;
  tokenType: string;
  grantedScopes: string[];
  account: IntegrationAccountMetadata;
  expiresAt: Date | null;
  connectedBy: string;
  connectedAt: Date;
  updatedAt: Date;
};

export type IntegrationConnectionSummary = Pick<
  StoredIntegrationConnection,
  | "id"
  | "provider"
  | "account"
  | "grantedScopes"
  | "connectedAt"
  | "updatedAt"
  | "expiresAt"
>;

export type IntegrationStatus = {
  provider: IntegrationProvider;
  configured: boolean;
  connected: boolean;
  status: "connected" | "disconnected" | "expired";
  accountLabel: string | null;
  accountDomain: string | null;
  scopes: readonly string[];
  updatedAt: string | null;
};

export type ProviderToken = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  grantedScopes: string[];
  expiresAt: Date | null;
};

export type ProviderUnavailableReason =
  | "not_configured"
  | "invalid_state"
  | "authorization_denied"
  | "provider_rejected"
  | "invalid_grant";

export class IntegrationFlowError extends Error {
  constructor(
    readonly reason: ProviderUnavailableReason,
    message: string,
  ) {
    super(message);
    this.name = "IntegrationFlowError";
  }
}
