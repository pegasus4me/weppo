import { randomUUID } from "node:crypto";

import type {
  AgentEvent,
  InvestigationCase,
  InvestigationStatus,
} from "./domain.js";
import type { InvestigationRepository } from "./ports.js";

function caseKey(workspaceId: string, caseId: string) {
  return `${workspaceId}:${caseId}`;
}

export class InMemoryInvestigationRepository implements InvestigationRepository {
  private readonly cases = new Map<string, InvestigationCase>();
  private readonly events = new Map<string, AgentEvent[]>();

  async create(investigation: InvestigationCase) {
    this.cases.set(
      caseKey(investigation.workspaceId, investigation.id),
      structuredClone(investigation),
    );
  }

  async get(workspaceId: string, caseId: string) {
    const investigation = this.cases.get(caseKey(workspaceId, caseId));
    return investigation ? structuredClone(investigation) : null;
  }

  async list(workspaceId: string, status?: InvestigationStatus) {
    return [...this.cases.values()]
      .filter(
        (investigation) =>
          investigation.workspaceId === workspaceId &&
          (!status || investigation.status === status),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((investigation) => structuredClone(investigation));
  }

  async findByExternalTicket(
    workspaceId: string,
    provider: InvestigationCase["ticket"]["provider"],
    externalId: string,
  ) {
    const investigation = [...this.cases.values()].find(
      (candidate) =>
        candidate.workspaceId === workspaceId &&
        candidate.ticket.provider === provider &&
        candidate.ticket.externalId === externalId,
    );
    return investigation ? structuredClone(investigation) : null;
  }

  async update(investigation: InvestigationCase) {
    this.cases.set(
      caseKey(investigation.workspaceId, investigation.id),
      structuredClone(investigation),
    );
  }

  async delete(workspaceId: string, caseId: string) {
    const key = caseKey(workspaceId, caseId);
    const deleted = this.cases.delete(key);
    this.events.delete(key);
    return deleted;
  }

  async appendEvent(
    workspaceId: string,
    input: Omit<AgentEvent, "id" | "sequence">,
  ) {
    const key = caseKey(workspaceId, input.caseId);
    const existing = this.events.get(key) ?? [];
    const event: AgentEvent = {
      ...input,
      id: randomUUID(),
      sequence: (existing.at(-1)?.sequence ?? 0) + 1,
    };
    existing.push(event);
    this.events.set(key, existing);
    return structuredClone(event);
  }

  async listEvents(workspaceId: string, caseId: string, afterSequence = 0) {
    return (this.events.get(caseKey(workspaceId, caseId)) ?? [])
      .filter((event) => event.sequence > afterSequence)
      .map((event) => structuredClone(event));
  }
}
