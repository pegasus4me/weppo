import { randomUUID } from "node:crypto";

import type { IntegrationReadClients } from "../integrations/ports.js";
import type {
  EvidenceItem,
  Hypothesis,
  InvestigationBranch,
  InvestigationCase,
  KnowledgeRetrievalStep,
  RunnerStep,
} from "./domain.js";
import type { InvestigationRunner } from "./ports.js";

type JsonRecord = Record<string, unknown>;

type Symptom = {
  id: string;
  label: string;
  terms: string[];
  source: "ticket-scope" | "fallback";
  action: string | null;
  observedBehavior: string;
};

type Candidate = {
  organizationSlug: string;
  event: JsonRecord;
  issueId: string | null;
  eventId: string | null;
  title: string;
  timestamp: string | undefined;
  matchedSymptoms: Symptom[];
};

type InspectedCandidate = Candidate & {
  issue: JsonRecord | null;
  eventDetail: JsonRecord | null;
  relevance: number;
};

type BranchSelection = {
  symptom: Symptom;
  candidate: InspectedCandidate | null;
};

type KnowledgeDocument = {
  pageId: string;
  title: string;
  queries: string[];
  symptomIds: string[];
  markdown: string;
  sourceUrl?: string;
};

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asSearchText(value: unknown): string {
  if (typeof value === "string") return value.toLowerCase();
  if (Array.isArray(value)) return value.map(asSearchText).join(" ");
  const item = record(value);
  return item ? Object.values(item).map(asSearchText).join(" ") : "";
}

function issueId(value: unknown): string | null {
  const item = record(value);
  return stringValue(item?.id) ?? stringValue(item?.shortId) ?? stringValue(value);
}

function timeWindow(occurredAt: string) {
  const center = new Date(occurredAt);
  if (Number.isNaN(center.getTime())) return null;
  return {
    start: new Date(center.getTime() - 30 * 60_000).toISOString(),
    end: new Date(center.getTime() + 10 * 60_000).toISOString(),
  };
}

function expandedTimeWindow(occurredAt: string) {
  const center = new Date(occurredAt);
  if (Number.isNaN(center.getTime())) return null;
  return {
    start: new Date(center.getTime() - 24 * 60 * 60_000).toISOString(),
    end: new Date().toISOString(),
  };
}

function sentrySearchDetails(
  queries: string[],
  range: { start: string; end: string },
  limit = 20,
) {
  return [
    { label: "Identity queries", value: queries.join(" · ") },
    { label: "Time window", value: `${range.start} → ${range.end}` },
    { label: "Event fields read", value: "event ID, issue, title, message, project, timestamp" },
    { label: "Result limit", value: `${limit} per identity query` },
  ];
}

function fallbackSymptoms(report: string): Symptom[] {
  const definitions: Symptom[] = [
    {
      id: "webhook-retry",
      label: "failed webhook retry",
      terms: ["webhook", "delivery", "deliveries", "retry", "http 401", "endpoint"],
      source: "fallback",
      action: "Retry failed webhook deliveries",
      observedBehavior: "The retry action fails.",
    },
    {
      id: "invoice-export",
      label: "failed invoice CSV export",
      terms: ["invoice", "export", "csv", "billing", "reconciliation"],
      source: "fallback",
      action: "Export invoice CSV",
      observedBehavior: "The export action fails.",
    },
    {
      id: "seat-upgrade",
      label: "failed seat upgrade",
      terms: ["seat", "subscription", "teammate", "upgrade"],
      source: "fallback",
      action: "Upgrade seats",
      observedBehavior: "The upgrade action fails.",
    },
    {
      id: "usage-reconciliation",
      label: "failed usage reconciliation",
      terms: ["usage", "reconciliation", "rollup", "cursor"],
      source: "fallback",
      action: "Reconcile usage",
      observedBehavior: "Usage reconciliation fails.",
    },
  ];
  return definitions.filter((symptom) => matchesTicketWorkflow(report, symptom));
}

function scopedSymptoms(investigation: InvestigationCase): Symptom[] {
  const problems = investigation.reconstructed.ticketScope?.problems ?? [];
  if (!problems.length) return fallbackSymptoms(investigation.ticket.report);
  return problems.map((problem) => ({
    id: problem.id,
    label: problem.label,
    terms: problem.searchSignals,
    source: "ticket-scope",
    action: problem.action,
    observedBehavior: problem.observedBehavior,
  }));
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function meaningfulTokens(value: string) {
  const ignored = new Set([
    "the", "and", "for", "with", "from", "that", "this", "error", "failed",
    "failure", "issue", "problem", "customer", "report", "unexpected", "unable",
  ]);
  return [...new Set(
    value.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((token) => !ignored.has(token)) ?? [],
  )];
}

function signalMatches(text: string, signal: string) {
  const normalizedSignal = signal.toLowerCase().trim();
  if (!normalizedSignal) return false;
  if (text.includes(normalizedSignal)) return true;
  const tokens = meaningfulTokens(normalizedSignal);
  if (!tokens.length) return false;
  const matches = tokens.filter((token) => text.includes(token)).length;
  return tokens.length === 1 ? matches === 1 : matches >= Math.min(2, tokens.length);
}

function hasConcept(symptom: Symptom, concepts: string[]) {
  const searchable = `${symptom.label} ${symptom.terms.join(" ")}`.toLowerCase();
  return containsAny(searchable, concepts);
}

function matchesTicketWorkflow(text: string, symptom: Symptom) {
  const normalized = text.toLowerCase();
  if (symptom.id === "webhook-retry") {
    return (
      containsAny(normalized, ["webhook", "web hook", "delivery", "deliveries"]) &&
      containsAny(normalized, ["retry", "retries", "failed", "failure", "error", "attempt"])
    );
  }
  if (symptom.id === "invoice-export") {
    return (
      normalized.includes("invoice") &&
      containsAny(normalized, ["export", "csv"])
    );
  }
  if (symptom.id === "seat-upgrade") {
    return (
      containsAny(normalized, ["seat", "teammate"]) &&
      containsAny(normalized, ["upgrade", "upgrading"])
    );
  }
  if (symptom.id === "usage-reconciliation") {
    return (
      normalized.includes("usage") &&
      containsAny(normalized, ["reconciliation", "reconcile", "rollup"])
    );
  }
  return false;
}

function matchesSentryWorkflow(text: string, symptom: Symptom) {
  if (symptom.source === "ticket-scope") {
    const matchedSignals = symptom.terms.filter((signal) => signalMatches(text, signal));
    const minimum = symptom.terms.length <= 2 ? symptom.terms.length : 2;
    return matchedSignals.length >= minimum;
  }
  const normalized = text.toLowerCase();
  if (symptom.id === "webhook-retry") {
    return (
      containsAny(normalized, ["webhook", "web hook", "delivery", "deliveries"]) &&
      containsAny(normalized, ["retry", "retries", "attempt", "exhausted", "http"])
    );
  }
  if (symptom.id === "invoice-export") {
    return (
      normalized.includes("invoice") &&
      containsAny(normalized, ["export", "csv"])
    );
  }
  return matchesTicketWorkflow(normalized, symptom);
}

function score(text: string, symptom: Symptom) {
  return symptom.terms.reduce(
    (total, term) => total + (signalMatches(text, term) ? 1 : 0),
    0,
  );
}

function candidateFrom(
  organizationSlug: string,
  event: unknown,
  symptoms: Symptom[],
): Candidate | null {
  const value = record(event);
  if (!value) return null;
  const title = text(value.title) ?? text(value.message) ?? "Sentry error event";
  const searchable = asSearchText(value);
  const matchedSymptoms = symptoms.filter((symptom) =>
    matchesSentryWorkflow(searchable, symptom),
  );
  return {
    organizationSlug,
    event: value,
    issueId: issueId(value.issue),
    eventId: stringValue(value.id),
    title,
    timestamp: text(value.timestamp) ?? undefined,
    matchedSymptoms,
  };
}

function evidenceFor(
  candidate: InspectedCandidate,
  symptom: Symptom,
  searchWindow: "ticket" | "expanded",
): EvidenceItem {
  const event = candidate.eventDetail ?? candidate.event;
  const request = record(event.request);
  const contexts = record(event.contexts);
  const trace = record(contexts?.trace);
  const operation = record(contexts?.operation);
  const telemetry: Array<[string, string | null | undefined]> = [
    ["Sentry issue", candidate.issueId],
    ["Sentry event", candidate.eventId],
    ["Project", text(candidate.event.project) ?? text(event.project)],
    ["Observed at", candidate.timestamp],
    ["Evidence status", "Customer-scoped workflow correlation"],
    ["Exception type", exceptionType(candidate.eventDetail)],
    ["Error detail", errorDetail(candidate.eventDetail)],
    ["Request path", safeRequestPath(request?.url) ?? text(operation?.name)],
    ["Trace", stringValue(trace?.trace_id)],
  ];
  const details = telemetry.flatMap(([label, value]) =>
    value ? [{ label, value }] : [],
  );
  return {
    id: randomUUID(),
    title: candidate.title,
    summary: `Customer-scoped Sentry event${candidate.timestamp ? ` at ${candidate.timestamp}` : ""} matches the reported ${symptom.label}. It was found in the ${searchWindow === "expanded" ? "expanded 24-hour investigation window" : "ticket time window"}; the issue and event details were inspected. This is workflow correlation, not proof of root cause.`,
    source: `Sentry · ${candidate.organizationSlug}`,
    sourceReference: candidate.eventId ?? candidate.issueId ?? undefined,
    sourceUrl: candidate.issueId
      ? `https://${candidate.organizationSlug}.sentry.io/issues/${encodeURIComponent(candidate.issueId)}/`
      : undefined,
    details,
    observedAt: candidate.timestamp,
    verification: "verified",
  };
}

function errorDetail(value: JsonRecord | null) {
  const exception = record(value?.exception);
  const values = Array.isArray(exception?.values) ? exception.values : [];
  const first = record(values[0]);
  return text(first?.value) ?? text(first?.type) ?? text(value?.title) ?? null;
}

function exceptionType(value: JsonRecord | null) {
  const exception = record(value?.exception);
  const values = Array.isArray(exception?.values) ? exception.values : [];
  return text(record(values[0])?.type);
}

function safeRequestPath(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  try {
    return new URL(raw).pathname;
  } catch {
    return raw.split(/[?#]/, 1)[0] ?? null;
  }
}

function notionPages(value: unknown): JsonRecord[] {
  const response = record(value);
  return Array.isArray(response?.results)
    ? response.results.map(record).filter((page): page is JsonRecord => Boolean(page))
    : [];
}

function notionTitle(page: JsonRecord) {
  const properties = record(page.properties);
  const titleProperty = properties
    ? Object.values(properties).map(record).find((property) => property?.type === "title")
    : null;
  const titleItems = Array.isArray(titleProperty?.title) ? titleProperty.title : [];
  const title = titleItems.map(record).map((item) => text(item?.plain_text)).find(Boolean);
  return title ?? text(page.url) ?? "Internal knowledge page";
}

function notionMarkdown(value: unknown) {
  const response = record(value);
  return text(response?.markdown) ?? text(response?.content) ?? "";
}

function compactKnowledgeExcerpt(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_>`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
}

function knowledgeMatchesSymptom(
  symptom: Symptom,
  title: string,
  markdown: string,
) {
  const searchable = `${title} ${markdown}`.toLowerCase();
  if (symptom.source === "ticket-scope") {
    return symptom.terms.some((signal) => signalMatches(searchable, signal));
  }
  const requiredTerms: Record<string, string[]> = {
    "webhook-retry": [
      "webhook",
      "delivery",
      "retry",
      "outbound",
      "endpoint",
      "signature",
    ],
    "invoice-export": ["invoice", "export", "csv", "billing"],
    "seat-upgrade": ["seat", "subscription", "upgrade", "teammate"],
    "usage-reconciliation": ["usage", "reconciliation", "rollup", "cursor"],
  };
  return (requiredTerms[symptom.id] ?? symptom.terms).some((term) =>
    searchable.includes(term),
  );
}

function knowledgeQuestion(symptom: Symptom) {
  if (hasConcept(symptom, ["webhook", "delivery", "outbound"])) {
    return "Which delivery-pipeline stage is proven to have failed, and what evidence distinguishes endpoint rejection from an earlier platform failure?";
  }
  if (hasConcept(symptom, ["invoice", "export", "csv"])) {
    return "Which export-pipeline stage exceeded its budget, and what evidence distinguishes query selection, generation, storage, or capacity?";
  }
  return `Which system stage explains the reported ${symptom.label}, and what source could confirm or disprove it?`;
}

function branchQuestion(symptom: Symptom) {
  if (hasConcept(symptom, ["webhook", "delivery", "outbound"])) {
    return "Which delivery-pipeline stage is proven by the customer-scoped telemetry, and what evidence would distinguish destination rejection from an earlier platform failure?";
  }
  if (hasConcept(symptom, ["invoice", "export", "csv"])) {
    return "Which export-pipeline stage exceeded the execution budget, and what evidence would distinguish selection, generation, storage, or capacity?";
  }
  return `What evidence can explain or disprove the reported ${symptom.label}?`;
}

function knowledgeQueries(symptom: Symptom, candidate: InspectedCandidate | null) {
  const queries = [
    ...(candidate ? [candidate.title] : []),
    symptom.action ?? symptom.label,
    ...symptom.terms.slice(0, 2),
  ];
  if (symptom.source === "fallback" && hasConcept(symptom, ["webhook", "delivery"])) {
    queries.push("delivery pipeline investigation");
  }
  if (symptom.source === "fallback" && hasConcept(symptom, ["invoice", "export"])) {
    queries.push("long-running export investigation");
  }
  return [...new Set(queries)];
}

function missingTelemetryAssessment(symptom: Symptom) {
  return {
    observation: null,
    conclusion:
      "No Sentry error event in the searched customer and time scope matched this reported workflow. This does not prove that the customer action succeeded or that the problem does not exist.",
    nextStep: {
      source: "Customer / TSE reproduction context",
      question: `Provide the approximate attempt time, affected identifier, and any visible error or request ID for ${symptom.action ?? symptom.label}; then repeat the evidence search against that narrower reference.`,
      availability: "unavailable" as const,
    },
  };
}

function branchAssessment(symptom: Symptom, candidate: InspectedCandidate) {
  const observed = `${asSearchText(candidate.event)} ${asSearchText(candidate.issue)} ${asSearchText(candidate.eventDetail)}`;
  if (hasConcept(symptom, ["webhook", "delivery", "outbound"]) && /http\s*401|401/.test(observed)) {
    return {
      observation:
        "Sentry records retry attempts that reached an HTTP response and ended with HTTP 401.",
      conclusion:
        "The available evidence supports destination-side authentication rejection after an outbound attempt. It does not distinguish an expired credential, a signature mismatch, or a destination policy change.",
      nextStep: {
        source: "Webhook delivery configuration and attempt history",
        question:
          "Compare the failed request’s endpoint, authentication/signature configuration, and headers with the most recent successful delivery.",
        availability: "unavailable" as const,
      },
    };
  }
  if (hasConcept(symptom, ["invoice", "export", "csv"]) && /timeout|30 second/.test(observed)) {
    return {
      observation:
        "Sentry records an invoice export that exceeded the 30-second execution budget.",
      conclusion:
        "The available evidence proves a time-budget breach, but does not identify whether selection, generation, storage, or platform capacity consumed the time.",
      nextStep: {
        source: "Invoice export job and request trace",
        question:
          "Inspect the export job timeline, query duration, record volume, and terminal stage for the affected July export.",
        availability: "unavailable" as const,
      },
    };
  }
  return {
    observation: `Sentry records ${candidate.title} for this customer and reported workflow.`,
    conclusion:
      "The event is relevant, but the connected sources cannot yet identify the failed system stage or root cause.",
    nextStep: {
      source: "Product telemetry",
      question: knowledgeQuestion(symptom),
      availability: "unavailable" as const,
    },
  };
}

function timelineSummary(investigation: InvestigationCase, candidates: InspectedCandidate[]) {
  const points = [
    ...(investigation.ticket.occurredAt
      ? [{ at: investigation.ticket.occurredAt, text: "Customer report opened in Intercom (reported)." }]
      : []),
    ...candidates.map((candidate) => ({
      at: candidate.timestamp ?? "Unknown time",
      text: `${candidate.title} observed in Sentry.`,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return points.map((point) => `${point.at} — ${point.text}`).join(" ");
}

export class IntercomInvestigationRunner implements InvestigationRunner {
  constructor(private readonly clients: IntegrationReadClients) {}

  async *run(investigation: InvestigationCase, signal: AbortSignal): AsyncIterable<RunnerStep> {
    const email = investigation.ticket.customerEmail;
    const externalIds = investigation.ticket.intercom?.contactExternalIds ?? [];
    const window = investigation.ticket.occurredAt ? timeWindow(investigation.ticket.occurredAt) : null;
    const symptoms = scopedSymptoms(investigation);
    const identityQueries = [
      ...(email ? [`user.email:${JSON.stringify(email)}`] : []),
      ...externalIds.map((externalId) => `user.id:${JSON.stringify(externalId)}`),
    ];

    if (!symptoms.length) {
      yield {
        delayMs: 0,
        agentRole: "case",
        event: {
          type: "input.requested",
          title: "Ticket scope required",
          publicSummary: "No product workflow could be established from the ticket. Weppo will not search customer telemetry broadly; add the affected feature and the failed action first.",
        },
        patch: {
          status: "needs-input",
          missingInformation: [
            "Affected feature or workflow",
            "Action that fails and the expected result",
          ],
        },
      };
      return;
    }

    if (!identityQueries.length || !window) {
      yield {
        delayMs: 0,
        event: { type: "input.requested", title: "Customer context required", publicSummary: "The ticket needs a customer identity and timestamp before telemetry can be searched safely." },
        patch: { status: "needs-input", missingInformation: ["Customer identity", "Ticket timestamp"] },
      };
      return;
    }

    yield {
      delayMs: 0,
      event: {
        type: "plan.created",
        title: "Evidence-first investigation plan",
        publicSummary: `Ticket scope locked to ${symptoms.map((symptom) => symptom.label).join(" · ")}. Sentry candidates outside these reported workflows will not be shown as case evidence.`,
        plan: [
          { source: "Sentry", objective: "Retrieve customer-scoped error candidates.", reason: "Identity narrows the search without assuming a cause.", access: "read-only" },
          { source: "Sentry", objective: "Inspect issue and event details only for candidates that match the reported workflows.", reason: "A matching customer alone is not causal evidence.", access: "read-only" },
        ],
      },
    };

    const search = async (queries: string[], range: { start: string; end: string }) => {
      const results = await Promise.all(queries.map((query) => this.clients.sentry.searchErrorEvents(
        investigation.workspaceId, { query, start: range.start, end: range.end, limit: 20 }, signal,
      )));
      const seen = new Set<string>();
      return results.flat(1).flatMap((result) => result.data.map((event) => ({ organizationSlug: result.organizationSlug, event })))
        .filter(({ event }) => {
          const id = stringValue(record(event)?.id) ?? JSON.stringify(event);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
    };

    yield {
      delayMs: 0,
      agentRole: "observability",
      event: {
        type: "tool.started",
        title: "Searching Sentry",
        publicSummary: `Using ${identityQueries.length} exact customer identity signal${identityQueries.length === 1 ? "" : "s"} in the ticket time window.`,
        source: "Sentry",
        details: sentrySearchDetails(identityQueries, window),
      },
    };

    let rawCandidates: Array<{ organizationSlug: string; event: unknown }>;
    let searchWindow: "ticket" | "expanded" = "ticket";
    try {
      rawCandidates = await search(identityQueries, window);
      if (!rawCandidates.length) {
        const expanded = expandedTimeWindow(investigation.ticket.occurredAt!);
        if (expanded) {
          yield {
            delayMs: 0,
            agentRole: "observability",
            event: {
              type: "tool.started",
              title: "Expanding Sentry search",
              publicSummary: "No event appeared near the ticket time, so the search is expanding to the preceding 24 hours through now — still scoped to this customer.",
              source: "Sentry",
              details: sentrySearchDetails(identityQueries, expanded),
            },
          };
          rawCandidates = await search(identityQueries, expanded);
          searchWindow = "expanded";
        }
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Sentry search failed.";
      yield { delayMs: 0, event: { type: "input.requested", title: "Sentry connection required", publicSummary: message }, patch: { status: "needs-input", missingInformation: [message] } };
      return;
    }

    const candidates = rawCandidates.map(({ organizationSlug, event }) => candidateFrom(organizationSlug, event, symptoms)).filter((item): item is Candidate => Boolean(item));
    const relevant = candidates.filter((candidate) => candidate.matchedSymptoms.length > 0).slice(0, 6);
    yield {
      delayMs: 0,
      agentRole: "observability",
      event: {
        type: "tool.started",
        title: "Triaging Sentry candidates",
        publicSummary: relevant.length
          ? `${relevant.length} candidate${relevant.length === 1 ? "" : "s"} match the ticket-scoped workflow${symptoms.length === 1 ? "" : "s"}. Only those candidates proceed to evidence review.`
          : "No Sentry event matched the ticket-scoped workflows in the searched customer and time scope. The reported problems remain open.",
        source: "Sentry",
        details: [
          { label: "Ticket-scoped workflows", value: symptoms.map((symptom) => symptom.label).join(" · ") },
          { label: "Workflow-matched candidates", value: String(relevant.length) },
          { label: "Case policy", value: "Only ticket-scoped candidates are retained as evidence" },
        ],
      },
    };

    if (relevant.length) {
      yield {
        delayMs: 0,
        agentRole: "observability",
        event: {
          type: "tool.started",
          title: "Inspecting relevant Sentry evidence",
          publicSummary: `Opening issue metadata and event detail in parallel for ${relevant.length} workflow-matched candidate${relevant.length === 1 ? "" : "s"}.`,
          source: "Sentry",
          details: [
            { label: "Candidates opened", value: String(relevant.length) },
            { label: "Read operations", value: "Issue metadata · event detail" },
            { label: "Selection rule", value: "Keep the strongest evidence per reported workflow" },
          ],
        },
      };
    }
    const inspected = await Promise.all(relevant.map(async (candidate): Promise<InspectedCandidate> => {
      const [issue, detail] = await Promise.all([
        candidate.issueId ? this.clients.sentry.getIssue(investigation.workspaceId, candidate.organizationSlug, candidate.issueId, signal).catch(() => null) : Promise.resolve(null),
        candidate.issueId ? this.clients.sentry.getIssueEvent(investigation.workspaceId, candidate.organizationSlug, candidate.issueId, candidate.eventId ?? undefined, signal).catch(() => null) : Promise.resolve(null),
      ]);
      const issueRecord = record(issue);
      const detailRecord = record(detail);
      const searchable = `${asSearchText(candidate.event)} ${asSearchText(issueRecord)} ${asSearchText(detailRecord)}`;
      return { ...candidate, issue: issueRecord, eventDetail: detailRecord, relevance: candidate.matchedSymptoms.reduce((total, symptom) => total + score(searchable, symptom), 0) };
    }));

    const strongestBySymptom = new Map<string, InspectedCandidate>();
    for (const candidate of inspected.sort((a, b) => b.relevance - a.relevance)) {
      for (const symptom of candidate.matchedSymptoms) {
        if (!strongestBySymptom.has(symptom.id)) strongestBySymptom.set(symptom.id, candidate);
      }
    }
    const selectedBranches: BranchSelection[] = symptoms.map((symptom) => ({
      symptom,
      candidate: strongestBySymptom.get(symptom.id) ?? null,
    }));
    const selectedCandidateKeys = new Set(
      selectedBranches.flatMap(({ candidate }) => candidate
        ? [candidate.eventId ?? `${candidate.organizationSlug}:${candidate.issueId ?? candidate.title}`]
        : [],
      ),
    );
    const nonSelectedCandidates = inspected.filter(
      (candidate) =>
        !selectedCandidateKeys.has(
          candidate.eventId ?? `${candidate.organizationSlug}:${candidate.issueId ?? candidate.title}`,
        ),
    );
    if (nonSelectedCandidates.length) {
      yield {
        delayMs: 0,
        agentRole: "observability",
        event: {
          type: "task.completed",
          title: "Selecting branch evidence",
          publicSummary: `Retained ${selectedBranches.length} branch evidence item${selectedBranches.length === 1 ? "" : "s"} backed by ${selectedCandidateKeys.size} strongest Sentry event${selectedCandidateKeys.size === 1 ? "" : "s"}. ${nonSelectedCandidates.length} additional workflow-matched event${nonSelectedCandidates.length === 1 ? " was" : "s were"} inspected but not retained because ${nonSelectedCandidates.length === 1 ? "it did" : "they did"} not add stronger or independent evidence for a branch.`,
          source: "Sentry",
          details: [
            { label: "Branch evidence items", value: String(selectedBranches.length) },
            { label: "Distinct Sentry events retained", value: String(selectedCandidateKeys.size) },
            { label: "Inspected but not retained", value: String(nonSelectedCandidates.length) },
          ],
        },
      };
    }
    const sentryEvidenceByBranch = new Map<string, EvidenceItem>();
    for (const branch of selectedBranches) {
      yield {
        delayMs: 0,
        agentRole: "observability",
        taskId: `branch-${branch.symptom.id}`,
        event: {
          type: "task.started",
          title: `Decision branch: ${branch.symptom.label}`,
          publicSummary: `Unresolved question: ${branchQuestion(branch.symptom)}`,
          source: "Case evidence",
        },
      };
      if (branch.candidate) {
        const item = evidenceFor(branch.candidate, branch.symptom, searchWindow);
        sentryEvidenceByBranch.set(branch.symptom.id, item);
        yield {
          delayMs: 0,
          agentRole: "observability",
          taskId: `branch-${branch.symptom.id}`,
          event: {
            type: "finding.added",
            title: item.title,
            publicSummary: item.summary,
            source: item.source,
            evidence: item,
          },
        };
      } else {
        yield {
          delayMs: 0,
          agentRole: "observability",
          taskId: `branch-${branch.symptom.id}`,
          event: {
            type: "task.completed",
            title: `No matching Sentry evidence: ${branch.symptom.label}`,
            publicSummary: "The workflow remains in scope because it was reported in the ticket. No matching Sentry event was found in the searched customer and time scope.",
            source: "Sentry",
          },
        };
      }
    }

    yield {
      delayMs: 0,
      agentRole: "knowledge",
      event: {
        type: "tool.started",
        title: "Searching internal knowledge",
        publicSummary: `Testing the remaining question in each of ${selectedBranches.length} branch${selectedBranches.length === 1 ? "" : "es"} against internal investigation guidance.`,
        source: "Notion",
        details: [
          { label: "Open investigation branches", value: selectedBranches.map(({ symptom }) => symptom.label).join(" · ") },
          { label: "Query approach", value: "Error signature plus branch-specific investigation question" },
          { label: "Access", value: "Shared pages only · read-only" },
        ],
      },
    };
    const knowledgeSearches = await Promise.all(
      selectedBranches.flatMap(({ symptom, candidate }) =>
        knowledgeQueries(symptom, candidate).map(async (query) => {
          try {
            const response = await this.clients.notion.searchPages(
              investigation.workspaceId,
              query,
              signal,
            );
            return { symptomId: symptom.id, query, pages: notionPages(response) };
          } catch {
            return { symptomId: symptom.id, query, pages: [] };
          }
        }),
      ),
    );
    const knowledgeCandidates = knowledgeSearches.flatMap(({ symptomId, query, pages }) =>
      pages.slice(0, 2).flatMap((page) => {
        const pageId = stringValue(page.id);
        return pageId
          ? [{ symptomId, query, page, pageId, sourceUrl: text(page.url) ?? undefined }]
          : [];
      }),
    );
    const groupedKnowledgeCandidates = [...knowledgeCandidates.reduce((grouped, item) => {
      const current = grouped.get(item.pageId) ?? {
        pageId: item.pageId,
        page: item.page,
        sourceUrl: item.sourceUrl,
        queries: new Set<string>(),
        symptomIds: new Set<string>(),
      };
      current.queries.add(item.query);
      current.symptomIds.add(item.symptomId);
      grouped.set(item.pageId, current);
      return grouped;
    }, new Map<string, {
      pageId: string;
      page: JsonRecord;
      sourceUrl?: string;
      queries: Set<string>;
      symptomIds: Set<string>;
    }>()).values()].slice(0, 6);
    const knowledgeDocuments: KnowledgeDocument[] = [];
    let rejectedKnowledgeDocuments = 0;
    if (groupedKnowledgeCandidates.length) {
      yield {
        delayMs: 0,
        agentRole: "knowledge",
        event: {
          type: "tool.started",
          title: "Reading internal guidance",
          publicSummary: `Opening ${groupedKnowledgeCandidates.length} unique Notion page${groupedKnowledgeCandidates.length === 1 ? "" : "s"}; each page is read once, then accepted only for the branch it explicitly covers.`,
          source: "Notion",
          details: [
            { label: "Unique pages selected", value: String(groupedKnowledgeCandidates.length) },
            { label: "Deduplication", value: "Each page is read once before branch relevance is assessed" },
          ],
        },
      };
      const documents = await Promise.all(groupedKnowledgeCandidates.map(async (item) => {
        try {
          const content = await this.clients.notion.getPageMarkdown(
            investigation.workspaceId,
            item.pageId,
            signal,
          );
          const markdown = notionMarkdown(content);
          if (!markdown) return null;
          const title = notionTitle(item.page);
          const symptomIds = selectedBranches
            .filter(({ symptom }) =>
              item.symptomIds.has(symptom.id) &&
              knowledgeMatchesSymptom(symptom, title, markdown),
            )
            .map(({ symptom }) => symptom.id);
          return {
            pageId: item.pageId,
            title,
            queries: [...item.queries],
            symptomIds,
            markdown,
            sourceUrl: item.sourceUrl,
          };
        } catch {
          return null;
        }
      }));
      for (const document of documents) {
        if (!document?.symptomIds.length) {
          rejectedKnowledgeDocuments += 1;
          continue;
        }
        knowledgeDocuments.push(document);
      }
    }
    const knowledgeEvidenceByDocument = new Map<string, EvidenceItem>();
    for (const document of knowledgeDocuments) {
      const evidenceItem: EvidenceItem = {
        id: randomUUID(),
        title: `Internal guidance read: ${document.title}`,
        summary: `Read in full after a targeted Notion search. It frames the next technical question: ${compactKnowledgeExcerpt(document.markdown)}`,
        source: "Notion",
        sourceReference: document.pageId,
        sourceUrl: document.sourceUrl,
        details: [
          { label: "Matched branches", value: document.symptomIds.join(", ") },
          { label: "Searches", value: document.queries.join(" · ") },
          { label: "Page ID", value: document.pageId },
        ],
        verification: "verified",
      };
      knowledgeEvidenceByDocument.set(document.pageId, evidenceItem);
      yield {
        delayMs: 0,
        agentRole: "knowledge",
        taskId: document.symptomIds.length === 1
          ? `branch-${document.symptomIds[0]}`
          : undefined,
        event: {
          type: "finding.added",
          title: evidenceItem.title,
          publicSummary: evidenceItem.summary,
          source: "Notion",
          evidence: evidenceItem,
        },
      };
    }
    if (rejectedKnowledgeDocuments) {
      yield {
        delayMs: 0,
        agentRole: "knowledge",
        event: {
          type: "task.completed",
          title: "Discarding unrelated internal guidance",
          publicSummary: `${rejectedKnowledgeDocuments} Notion page${rejectedKnowledgeDocuments === 1 ? " was" : "s were"} read but did not explicitly cover a reported workflow, so ${rejectedKnowledgeDocuments === 1 ? "it was" : "they were"} not used as evidence.`,
          source: "Notion",
        },
      };
    }

    const branches: InvestigationBranch[] = selectedBranches.map(({ symptom, candidate }) => {
      const assessment = candidate
        ? branchAssessment(symptom, candidate)
        : missingTelemetryAssessment(symptom);
      const sentryEvidence = sentryEvidenceByBranch.get(symptom.id);
      const documentation = knowledgeDocuments.filter((document) => document.symptomIds.includes(symptom.id));
      const documentationEvidence = documentation
        .map((document) => knowledgeEvidenceByDocument.get(document.pageId))
        .filter((item): item is EvidenceItem => Boolean(item));
      return {
        id: symptom.id,
        label: symptom.label,
        status: candidate ? "blocked" : "needs-input",
        question: branchQuestion(symptom),
        observation: assessment.observation,
        conclusion: assessment.conclusion,
        evidenceIds: [
          ...(sentryEvidence ? [sentryEvidence.id] : []),
          ...documentationEvidence.map((item) => item.id),
        ],
        nextStep: assessment.nextStep,
        limitations: [
          "Connected read-only evidence has been exhausted for this branch.",
          ...(documentation.length
            ? [`Internal guidance was read from ${documentation.map((document) => document.title).join(", ")}; it constrains the next check but does not prove cause.`]
            : ["No relevant readable Notion guidance was found for this branch."]),
        ],
      };
    });

    for (const branch of branches) {
      yield {
        delayMs: 0,
        agentRole: "observability",
        taskId: `branch-${branch.id}`,
        event: {
          type: "task.completed",
          title: `Decision loop paused: ${branch.label}`,
          publicSummary: `${branch.conclusion} Next evidence source: ${branch.nextStep?.source} (${branch.nextStep?.availability}).`,
          source: "Case evidence",
        },
      };
    }

    const hypotheses: Hypothesis[] = selectedBranches.flatMap(({ symptom, candidate }) => {
      if (!candidate) return [];
      const branch = branches.find((item) => item.id === symptom.id)!;
      return [{
        id: randomUUID(),
        statement: `${candidate.title} is the leading technical explanation for the reported ${symptom.label}.`,
        confidence: candidate.relevance >= 3 ? "high" : "medium",
        supportingEvidenceIds: branch.evidenceIds,
        limitations: [
          "This is a correlation from customer-scoped telemetry, not a confirmed root cause.",
          ...(branch.nextStep ? [`Next evidence required: ${branch.nextStep.question}`] : []),
          ...(errorDetail(candidate.eventDetail) ? [`Observed error detail: ${errorDetail(candidate.eventDetail)}`] : []),
        ],
      }];
    });

    yield {
      delayMs: 0,
      event: {
        type: "task.completed",
        title: "Timeline reconstructed",
        publicSummary: timelineSummary(investigation, [...strongestBySymptom.values()]),
        source: "Case evidence",
      },
    };

    const sentryEvidence = [...sentryEvidenceByBranch.values()];
    const knowledgeRetrieval: KnowledgeRetrievalStep[] = [
      {
        id: "exact-structured",
        label: "Exact structured search",
        status: "completed",
        summary: `Sentry was searched with ${identityQueries.length} customer identity signal${identityQueries.length === 1 ? "" : "s"}, a bounded time window, and workflow-specific candidate triage.`,
      },
      {
        id: "hybrid-search",
        label: "Hybrid search",
        status: "unavailable",
        summary: "No metadata/vector index or reranker is connected. Notion retrieval in this run used only explicit lexical queries and relevance checks.",
      },
      {
        id: "targeted-reading",
        label: "Targeted reading",
        status: "completed",
        summary: knowledgeDocuments.length
          ? `${knowledgeDocuments.length} unique Notion page${knowledgeDocuments.length === 1 ? " was" : "s were"} read once and attached only to matching investigation branch${knowledgeDocuments.length === 1 ? "" : "es"}.`
          : "No Notion page met the branch-specific relevance threshold, so none was used as evidence.",
      },
      {
        id: "case-graph",
        label: "Knowledge graph / similar cases",
        status: "unavailable",
        summary: "No persistent solved-case graph or similar-case index is connected to this workspace yet.",
      },
      {
        id: "rag-complement",
        label: "RAG as a complement",
        status: "unavailable",
        summary: "No RAG index was queried. It was not substituted with generated or unsourced guidance.",
      },
    ];
    yield {
      delayMs: 0,
      event: {
        type: "run.completed",
        title: "Decision loop paused for review",
        publicSummary: `${branches.length} ticket-scoped branch${branches.length === 1 ? "" : "es"} reached a precise next-evidence requirement. ${sentryEvidence.length} branch${sentryEvidence.length === 1 ? " has" : "es have"} customer-scoped Sentry evidence; the remaining reported branches have no matching event in the searched scope.`,
        source: "Case evidence",
        hypotheses,
      },
      patch: {
        status: "ready-for-review",
        hypotheses,
        branches,
        knowledgeRetrieval,
        missingInformation: [],
        impact: `Customer-scoped Sentry evidence was found for ${sentryEvidence.length} of ${branches.length} reported workflow${branches.length === 1 ? "" : "s"}. Root cause remains unconfirmed.`,
        engineeringDraft: `Customer: ${investigation.reconstructed.customer}\n\nReported workflows: ${symptoms.map((symptom) => symptom.label).join("; ") || "not classified"}.\n\nTimeline: ${timelineSummary(investigation, [...strongestBySymptom.values()])}\n\nVerified telemetry: ${sentryEvidence.map((item) => item.title).join("; ")}.\n\nKnowledge reviewed: ${knowledgeDocuments.length ? knowledgeDocuments.map((document) => document.title).join("; ") : "No readable Notion page was available."}\n\nBranch decisions: ${branches.map((branch) => `${branch.label}: ${branch.conclusion} Next required source: ${branch.nextStep?.source}.`).join(" ")}\n\nScope: read-only correlation. The branches remain independent until shared evidence proves otherwise. This investigation paused because the required product-telemetry sources are not connected, not because a root cause was confirmed.`,
      },
    };
  }
}

export class RoutingInvestigationRunner implements InvestigationRunner {
  constructor(private readonly intercom: InvestigationRunner, private readonly fallback: InvestigationRunner) {}

  run(investigation: InvestigationCase, signal: AbortSignal) {
    return (investigation.ticket.provider === "intercom" ? this.intercom : this.fallback).run(investigation, signal);
  }
}
