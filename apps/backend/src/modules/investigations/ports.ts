import type {
  AgentEvent,
  AgentRole,
  InvestigationCase,
  InvestigationPlan,
  InvestigationStatus,
  RunnerStep,
} from "./domain.js";

export interface InvestigationRepository {
  create(investigation: InvestigationCase): Promise<void>;
  get(workspaceId: string, caseId: string): Promise<InvestigationCase | null>;
  list(
    workspaceId: string,
    status?: InvestigationStatus,
  ): Promise<InvestigationCase[]>;
  findByExternalTicket(
    workspaceId: string,
    provider: InvestigationCase["ticket"]["provider"],
    externalId: string,
  ): Promise<InvestigationCase | null>;
  update(investigation: InvestigationCase): Promise<void>;
  delete(workspaceId: string, caseId: string): Promise<boolean>;
  appendEvent(
    workspaceId: string,
    event: Omit<AgentEvent, "id" | "sequence">,
  ): Promise<AgentEvent>;
  listEvents(
    workspaceId: string,
    caseId: string,
    afterSequence?: number,
  ): Promise<AgentEvent[]>;
}

export interface InvestigationRunner {
  run(
    investigation: InvestigationCase,
    signal: AbortSignal,
  ): AsyncIterable<RunnerStep>;
}

export interface InvestigationAgent {
  readonly role: AgentRole;
  run(
    investigation: InvestigationCase,
    signal: AbortSignal,
  ): AsyncIterable<RunnerStep>;
}

export type InvestigationOrchestrator = InvestigationRunner;

export interface InvestigationPlanner {
  plan(
    investigation: InvestigationCase,
    signal: AbortSignal,
  ): Promise<InvestigationPlan>;
}

export type AgentEventListener = (event: AgentEvent) => void;

export interface AgentEventSubscription {
  publish(workspaceId: string, event: AgentEvent): void;
  subscribe(
    workspaceId: string,
    caseId: string,
    listener: AgentEventListener,
  ): () => void;
}
