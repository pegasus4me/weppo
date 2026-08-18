export type InvestigationStatus =
  | "queued"
  | "investigating"
  | "needs-input"
  | "ready-for-review"
  | "failed"
  | "escalated"
  | "closed";

export type EvidenceItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceReference?: string;
  sourceUrl?: string;
  details?: Array<{
    label: string;
    value: string;
  }>;
  observedAt?: string;
  verification: "verified" | "reported" | "hypothesis";
};

export type TicketProblemScope = {
  id: string;
  label: string;
  productArea: string | null;
  action: string | null;
  expectedBehavior: string | null;
  observedBehavior: string;
  searchSignals: string[];
  identifiers: string[];
  ticketEvidence: string[];
  confidence: "low" | "medium" | "high";
};

export type TicketScope = {
  problems: TicketProblemScope[];
  ambiguities: string[];
};

export type KnowledgeRetrievalStep = {
  id:
    | "exact-structured"
    | "hybrid-search"
    | "targeted-reading"
    | "case-graph"
    | "rag-complement";
  label: string;
  status: "completed" | "unavailable";
  summary: string;
};

export type Hypothesis = {
  id: string;
  statement: string;
  confidence: "low" | "medium" | "high";
  supportingEvidenceIds: string[];
  limitations: string[];
};

export type InvestigationBranch = {
  id: string;
  label: string;
  status: "investigating" | "evidence-collected" | "blocked" | "needs-input";
  question: string;
  observation: string | null;
  conclusion: string | null;
  evidenceIds: string[];
  nextStep: {
    source: string;
    question: string;
    availability: "available" | "unavailable";
  } | null;
  limitations: string[];
};

export type AgentEventType =
  | "run.started"
  | "ticket.parsed"
  | "plan.created"
  | "follow_up.requested"
  | "tool.started"
  | "finding.added"
  | "input.requested"
  | "run.completed"
  | "run.failed"
  | "task.started"
  | "task.completed";

export type AgentRole =
  | "case"
  | "observability"
  | "identity"
  | "knowledge"
  | "correlation"
  | "escalation"
  | "supervisor"
  | "demo";

export type InvestigationTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "blocked"
  | "failed";

export type InvestigationPatch = {
  status?: InvestigationStatus;
  summary?: string;
  environment?: string | null;
  impact?: string | null;
  ticketScope?: TicketScope | null;
  evidence?: EvidenceItem;
  hypotheses?: Hypothesis[];
  branches?: InvestigationBranch[];
  knowledgeRetrieval?: KnowledgeRetrievalStep[];
  missingInformation?: string[];
  engineeringDraft?: string | null;
};

export type AgentEvent = {
  id: string;
  schemaVersion: 1;
  caseId: string;
  runId: string;
  sequence: number;
  type: AgentEventType;
  title: string;
  publicSummary: string;
  agentRole?: AgentRole;
  taskId?: string;
  taskStatus?: InvestigationTaskStatus;
  casePatch?: InvestigationPatch;
  source?: string;
  details?: Array<{
    label: string;
    value: string;
  }>;
  plan?: Array<{
    source: string;
    objective: string;
    reason: string;
    access: "read-only";
  }>;
  evidence?: EvidenceItem;
  occurredAt: string;
};

export type InvestigationCase = {
  id: string;
  title: string;
  status: InvestigationStatus;
  ticket: {
    provider: "manual" | "zendesk" | "intercom";
    externalId?: string;
    url?: string;
    report: string;
    customerEmail?: string;
    occurredAt?: string;
    intercom?: {
      ticketId?: string;
      inboxTicketId?: string;
      ticketState?: string;
      ticketType?: string;
      companyId?: string;
      channel?: string;
      contactIds: string[];
      contactExternalIds: string[];
      attributes: Record<string, string>;
      contact?: {
        id?: string;
        externalId?: string;
        email?: string;
        phone?: string;
        name?: string;
        role?: string;
        workspaceId?: string;
        companyIds: string[];
        browser?: string;
        browserVersion?: string;
        os?: string;
        language?: string;
        location?: string;
        customAttributes: Record<string, string>;
        activity: Record<string, string>;
      };
    };
  };
  reconstructed: {
    customer: string;
    environment: string | null;
    impact: string | null;
    summary: string;
    ticketScope?: TicketScope | null;
    evidence: EvidenceItem[];
    hypotheses: Hypothesis[];
    branches: InvestigationBranch[];
    knowledgeRetrieval: KnowledgeRetrievalStep[];
    missingInformation: string[];
    engineeringDraft: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type InvestigationSnapshot = {
  case: InvestigationCase;
  activity: AgentEvent[];
  lastSequence: number;
};

export type ConnectionState =
  | "connecting"
  | "live"
  | "reconnecting"
  | "offline"
  | "closed";

export type InvestigationSummary = {
  id: string;
  title: string;
  customer: string;
  status: InvestigationStatus;
  updatedAt: string;
  summary: string;
};

export const statusLabels: Record<InvestigationStatus, string> = {
  queued: "Queued",
  investigating: "Investigating",
  "needs-input": "Needs input",
  "ready-for-review": "Ready for review",
  failed: "Failed",
  escalated: "Escalated",
  closed: "Closed",
};
