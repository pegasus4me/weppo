export const investigationStatuses = [
  "queued",
  "investigating",
  "needs-input",
  "ready-for-review",
  "failed",
  "escalated",
  "closed",
] as const;

export type InvestigationStatus = (typeof investigationStatuses)[number];

export type InvestigationActor = {
  userId: string;
  workspaceId: string;
};

export const agentRoles = [
  "case",
  "observability",
  "identity",
  "knowledge",
  "correlation",
  "escalation",
  "supervisor",
  "demo",
] as const;

export type AgentRole = (typeof agentRoles)[number];

export type InvestigationTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "blocked"
  | "failed";

export type InvestigationTask = {
  id: string;
  role: AgentRole;
  objective: string;
  dependencies: string[];
  status: InvestigationTaskStatus;
};

export type TicketReference = {
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

export type InvestigationBranchStatus =
  | "investigating"
  | "evidence-collected"
  | "blocked"
  | "needs-input";

export type InvestigationBranch = {
  id: string;
  label: string;
  status: InvestigationBranchStatus;
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

export type ReconstructedCase = {
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

export type InvestigationCase = {
  id: string;
  workspaceId: string;
  title: string;
  status: InvestigationStatus;
  ticket: TicketReference;
  reconstructed: ReconstructedCase;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export const agentEventTypes = [
  "run.started",
  "ticket.parsed",
  "plan.created",
  "tool.started",
  "finding.added",
  "input.requested",
  "follow_up.requested",
  "run.completed",
  "run.failed",
  "task.started",
  "task.completed",
] as const;

export type AgentEventType = (typeof agentEventTypes)[number];

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
  plan?: InvestigationSearchObjective[];
  evidence?: EvidenceItem;
  hypotheses?: Hypothesis[];
  branches?: InvestigationBranch[];
  occurredAt: string;
};

export type InvestigationSnapshot = {
  case: InvestigationCase;
  activity: AgentEvent[];
  lastSequence: number;
};

export type CreateInvestigationInput = {
  title?: string;
  customer: string;
  report: string;
  ticket?: Omit<TicketReference, "report">;
};

export const followUpPromptMaxLength = 4_000;

export type RequestFollowUpInput = {
  prompt: string;
};

export type InvestigationSearchObjective = {
  source: string;
  objective: string;
  reason: string;
  access: "read-only";
};

export type InvestigationPlan = {
  summary: string;
  ticketScope: TicketScope;
  environment: string | null;
  impact: string | null;
  planSummary: string;
  searchObjectives: InvestigationSearchObjective[];
  missingInformation: string[];
};

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

export type RunnerStep = {
  delayMs: number;
  event: Pick<
    AgentEvent,
    | "type"
    | "title"
    | "publicSummary"
    | "agentRole"
    | "taskId"
    | "taskStatus"
    | "source"
    | "details"
    | "plan"
  > & {
    evidence?: EvidenceItem;
    hypotheses?: Hypothesis[];
  };
  agentRole?: AgentRole;
  taskId?: string;
  patch?: InvestigationPatch;
};
