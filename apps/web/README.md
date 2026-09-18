# Weppo web

Next.js application on http://localhost:3000.

Retained: sign-in/sign-up, the Better Auth organization client, a session-gated workspace, account details, theme switching, and optional PostHog analytics. The homepage follows the root README. The workspace is a temporary empty state; trace import, replay, and regression suites are not implemented yet.

Run `pnpm dev` from the repository root. Set `NEXT_PUBLIC_API_URL` if the
backend is not at http://localhost:4000.

Useful package commands:

```sh
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web build
```

The previous support dashboard and its investigation, integration, knowledge, and ticket views have been removed ahead of the UI redesign.
