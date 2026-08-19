# Weppo

Weppo is currently in validation mode. This repository contains the public
landing page, product surface, and backend foundation for a technical
investigation workspace serving fast-growing technical B2B SaaS teams.

The first wedge is focused on Technical Support Engineers and Tier 2 support:
turning incomplete customer tickets into engineering-ready escalations by
reconstructing context from read-only support, observability, knowledge, and
engineering tools.

### Problem
Support teams and on-call engineers waste 30–45 minutes per ticket digging through logs, databases, and error trackers to understand what went wrong.

### Solution
Weppo connects to your tools in read-only mode to pull logs, error traces, and user context into a complete bug report in under 2 minutes. Engineers get clean reproduction steps and technical proof without back-and-forth questions.

See [PRODUCT.md](PRODUCT.md) for the current ICP, workflow, MVP scope, and
product boundaries.

## Repository

```text
apps/
├── backend/   Fastify API, PostgreSQL, auth, permissions, and observability
├── docs/      Next.js documentation surface
├── landing/   Public marketing and pilot application site
└── web/       Auth-ready product application

packages/
├── eslint-config/
├── typescript-config/
└── ui/        Shared UI components

cli/           Reddit research scraper and validation datasets
```

The workspace uses pnpm and Turborepo. The required Node.js version is defined
in `.nvmrc`.

## Start locally

Install dependencies:

```bash
pnpm install
```

Start PostgreSQL and prepare the backend:

```bash
cp apps/backend/.env.example apps/backend/.env
pnpm infra:up
pnpm --filter backend auth:migrate
```

Start all development services:

```bash
pnpm dev
```

Default ports:

- Web: `http://localhost:3000`
- Docs: `http://localhost:3001`
- Landing: `http://localhost:3002`
- Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5433`

PostgreSQL uses port `5433` on the host to avoid conflicting with an existing
local PostgreSQL instance.

## Quality checks

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
```

Pull requests and pushes to `main` run the same checks in GitHub Actions. The
backend also ships with a portable production Dockerfile.

See [apps/backend/README.md](apps/backend/README.md) for the API boundaries,
authentication model, health endpoints, and migration commands.
