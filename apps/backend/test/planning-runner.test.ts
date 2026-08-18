import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  InvestigationCase,
  InvestigationPlan,
} from "../src/modules/investigations/domain.js";
import type { InvestigationPlanner } from "../src/modules/investigations/ports.js";
import { PlanningInvestigationRunner } from "../src/modules/investigations/planning-runner.js";

const investigation: InvestigationCase = {
  id: "case-1",
  workspaceId: "workspace-1",
  title: "Webhook delivery failures",
  status: "investigating",
  ticket: {
    provider: "zendesk",
    externalId: "ZD-123",
    report: "Webhook deliveries have failed since this morning.",
  },
  reconstructed: {
    customer: "Acme",
    environment: null,
    impact: null,
    summary: "Webhook deliveries are failing.",
    evidence: [],
    hypotheses: [],
    branches: [],
    knowledgeRetrieval: [],
    missingInformation: [],
    engineeringDraft: null,
  },
  createdBy: "user-1",
  createdAt: "2026-08-09T09:00:00.000Z",
  updatedAt: "2026-08-09T09:00:00.000Z",
};

function plannerWith(plan: InvestigationPlan): InvestigationPlanner {
  return {
    async plan() {
      return plan;
    },
  };
}

const webhookScope = {
  problems: [
    {
      id: "webhook-delivery",
      label: "failed webhook delivery",
      productArea: "Webhook delivery",
      action: "Retry a failed delivery",
      expectedBehavior: "The delivery is retried.",
      observedBehavior: "The retry action fails.",
      searchSignals: ["webhook delivery", "retry", "HTTP 401"],
      identifiers: [],
      ticketEvidence: ["Webhook deliveries have failed since this morning."],
      confidence: "high" as const,
    },
  ],
  ambiguities: [],
};

test("the planning runner emits public planning events without fabricated findings", async () => {
  const runner = new PlanningInvestigationRunner(
    plannerWith({
      summary: "Webhook delivery failures began this morning.",
      ticketScope: webhookScope,
      environment: null,
      impact: null,
      planSummary:
        "Check delivery logs, customer configuration and recent incidents.",
      searchObjectives: [
        {
          source: "Observability",
          objective: "Find webhook delivery errors in the reported window.",
          reason: "The ticket reports delivery failures.",
          access: "read-only",
        },
      ],
      missingInformation: [],
    }),
  );

  const steps = [];
  for await (const step of runner.run(investigation, new AbortController().signal)) {
    steps.push(step);
  }

  assert.deepEqual(
    steps.map((step) => step.event.type),
    ["run.started", "ticket.parsed", "plan.created"],
  );
  assert.equal(
    steps.some(
      (step) =>
        step.event.type === "finding.added" ||
        step.event.type === "run.completed" ||
        Boolean(step.event.evidence),
    ),
    false,
  );
  assert.deepEqual(steps[2]?.event.plan, [
    {
      source: "Observability",
      objective: "Find webhook delivery errors in the reported window.",
      reason: "The ticket reports delivery failures.",
      access: "read-only",
    },
  ]);
  assert.equal(steps[1]?.patch?.summary, "Webhook delivery failures began this morning.");
});

test("the planning runner records missing information without blocking specialist evidence gathering", async () => {
  const runner = new PlanningInvestigationRunner(
    plannerWith({
      summary: "Webhook delivery failures were reported without examples.",
      ticketScope: webhookScope,
      environment: null,
      impact: null,
      planSummary: "Identify affected deliveries before querying logs.",
      searchObjectives: [
        {
          source: "Ticket",
          objective: "Collect identifiers for affected webhook deliveries.",
          reason: "No failing delivery can be located safely without an ID.",
          access: "read-only",
        },
      ],
      missingInformation: ["One affected webhook event ID"],
    }),
  );

  const steps = [];
  for await (const step of runner.run(investigation, new AbortController().signal)) {
    steps.push(step);
  }

  assert.equal(steps.at(-1)?.event.type, "plan.created");
  assert.equal(steps.at(-1)?.patch?.status, undefined);
  assert.deepEqual(steps.at(-1)?.patch?.missingInformation, [
    "One affected webhook event ID",
  ]);
  assert.deepEqual(steps[1]?.patch?.ticketScope, webhookScope);
});
