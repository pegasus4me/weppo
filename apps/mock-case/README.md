# Northstar Cloud incident fixture

This isolated Next.js application behaves like a small customer SaaS product.
It creates a realistic support investigation trail without exposing test tools
or technical identifiers to the fictional customer.

The customer journey is intentionally natural:

1. Maya Chen uses a normal account feature.
2. The feature fails and shows a customer-safe error.
3. Sentry records the server exception silently with Maya’s user context.
4. Maya opens the Intercom Messenger and describes the problem in her own words.
5. A support engineer uses Weppo to correlate the ticket with nearby Sentry
   events using identity, time, feature, account, and environment signals.

There is no automatic Intercom conversation, pre-filled technical report,
visible Sentry event ID, or synthetic correlation ID. Those shortcuts would not
exist in a real customer incident.

## Configure

```bash
cp apps/mock-case/.env.example apps/mock-case/.env.local
```

Fill in `apps/mock-case/.env.local`:

- `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN`: the DSN from the dedicated Sentry
  Next.js project.
- `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`: optional build-time
  settings for source map upload.
- `NEXT_PUBLIC_INTERCOM_APP_ID`: the public workspace ID used by Messenger.
- `INTERCOM_REGION`: `us`, `eu`, or `au`, matching the Intercom workspace.
- `INTERCOM_TEST_USER_*`: the fictional customer identity shared by Sentry and
  Intercom.

Use dedicated test Sentry and Intercom workspaces. Add `127.0.0.1` to the
Messenger trusted domains for local testing.

## Run

From the repository root:

```bash
pnpm --filter mock-case dev
```

Open <http://127.0.0.1:3100>. Use a normal product action, observe the customer
error, then open Messenger and describe what happened without copying technical
details.

## Expected Weppo investigation

Connect the same Intercom test workspace and Sentry organization in Weppo. An
investigation should begin from the customer’s Intercom conversation and search
Sentry using the customer email, account, failure time, affected feature, and
deployment environment. The customer should never have to provide an internal
event ID.

Weppo’s provider read clients still need to be connected to the investigation
runner for that lookup to happen automatically. Until then, the two external
records are realistic, but the final cross-provider retrieval remains a product
implementation task.
