import type {
  AgentEvent,
  EvidenceItem,
  InvestigationSnapshot,
  InvestigationStatus,
  InvestigationSummary,
} from "../model/investigation.types";

type MockInvestigation = InvestigationSummary & {
  report: string;
  impact: string;
  environment: string;
  sources: string[];
  evidence: Omit<EvidenceItem, "id">[];
  missingInformation: string[];
  engineeringDraft: string | null;
};

const mocks: MockInvestigation[] = [
  {
    id: "salesforce-sync-failure",
    title: "Salesforce sync failure",
    customer: "Acme",
    status: "investigating",
    updatedAt: "2 min ago",
    summary:
      "Contact synchronization has failed since an OAuth token refresh this morning.",
    report:
      "Our Salesforce contact sync stopped working this morning. New contacts are no longer appearing in Weppo.",
    impact: "1,240 contact updates are waiting to be synchronized.",
    environment: "Production · EU",
    sources: ["Zendesk", "Datadog", "Product data"],
    evidence: [],
    missingInformation: [],
    engineeringDraft: null,
  },
  {
    id: "api-requests-returning-401",
    title: "API requests returning 401",
    customer: "Northstar",
    status: "ready-for-review",
    updatedAt: "18 min ago",
    summary:
      "Production requests made with a recently rotated API key are being rejected.",
    report:
      "All checkout creation requests started returning 401 after we rotated our API key.",
    impact: "Checkout creation is blocked for the customer’s EU environment.",
    environment: "Production · EU",
    sources: ["Intercom", "Sentry", "Audit logs"],
    evidence: [
      {
        title: "Previous API key still in use",
        summary:
          "Failed requests contain the identifier of the key revoked at 09:14 UTC.",
        source: "Sentry",
        sourceReference: "trace-8392",
        verification: "verified",
      },
      {
        title: "New key succeeds",
        summary: "A request made with the replacement key returned HTTP 201.",
        source: "Audit logs",
        verification: "verified",
      },
    ],
    missingInformation: [],
    engineeringDraft:
      "Northstar’s EU checkout service is still using the API key revoked at 09:14 UTC. Requests using the replacement key succeed. Confirm whether the customer integration caches credentials after rotation.",
  },
  {
    id: "missing-webhook-events",
    title: "Missing webhook events",
    customer: "Orbit",
    status: "needs-input",
    updatedAt: "42 min ago",
    summary:
      "The customer reports that payment webhooks stopped arriving intermittently.",
    report:
      "Some payment webhooks never reach our endpoint, but others still work.",
    impact: "The exact number of missing events is not yet known.",
    environment: "Production",
    sources: ["Zendesk", "Webhook history"],
    evidence: [
      {
        title: "Sample delivery succeeded",
        summary: "The supplied sample event was delivered with HTTP 200.",
        source: "Webhook history",
        verification: "verified",
      },
    ],
    missingInformation: [
      "IDs of events believed to be missing",
      "Approximate timestamps",
      "Destination endpoint",
    ],
    engineeringDraft: null,
  },
  {
    id: "saml-login-loop",
    title: "SAML login redirect loop",
    customer: "Meridian",
    status: "needs-input",
    updatedAt: "1 hr ago",
    summary:
      "Administrators are redirected back to the identity provider after authentication.",
    report:
      "Three admins are stuck in a redirect loop after signing in with SAML.",
    impact: "Three administrators cannot access the production workspace.",
    environment: "Production",
    sources: ["Intercom", "Authentication logs"],
    evidence: [],
    missingInformation: ["Browser trace from an affected administrator"],
    engineeringDraft: null,
  },
  {
    id: "duplicate-export-records",
    title: "Duplicate records in export",
    customer: "Atlas",
    status: "ready-for-review",
    updatedAt: "Yesterday",
    summary:
      "A scheduled export contains duplicate rows after two jobs overlapped.",
    report: "Yesterday’s finance export contains duplicate transactions.",
    impact: "The finance team cannot reconcile yesterday’s report.",
    environment: "Production",
    sources: ["Zendesk", "Job history", "PostgreSQL"],
    evidence: [
      {
        title: "Overlapping export jobs",
        summary: "Two jobs processed the same date range concurrently.",
        source: "Job history",
        verification: "verified",
      },
    ],
    missingInformation: [],
    engineeringDraft:
      "Two scheduled export jobs ran concurrently against the same date range and wrote to one output without a uniqueness guard.",
  },
  {
    id: "csv-import-stalls",
    title: "CSV import stalls at 82%",
    customer: "Beacon",
    status: "needs-input",
    updatedAt: "Yesterday",
    summary:
      "A large customer import stops processing before completion without a visible error.",
    report: "Our migration CSV has been stuck at 82% since yesterday.",
    impact: "The customer cannot complete an account migration.",
    environment: "Production",
    sources: ["Zendesk", "Import service logs"],
    evidence: [],
    missingInformation: [
      "Original CSV file",
      "Confirmation that retrying is safe",
    ],
    engineeringDraft: null,
  },
];

// Keep one representative investigation in the demo workspace.
const activeMocks = mocks.filter(
  (mock) => mock.id === "salesforce-sync-failure",
);

function initialActivity(mock: MockInvestigation): AgentEvent[] {
  const base = Date.now() - 120_000;
  const events: AgentEvent[] = [
    {
      id: `${mock.id}-1`,
      schemaVersion: 1,
      caseId: mock.id,
      runId: `${mock.id}-run`,
      sequence: 1,
      type: "run.started",
      title: "Investigation started",
      publicSummary: "The ticket snapshot is ready for analysis.",
      occurredAt: new Date(base).toISOString(),
    },
    {
      id: `${mock.id}-2`,
      schemaVersion: 1,
      caseId: mock.id,
      runId: `${mock.id}-run`,
      sequence: 2,
      type: "ticket.parsed",
      title: "Ticket understood",
      publicSummary: `Identified ${mock.customer} and extracted the reported symptom, environment and impact.`,
      occurredAt: new Date(base + 18_000).toISOString(),
    },
  ];

  if (mock.status === "needs-input") {
    events.push({
      id: `${mock.id}-3`,
      schemaVersion: 1,
      caseId: mock.id,
      runId: `${mock.id}-run`,
      sequence: 3,
      type: "input.requested",
      title: "Information required",
      publicSummary: mock.missingInformation.join(" · "),
      occurredAt: new Date(base + 34_000).toISOString(),
    });
  }

  if (mock.status === "ready-for-review") {
    mock.evidence.forEach((item, index) => {
      events.push({
        id: `${mock.id}-${index + 3}`,
        schemaVersion: 1,
        caseId: mock.id,
        runId: `${mock.id}-run`,
        sequence: index + 3,
        type: "finding.added",
        title: item.title,
        publicSummary: item.summary,
        source: item.source,
        evidence: { ...item, id: `${mock.id}-evidence-${index + 1}` },
        occurredAt: new Date(base + 34_000 + index * 12_000).toISOString(),
      });
    });
    events.push({
      id: `${mock.id}-complete`,
      schemaVersion: 1,
      caseId: mock.id,
      runId: `${mock.id}-run`,
      sequence: events.length + 1,
      type: "run.completed",
      title: "Case ready for review",
      publicSummary: "The reconstructed case is ready for human validation.",
      occurredAt: new Date(base + 70_000).toISOString(),
    });
  }

  return events;
}

export const mockInvestigationSummaries: InvestigationSummary[] =
  activeMocks.map(({ id, title, customer, status, updatedAt, summary }) => ({
    id,
    title,
    customer,
    status,
    updatedAt,
    summary,
  }));

export function getMockInvestigationSnapshot(
  caseId: string,
): InvestigationSnapshot | null {
  const mock = activeMocks.find((item) => item.id === caseId);
  if (!mock) return null;
  const activity = initialActivity(mock);

  return {
    case: {
      id: mock.id,
      title: mock.title,
      status: mock.status,
      ticket: {
        provider: mock.sources.includes("Zendesk") ? "zendesk" : "intercom",
        externalId: mock.sources.includes("Zendesk") ? "ZD-4821" : "INT-2094",
        report: mock.report,
      },
      reconstructed: {
        customer: mock.customer,
        environment: mock.environment,
        impact: mock.impact,
        summary: mock.summary,
        evidence: mock.evidence.map((item, index) => ({
          ...item,
          id: `${mock.id}-evidence-${index + 1}`,
        })),
        hypotheses: [],
        branches: [],
        knowledgeRetrieval: [],
        missingInformation: mock.missingInformation,
        engineeringDraft: mock.engineeringDraft,
      },
      createdAt: new Date(Date.now() - 180_000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    activity,
    lastSequence: activity.at(-1)?.sequence ?? 0,
  };
}

export function getMockSummaries(status?: InvestigationStatus) {
  return status
    ? mockInvestigationSummaries.filter((item) => item.status === status)
    : mockInvestigationSummaries;
}
