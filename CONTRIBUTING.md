# Contributing to Weppo

Thanks for helping improve Weppo. Small, focused pull requests are easiest to
review and merge.

## Local setup

Requirements: Node.js 22, pnpm 9, and Docker. From the repository root:

```sh
pnpm install
cp apps/backend/.env.example apps/backend/.env
pnpm infra:up
pnpm --filter backend auth:migrate
pnpm dev
```

Do not commit `.env` files, credentials, generated databases, or build output.

## Checks

```sh
pnpm lint
pnpm check-types
pnpm test
pnpm build
```

CI runs these checks plus the backend container build.

## Pull requests

- Keep one logical change per pull request.
- Explain the problem, approach, and verification.
- Include screenshots for visible UI changes.
- Update documentation when setup or public behavior changes.
- Keep dependencies and abstractions to the minimum needed.

Use a short imperative commit subject, such as `Add empty workspace state`.
Keep unrelated cleanup out of feature commits.

For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a
public issue.
