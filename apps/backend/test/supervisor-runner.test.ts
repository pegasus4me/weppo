import assert from "node:assert/strict";
import { test } from "node:test";

import type { InvestigationCase, TicketScope } from "../src/modules/investigations/domain.js";
import { SupervisorInvestigationRunner } from "../src/modules/investigations/supervisor-runner.js";

const ticketScope: TicketScope = {
  problems: [{
    id: "partner-feed",
    label: "partner fulfillment feed stopped",
    productArea: "Partner delivery",
    action: "Deliver the nightly feed",
    expectedBehavior: "The partner receives the feed.",
    observedBehavior: "The partner no longer receives the feed.",
    searchSignals: ["partner endpoint", "outbound delivery"],
    identifiers: [],
    ticketEvidence: ["Our downstream partner stopped receiving the nightly feed."],
    confidence: "high",
  }],
  ambiguities: [],
};

const investigation: InvestigationCase = {
  id: "case-1",
  workspaceId: "workspace-1",
  title: "Partner feed failure",
  status: "investigating",
  ticket: { provider: "intercom", report: "Partner feed failed." },
  reconstructed: {
    customer: "Acme",
    environment: null,
    impact: null,
    summary: "Partner feed failure",
    evidence: [],
    hypotheses: [],
    branches: [],
    knowledgeRetrieval: [],
    missingInformation: [],
    engineeringDraft: null,
  },
  createdBy: "user-1",
  createdAt: "2026-08-10T10:00:00.000Z",
  updatedAt: "2026-08-10T10:00:00.000Z",
};

test("supervisor gives the specialist the planner's structured ticket scope", async () => {
  let specialistScope: TicketScope | null | undefined;
  const runner = new SupervisorInvestigationRunner(
    {
      role: "case",
      async *run() {
        yield {
          delayMs: 0,
          event: {
            type: "ticket.parsed" as const,
            title: "Ticket understood",
            publicSummary: "Partner delivery was identified.",
          },
          patch: { ticketScope },
        };
      },
    },
    [{
      role: "observability",
      async *run(scopedCase) {
        specialistScope = scopedCase.reconstructed.ticketScope;
        yield {
          delayMs: 0,
          event: {
            type: "tool.started" as const,
            title: "Searching scoped telemetry",
            publicSummary: "Searching only the scoped problem.",
          },
        };
      },
    }],
  );

  for await (const _step of runner.run(investigation, new AbortController().signal)) {
    // Exhaust the coordinator stream.
  }

  assert.deepEqual(specialistScope, ticketScope);
});
