import { randomUUID } from "node:crypto";

import type { EvidenceItem, InvestigationCase, RunnerStep } from "./domain.js";
import type { InvestigationRunner } from "./ports.js";

function wait(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(signal.reason ?? new Error("Investigation aborted"));
      },
      { once: true },
    );
  });
}

function evidence(
  title: string,
  summary: string,
  source: string,
): EvidenceItem {
  return {
    id: randomUUID(),
    title,
    summary,
    source,
    verification: "verified",
    observedAt: new Date().toISOString(),
  };
}

export class DemoInvestigationRunner implements InvestigationRunner {
  async *run(
    investigation: InvestigationCase,
    signal: AbortSignal,
  ): AsyncIterable<RunnerStep> {
    const steps: RunnerStep[] = [
      {
        delayMs: 250,
        event: {
          type: "run.started",
          title: "Investigation started",
          publicSummary: "The ticket snapshot is ready for analysis.",
        },
      },
      {
        delayMs: 650,
        event: {
          type: "ticket.parsed",
          title: "Ticket understood",
          publicSummary: `Identified ${investigation.reconstructed.customer} as the affected customer and extracted the reported symptom.`,
        },
        patch: {
          summary: investigation.ticket.report,
          environment: "Production",
        },
      },
      {
        delayMs: 650,
        event: {
          type: "plan.created",
          title: "Investigation plan created",
          publicSummary:
            "Check customer configuration, application errors, recent incidents and related engineering issues.",
        },
      },
      {
        delayMs: 800,
        event: {
          type: "tool.started",
          title: "Searching application logs",
          publicSummary:
            "Looking for errors matching the customer and reported time window.",
          source: "Observability",
        },
      },
      {
        delayMs: 900,
        event: {
          type: "finding.added",
          title: "Repeated failures found",
          publicSummary:
            "Found 17 related failures beginning shortly before the ticket was opened.",
          source: "Observability",
          evidence: evidence(
            "17 related failures",
            "The failures share the same customer identifier and error signature.",
            "Observability",
          ),
        },
        patch: {
          impact: "The affected workflow has failed repeatedly since the first observed error.",
        },
      },
      {
        delayMs: 800,
        event: {
          type: "tool.started",
          title: "Checking recent changes",
          publicSummary:
            "Comparing the first failure with configuration, incident and deployment history.",
          source: "Engineering",
        },
      },
      {
        delayMs: 900,
        event: {
          type: "finding.added",
          title: "Relevant configuration change found",
          publicSummary:
            "A customer configuration change occurred two minutes before the first failure.",
          source: "Audit logs",
          evidence: evidence(
            "Configuration changed before first failure",
            "The change and first failure are separated by two minutes.",
            "Audit logs",
          ),
        },
      },
      {
        delayMs: 700,
        event: {
          type: "run.completed",
          title: "Case ready for review",
          publicSummary:
            "The verified context and supporting evidence are ready for a support engineer to review.",
        },
        patch: {
          status: "ready-for-review",
          missingInformation: [],
          engineeringDraft:
            "Investigate the customer configuration change that immediately preceded the repeated production failures. Evidence and timestamps are attached.",
        },
      },
    ];

    for (const step of steps) {
      await wait(step.delayMs, signal);
      yield step;
    }
  }
}
