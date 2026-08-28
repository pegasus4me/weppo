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
      title: "Investigation complete",
      publicSummary:
        "The Salesforce token refresh is the leading explanation and the verified evidence is ready for human review.",
      casePatch: {
        status: "ready-for-review",
        diagnosis: {
          verdict: "likely",
          headline: "The Salesforce OAuth refresh likely invalidated the sync token",
          summary:
            "Seventeen HTTP 403 failures began two minutes after the token refresh, with no matching platform incident.",
          confidence: "high",
          impact: "1,240 contact updates are waiting to be synchronized.",
          evidenceIds: [
            `${caseId}-live-evidence-1`,
            `${caseId}-live-evidence-2`,
          ],
          recommendedNextStep:
            "Reconnect Salesforce, validate one synchronization, then replay the failed jobs.",
          drafts: {
            engineering:
              "Validate the Salesforce OAuth refresh path and reconnect the affected workspace before replaying failed synchronization jobs.",
            customerReply:
              "We found that the failures began immediately after the Salesforce token refresh. We recommend reconnecting the integration, validating one sync, and then retrying the remaining jobs.",
          },
        },
      },
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

    await new Promise((resolve) => setTimeout(resolve, 650));
    const normalized = prompt.toLowerCase();
    if (normalized.includes("customer") || normalized.includes("follow-up")) {
      return "We found that the synchronization failures began immediately after the Salesforce token refresh. We recommend reconnecting the integration, validating one synchronization, and then retrying the remaining jobs.";
    }
    if (normalized.includes("engineering") || normalized.includes("handoff")) {
      return "Acme experienced 17 consecutive HTTP 403 synchronization failures. The first failure occurred two minutes after the Salesforce OAuth token refresh. Reconnect the integration, validate one synchronization, then retry the failed jobs.";
    }
    return "The strongest evidence is the timing: the Salesforce token refresh occurred two minutes before 17 consecutive HTTP 403 failures began. This supports an OAuth authentication failure as the likely cause, but it does not prove why the refreshed token became invalid.";
  }
}

export function createInvestigationStream(mode: "mock" | "sse"): InvestigationStream {
  return mode === "sse" ? new SseInvestigationStream() : new MockInvestigationStream();
}
