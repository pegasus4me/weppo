# Weppo

**Ship agents you can trust.**

Turn real production failures into replayable tests, then test every future
change against them before it reaches production.

Weppo is for developers building AI agents who struggle to test how their agents
behave in real-world conditions. It is a self-serve, product-led tool that a
single developer can use.

## Problem hypothesis

Developers building AI agents struggle to test how they behave in real-world
conditions before shipping. A change to a prompt, model, or tool can fix one
scenario and break another. They need a simple way to reproduce failures,
understand what needs fixing, and check that changes work before production.
The failures developers did not anticipate often appear only after real users
interact with the agent, so production incidents must feed the next release's
tests.

## Product directive

**Every production failure becomes a test that protects future releases.**

**Your agent breaks once. Weppo makes sure it doesn't break the same way again.**

**Weppo turns real production failures into replayable tests, so every incident
makes your agent safer to update.**

Weppo connects what happens after deployment with testing before the next
release. It captures real failures, turns them into repeatable test scenarios,
and keeps those scenarios in the regression suite for every future change. As
production reveals new failure modes, the test suite becomes more representative
of how people actually use the agent—including situations the developer would
never have thought to test.

```text
Real production failure
        ↓
Trace captured from production
        ↓
Converted into a reproducible scenario
        ↓
Fix tested in the sandbox
        ↓
Scenario added to the permanent test suite
        ↓
Checked against every future change
```

Capturer automatiquement la trace concernée.
Créer le scénario sans copier manuellement les inputs.
Faciliter la définition des comportements attendus.
Conserver les preuves d’exécution.
Rejouer plusieurs versions et expliquer les différences.
Ajouter le test à chaque future release.

## V1 scope

V1 closes this loop without trying to provide a complete production observability
platform:

1. Capture or import a production run.
2. Let a developer mark the run as a failure, directly or from user feedback.
3. Preserve the trace, tool activity, and observable final state.
4. Convert the failure into a replayable scenario.
5. Test a fix in an isolated workflow and retain the scenario for future releases.

Automatic anomaly detection, real-time alerting, root-cause analysis, and broad
production monitoring can extend the loop later. In V1, production provides the
real failure case and Weppo handles the path from that failure to a permanent
regression test.

## Ideal customer profile

Individual developers building and shipping AI agents that use tools and
execute workflows.

- **Pain:** Manual testing misses failures that appear in production.
- **Trigger:** Shipping a change or fixing unexpected agent behavior.
- **Desired outcome:** Test realistic scenarios in isolated workflows, observe
  behavior, and know what to fix.
- **Adoption:** Start independently, get value on one agent, and expand to more
  workflows.

## The core loop

1. Capture or import a real failure observed in production.
2. Turn its trace and resulting state into a reproducible test scenario.
3. Replay it in an isolated workflow to understand and fix the issue.
4. Run the same scenario against the new version before shipping.
5. Keep it in the regression suite to protect every future release.

Every product decision serves **Pain → Magic moment → Habit → Expansion → Distribution**:
find a problem before production, make testing a habit, cover more workflows,
and share the value with other developers.

## Local development

Requires Node.js 22 (see `.nvmrc`), pnpm 9, and Docker.

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env
pnpm infra:up
pnpm --filter backend auth:migrate
pnpm dev
```

Web: `http://localhost:3000` · API: `http://localhost:4000`

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contributor workflow, checks,
and pull request expectations.

## Implementation status

The current application retains authentication, organization/workspace support,
PostgreSQL, API health checks and metrics, and a temporary authenticated web shell.
Trace capture/import, scenario conversion, replay, and regression suites are not
implemented yet. The legacy support-investigation engine and UI, support-provider
integrations, mock support app, old GTM app, and template docs app have been removed.

## Checks

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
```

## Project structure

```text
apps/backend/   Fastify API and authentication
apps/web/       Next.js web application
packages/ui/    Shared UI components
packages/*      Shared workspace configuration and tooling
```

Prefer a direct implementation over a new abstraction until a second real use
case exists.
