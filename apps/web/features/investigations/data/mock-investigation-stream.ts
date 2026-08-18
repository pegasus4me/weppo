import type { AgentEvent, EvidenceItem } from "../model/investigation.types";
import type {
  InvestigationStream,
  InvestigationStreamOptions,
} from "./investigation-stream.client";
import { SseInvestigationStream } from "./investigation-stream.client";

type AgentEventInput = Omit<
  AgentEvent,
  "id" | "schemaVersion" | "caseId" | "runId" | "sequence" | "occurredAt"
>;

function event(
  caseId: string,
  sequence: number,
  input: AgentEventInput,
): AgentEvent {
  return {
    ...input,
    id: `${caseId}-live-${sequence}`,
    schemaVersion: 1,
    caseId,
    runId: `${caseId}-run`,
    sequence,
    occurredAt: new Date().toISOString(),
  };
}

function evidence(
  id: string,
  title: string,
  summary: string,
  source: string,
): EvidenceItem {
  return {
    id,
    title,
    summary,
    source,
    verification: "verified",
    observedAt: new Date().toISOString(),
  };
}

function demoEvents(caseId: string): AgentEventInput[] {
  if (caseId !== "salesforce-sync-failure") return [];

  return [
    {
      type: "plan.created",
      title: "Investigation plan created",
      publicSummary:
        "Check synchronization errors, OAuth events, customer configuration and recent incidents.",
    },
    {
      type: "tool.started",
      title: "Searching synchronization logs",
      publicSummary:
        "Filtering the sync service by Acme workspace and the reported time window.",
      source: "Datadog",
    },
    {
      type: "finding.added",
      title: "Repeated HTTP 403 failures found",
      publicSummary:
        "17 consecutive synchronization jobs failed with the same authorization error.",
      source: "Datadog",
      evidence: evidence(
        `${caseId}-live-evidence-1`,
        "17 synchronization failures",
        "All failures share the Acme workspace identifier and HTTP 403 signature.",
        "Datadog",
      ),
    },
    {
      type: "tool.started",
      title: "Checking OAuth events",
      publicSummary:
        "Comparing token events with the timestamp of the first failure.",
      source: "Product data",
    },
    {
      type: "finding.added",
      title: "Token refresh preceded the first failure",
      publicSummary:
        "The Salesforce token was refreshed two minutes before synchronization began failing.",
      source: "Product data",
      evidence: evidence(
        `${caseId}-live-evidence-2`,
        "OAuth token refreshed",
        "The refresh occurred two minutes before the first HTTP 403 response.",
        "Product data",
      ),
    },
    {
      type: "tool.started",
      title: "Checking incident history",
      publicSummary:
        "Searching for platform incidents affecting Salesforce synchronization.",
      source: "Incident history",
    },
    {
      type: "run.completed",
      title: "Case ready for review",
      publicSummary:
        "No platform incident was found. The verified evidence is ready for human review.",
    },
  ];
}

export class MockInvestigationStream implements InvestigationStream {
  private options: InvestigationStreamOptions | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private nextSequence = 0;

  private emit(input: AgentEventInput) {
    if (!this.options) return;
    this.nextSequence += 1;
    this.options.onEvent(
      event(this.options.caseId, this.nextSequence, input),
    );
  }

  private schedule(input: AgentEventInput, delayMs: number) {
    this.timers.push(setTimeout(() => this.emit(input), delayMs));
  }

  connect(options: InvestigationStreamOptions) {
    this.options = options;
    this.nextSequence = options.afterSequence;
    const events = demoEvents(options.caseId);

    options.onConnectionChange("connecting");
    this.timers.push(
      setTimeout(() => options.onConnectionChange("live"), 250),
    );
    events.forEach((item, index) => {
      this.schedule(item, 900 + index * 1_250);
    });

    return () => {
      this.timers.forEach(clearTimeout);
      this.timers = [];
      this.options = null;
      options.onConnectionChange("closed");
    };
  }

  async sendFollowUp(caseId: string, prompt: string) {
    if (!this.options || this.options.caseId !== caseId) {
      throw new Error("The investigation stream is not connected.");
    }

    this.emit({
      type: "follow_up.requested",
      title: "Follow-up requested",
      publicSummary: prompt,
    });
    this.schedule(
      {
        type: "plan.created",
        title: "Follow-up added to the plan",
        publicSummary:
          "The agent is checking the current case context against your request.",
      },
      650,
    );
    this.schedule(
      {
        type: "tool.started",
        title: "Reviewing related evidence",
        publicSummary:
          "Re-checking the collected evidence and source data for this follow-up.",
        source: "Case evidence",
      },
      1_450,
    );
  }
}

export function createInvestigationStream(mode: "mock" | "sse"): InvestigationStream {
  return mode === "sse" ? new SseInvestigationStream() : new MockInvestigationStream();
}
