import type pg from "pg";

import type {
  ConsumedOAuthSession,
  IntegrationAccountMetadata,
  IntegrationConnectionSummary,
  IntegrationProvider,
  IntercomRegion,
  OAuthSession,
  StoredIntegrationConnection,
} from "./domain.js";
import type { IntegrationRepository } from "./ports.js";

type OAuthSessionRow = {
  id: string;
  provider: IntegrationProvider;
  workspaceId: string;
  initiatedBy: string;
  region: IntercomRegion | null;
  encryptedPkceVerifier: string | null;
  expiresAt: Date;
};

type ConnectionRow = {
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

function toSummary(row: ConnectionRow): IntegrationConnectionSummary {
  return {
    id: row.id,
    provider: row.provider,
    grantedScopes: row.grantedScopes,
    account: row.account,
    connectedAt: row.connectedAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt,
  };
}

export class PostgresIntegrationRepository implements IntegrationRepository {
  constructor(private readonly database: pg.Pool) {}

  async createOAuthSession(session: OAuthSession) {
    await this.database.query(
      `insert into "integration_oauth_session"
        ("id", "provider", "workspaceId", "initiatedBy", "stateHash", "region", "encryptedPkceVerifier", "expiresAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        session.id,
        session.provider,
        session.workspaceId,
        session.initiatedBy,
        session.stateHash,
        session.region,
        session.encryptedPkceVerifier,
        session.expiresAt,
      ],
    );
  }

  async consumeOAuthSession(
    provider: IntegrationProvider,
    stateHash: Buffer,
    consumedAt: Date,
  ): Promise<ConsumedOAuthSession | null> {
    const result = await this.database.query<OAuthSessionRow>(
      `update "integration_oauth_session"
          set "consumedAt" = $3
        where "provider" = $1
          and "stateHash" = $2
          and "consumedAt" is null
          and "expiresAt" > $3
      returning "id", "provider", "workspaceId", "initiatedBy", "region", "encryptedPkceVerifier", "expiresAt"`,
      [provider, stateHash, consumedAt],
    );
    return result.rows[0] ?? null;
  }

  async listConnections(workspaceId: string) {
    const result = await this.database.query<ConnectionRow>(
      `select "id", "workspaceId", "provider", "tokenType", "grantedScopes", "account",
              "connectedBy", "connectedAt", "updatedAt",
              '' as "encryptedAccessToken", null as "encryptedRefreshToken", "expiresAt"
         from "integration_connection"
        where "workspaceId" = $1
        order by "provider" asc`,
      [workspaceId],
    );
    return result.rows.map(toSummary);
  }

  async getConnection(workspaceId: string, provider: IntegrationProvider) {
    const result = await this.database.query<ConnectionRow>(
      `select "id", "workspaceId", "provider", "encryptedAccessToken", "encryptedRefreshToken",
              "tokenType", "grantedScopes", "account", "expiresAt", "connectedBy",
              "connectedAt", "updatedAt"
         from "integration_connection"
        where "workspaceId" = $1 and "provider" = $2`,
      [workspaceId, provider],
    );
    return result.rows[0] ?? null;
  }

  async findWorkspaceIdByIntercomWorkspaceId(intercomWorkspaceId: string) {
    const result = await this.database.query<{ workspaceId: string }>(
      `select "workspaceId"
         from "integration_connection"
        where "provider" = 'intercom'
          and "account"->'workspace'->>'id' = $1
        limit 2`,
      [intercomWorkspaceId],
    );
    if (result.rows.length !== 1) return null;
    return result.rows[0]?.workspaceId ?? null;
  }

  async upsertConnection(connection: StoredIntegrationConnection) {
    const result = await this.database.query<ConnectionRow>(
      `insert into "integration_connection"
        ("id", "workspaceId", "provider", "encryptedAccessToken", "encryptedRefreshToken",
         "tokenType", "grantedScopes", "account", "expiresAt", "connectedBy", "connectedAt", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12)
       on conflict ("workspaceId", "provider") do update set
         "encryptedAccessToken" = excluded."encryptedAccessToken",
         "encryptedRefreshToken" = excluded."encryptedRefreshToken",
         "tokenType" = excluded."tokenType",
         "grantedScopes" = excluded."grantedScopes",
         "account" = excluded."account",
         "expiresAt" = excluded."expiresAt",
         "connectedBy" = excluded."connectedBy",
         "updatedAt" = excluded."updatedAt"
       returning "id", "workspaceId", "provider", "tokenType", "grantedScopes", "account",
                 "connectedBy", "connectedAt", "updatedAt",
                 '' as "encryptedAccessToken", null as "encryptedRefreshToken", "expiresAt"`,
      [
        connection.id,
        connection.workspaceId,
        connection.provider,
        connection.encryptedAccessToken,
        connection.encryptedRefreshToken,
        connection.tokenType,
        JSON.stringify(connection.grantedScopes),
        JSON.stringify(connection.account),
        connection.expiresAt,
        connection.connectedBy,
        connection.connectedAt,
        connection.updatedAt,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Integration connection was not persisted.");
    return toSummary(row);
  }

  async deleteConnection(workspaceId: string, provider: IntegrationProvider) {
    const result = await this.database.query(
      `delete from "integration_connection"
        where "workspaceId" = $1 and "provider" = $2`,
      [workspaceId, provider],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
