import assert from "node:assert/strict";
import { test } from "node:test";

import Fastify from "fastify";

import type { Auth } from "../src/lib/auth.js";
import { followUpPromptMaxLength } from "../src/modules/investigations/domain.js";
import { InMemoryAgentEventSubscription } from "../src/modules/investigations/event-subscription.js";
import { InMemoryInvestigationRepository } from "../src/modules/investigations/in-memory-repository.js";
import type { InvestigationRunner } from "../src/modules/investigations/ports.js";
import { investigationRoutes } from "../src/modules/investigations/routes.js";
import { InvestigationService } from "../src/modules/investigations/service.js";

const actor = { userId: "user-1", workspaceId: "workspace-1" };

const immediateRunner: InvestigationRunner = {
  async *run() {
    yield {
      delayMs: 0,
      event: {
        type: "run.started",
        title: "Started",
        publicSummary: "Investigation started.",
      },
    };
    yield {
      delayMs: 0,
      event: {
        type: "finding.added",
        title: "Evidence found",
        publicSummary: "A verified failure was found.",
        source: "Test logs",
        evidence: {
          id: "evidence-1",
          title: "Verified failure",
          summary: "The failure matches the customer and time window.",
          source: "Test logs",
          verification: "verified",
        },
      },
    };
    yield {
      delayMs: 0,
      event: {
        type: "run.completed",
        title: "Ready",
        publicSummary: "Ready for review.",
      },
      patch: {
        status: "ready-for-review",
        engineeringDraft: "Review the verified failure.",
      },
    };
  },
};

const idleRunner: InvestigationRunner = {
  async *run() {
    // Follow-up tests do not need the demo agent to produce activity.
  },
};

function authFor(testActor: typeof actor): Auth {
  return {
    api: {
      getSession: async () => ({
        user: { id: testActor.userId },
        session: { activeOrganizationId: testActor.workspaceId },
      }),
    },
  } as unknown as Auth;
}

test("creating an investigation starts a run and projects ordered events", async () => {
  const service = new InvestigationService(
    new InMemoryInvestigationRepository(),
    immediateRunner,
    new InMemoryAgentEventSubscription(),
  );

  const created = await service.createAndStart(actor, {
    customer: "Acme",
    report: "Synchronization stopped after a token refresh.",
  });
  assert.ok(created.runId);

  await new Promise<void>((resolve) => setImmediate(resolve));
  const snapshot = await service.get(actor, created.investigation.id);

  assert.ok(snapshot);
  assert.equal(snapshot.case.status, "ready-for-review");
  assert.deepEqual(
    snapshot.activity.map((event) => event.sequence),
    [1, 2, 3],
  );
  assert.equal(snapshot.case.reconstructed.evidence.length, 1);
  assert.equal(
    snapshot.case.reconstructed.engineeringDraft,
    "Review the verified failure.",
  );
  service.close();
});

test("investigations remain isolated by workspace", async () => {
  const service = new InvestigationService(
    new InMemoryInvestigationRepository(),
    immediateRunner,
    new InMemoryAgentEventSubscription(),
  );
  const created = await service.createAndStart(actor, {
    customer: "Acme",
    report: "A technical issue occurred.",
  });

  const otherWorkspace = await service.get(
    { userId: "user-2", workspaceId: "workspace-2" },
    created.investigation.id,
  );

  assert.equal(otherWorkspace, null);
  service.close();
});

test("a follow-up is persisted and published as trimmed public activity", async () => {
  const subscriptions = new InMemoryAgentEventSubscription();
  const service = new InvestigationService(
    new InMemoryInvestigationRepository(),
    idleRunner,
    subscriptions,
  );
  const created = await service.createAndStart(actor, {
    customer: "Acme",
    report: "A technical issue occurred.",
  });
  const published = new Promise<unknown>((resolve) => {
    subscriptions.subscribe(actor.workspaceId, created.investigation.id, resolve);
  });
  const app = Fastify();
  await app.register(investigationRoutes, {
    auth: authFor(actor),
    service,
  });

  const response = await app.inject({
    method: "POST",
    url: `/api/v1/investigations/${created.investigation.id}/follow-ups`,
    payload: { prompt: "  Check whether retries used the old token.  " },
  });

  assert.equal(response.statusCode, 202);
  const body = response.json();
  assert.equal(body.event.type, "follow_up.requested");
  assert.equal(
    body.event.publicSummary,
    "Check whether retries used the old token.",
  );
  assert.deepEqual(await published, body.event);
  assert.deepEqual(await service.events(actor, created.investigation.id), [
    body.event,
  ]);

  await app.close();
  service.close();
});

test("follow-ups validate prompt length and preserve workspace isolation", async () => {
  const service = new InvestigationService(
    new InMemoryInvestigationRepository(),
    idleRunner,
    new InMemoryAgentEventSubscription(),
  );
  const created = await service.createAndStart(actor, {
    customer: "Acme",
    report: "A technical issue occurred.",
  });
  const sameWorkspaceApp = Fastify();
  await sameWorkspaceApp.register(investigationRoutes, {
    auth: authFor(actor),
    service,
  });

  for (const prompt of ["   ", "x".repeat(followUpPromptMaxLength + 1)]) {
    const response = await sameWorkspaceApp.inject({
      method: "POST",
      url: `/api/v1/investigations/${created.investigation.id}/follow-ups`,
      payload: { prompt },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "INVALID_FOLLOW_UP");
  }

  const otherWorkspaceApp = Fastify();
  await otherWorkspaceApp.register(investigationRoutes, {
    auth: authFor({ userId: "user-2", workspaceId: "workspace-2" }),
    service,
  });
  const hiddenCaseResponse = await otherWorkspaceApp.inject({
    method: "POST",
    url: `/api/v1/investigations/${created.investigation.id}/follow-ups`,
    payload: { prompt: "Inspect this case." },
  });

  assert.equal(hiddenCaseResponse.statusCode, 404);
  assert.equal(
    hiddenCaseResponse.json().error.code,
    "INVESTIGATION_NOT_FOUND",
  );
  assert.deepEqual(await service.events(actor, created.investigation.id), []);

  await sameWorkspaceApp.close();
  await otherWorkspaceApp.close();
  service.close();
});
