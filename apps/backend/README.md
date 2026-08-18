# Weppo backend

Product-independent backend foundations for the Weppo application.

## Technical baseline

- Node.js + TypeScript
- Fastify HTTP API
- PostgreSQL
- Better Auth for email/password sessions, users, organizations, invitations,
  and the base `owner` / `admin` / `member` roles
- Structured logs, request IDs, health checks, Prometheus metrics, rate limits,
  CORS, and secure HTTP headers

The first support-domain vertical slice models an investigation as a case,
an agent run, an append-only activity stream, evidence, missing information,
and the engineering-ready draft. The current adapter is intentionally in-memory
and the runner is deterministic: both sit behind interfaces so product behavior
can be validated before selecting durable queue and storage implementations.

## Local setup

From the repository root:

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env
pnpm infra:up
pnpm --filter backend auth:migrate
pnpm --filter backend integrations:migrate
pnpm --filter backend dev
```

The API listens on `http://localhost:4000`.

## Initial endpoints

- `GET /api/v1` — API identity
- `GET /health/live` — process health
- `GET /health/ready` — database readiness
- `GET /metrics` — Prometheus metrics
- `GET|POST /api/auth/*` — Better Auth endpoints
- `GET /api/v1/users/me` — current authenticated user and session
- `GET /api/v1/investigations` — workspace-scoped cases
- `POST /api/v1/investigations` — create a case and start its run
- `GET /api/v1/investigations/:caseId` — reconstructed case snapshot
- `POST /api/v1/investigations/:caseId/runs` — start another run
- `GET /api/v1/investigations/:caseId/events` — replay public agent activity
- `GET /api/v1/investigations/:caseId/events/stream` — live SSE activity
- `POST /api/v1/intercom/inbox/initialize` — signed Intercom Inbox Canvas
- `POST /api/v1/intercom/inbox/submit` — start from an Intercom conversation

Better Auth's organization plugin supplies tenant membership, invitations, and
base permissions. Invitation delivery intentionally remains unconfigured until
an email provider is selected.

### Google OAuth

Create a Google OAuth web client, then set `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` in `apps/backend/.env`. For local development, register
this exact authorized redirect URI in Google Cloud:

```text
http://localhost:4000/api/auth/callback/google
```

Google OAuth remains disabled when both variables are empty. If one is set, the
other is required.

## Boundaries

```text
src/
├── config/       validated runtime configuration
├── lib/          database and authentication foundations
├── modules/      HTTP modules grouped by capability
├── plugins/      cross-cutting Fastify behavior
├── app.ts        application composition
└── server.ts     process lifecycle
```

Add a new business capability under `src/modules/<capability>` and keep its
routes, service logic, and persistence code together.

## OAuth integrations

Intercom, Sentry, and Notion are optional. Configure only the provider
credentials that are available, plus a base64-encoded 32-byte
`INTEGRATION_ENCRYPTION_KEY`.
Intercom requires an HTTPS callback origin, so local OAuth development should
set `INTEGRATION_CALLBACK_BASE_URL` to an HTTPS tunnel rather than localhost.
Apply `database/integrations-schema.sql` with `pnpm --filter backend
integrations:migrate` before using the integration routes.

Intercom access is expected to be configured as read-only in Developer Hub:
Read conversations, Read tickets, Read and list users and companies, and Read
admins. Sentry requests exactly `org:read project:read event:read` and uses PKCE
S256. Configure the Notion public integration with the **Read content**
capability and register this exact callback URL:

```text
${INTEGRATION_CALLBACK_BASE_URL}/api/v1/integrations/notion/callback
```

### Intercom Inbox App

When Intercom OAuth is configured, Weppo exposes a minimal Canvas Kit app for
teammates. In Intercom Developer Hub, open **Configure → Canvas Kit → For
teammates**, enable **Add to conversation details**, and configure:

```text
Initialize URL: ${INTEGRATION_CALLBACK_BASE_URL}/api/v1/intercom/inbox/initialize
Submit URL:     ${INTEGRATION_CALLBACK_BASE_URL}/api/v1/intercom/inbox/submit
```

Both URLs must be public HTTPS endpoints. Weppo verifies every request with the
Intercom `X-Body-Signature`, maps the Intercom workspace to its existing Weppo
OAuth connection, and creates at most one investigation per conversation.

The investigation reads the full conversation through the existing read-only
Intercom client. It then searches connected Sentry organizations for error
events matching the contact email within a bounded window around the first
conversation message. No provider record is modified and no customer reply is
sent automatically.

For the local test setup, the same HTTPS tunnel used for OAuth callbacks can be
reused. Point it at the allowlisted callback proxy on `127.0.0.1:4040`; the
proxy accepts the two OAuth callback routes and the two Canvas POST routes, and
forwards them to the backend on `127.0.0.1:4000` without exposing other API
paths.

Notion users choose which pages to share during OAuth. Weppo's read client can
search those shared pages and retrieve their content as Markdown; it cannot
read pages that were not shared with the connection. Access and refresh tokens
are encrypted with AES-256-GCM and are never returned by the API. OAuth state
is stored only as a one-time SHA-256 hash.

Disconnecting Intercom calls its fixed `/auth/uninstall` endpoint before local
deletion. Sentry does not document an OAuth revocation endpoint; disconnecting
Sentry removes the encrypted local credential, and users who require immediate
provider-side invalidation should revoke the installation in Sentry. Expired
Sentry credentials are treated as requiring reauthorization rather than being
used silently. Disconnecting Notion revokes its OAuth token before removing the
local credential.

The investigations module currently uses these replaceable boundaries:

```text
HTTP routes → InvestigationService → InvestigationRepository
                              ├────→ InvestigationRunner
                              └────→ AgentEventSubscription
```

Only sanitized public activity is emitted to clients. Internal model reasoning,
raw prompts, tokens, secrets, and unrestricted connector payloads do not belong
in the agent event contract.
