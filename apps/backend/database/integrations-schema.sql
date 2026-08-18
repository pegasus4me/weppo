create table if not exists "integration_oauth_session" (
  "id" text primary key,
  "provider" text not null check ("provider" in ('intercom', 'sentry', 'notion')),
  "workspaceId" text not null,
  "initiatedBy" text not null,
  "stateHash" bytea not null unique,
  "region" text check ("region" is null or "region" in ('us', 'eu', 'au')),
  "encryptedPkceVerifier" text,
  "expiresAt" timestamptz not null,
  "consumedAt" timestamptz,
  "createdAt" timestamptz default current_timestamp not null
);

create index if not exists "integration_oauth_session_expiry_idx"
  on "integration_oauth_session" ("expiresAt")
  where "consumedAt" is null;

create table if not exists "integration_connection" (
  "id" text primary key,
  "workspaceId" text not null,
  "provider" text not null check ("provider" in ('intercom', 'sentry', 'notion')),
  "encryptedAccessToken" text not null,
  "encryptedRefreshToken" text,
  "tokenType" text not null,
  "grantedScopes" jsonb not null default '[]'::jsonb,
  "account" jsonb not null,
  "expiresAt" timestamptz,
  "connectedBy" text not null,
  "connectedAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null,
  unique ("workspaceId", "provider")
);

create index if not exists "integration_connection_workspace_idx"
  on "integration_connection" ("workspaceId");

alter table "integration_oauth_session"
  drop constraint if exists "integration_oauth_session_provider_check";
alter table "integration_oauth_session"
  add constraint "integration_oauth_session_provider_check"
  check ("provider" in ('intercom', 'sentry', 'notion'));

alter table "integration_connection"
  drop constraint if exists "integration_connection_provider_check";
alter table "integration_connection"
  add constraint "integration_connection_provider_check"
  check ("provider" in ('intercom', 'sentry', 'notion'));
