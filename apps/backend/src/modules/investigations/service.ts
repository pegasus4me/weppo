import { randomUUID } from "node:crypto";

import type {
  AgentEvent,
  CreateInvestigationInput,
  InvestigationActor,
  InvestigationCase,
  InvestigationPatch,
  InvestigationSnapshot,
  InvestigationStatus,
  RequestFollowUpInput,
} from "./domain.js";
import type {
  AgentEventListener,
  AgentEventSubscription,
  InvestigationRepository,
  InvestigationRunner,
} from "./ports.js";

function applyPatch(
  investigation: InvestigationCase,
  patch: InvestigationPatch,
): InvestigationCase {
  return {
    ...investigation,
    status: patch.status ?? investigation.status,
    reconstructed: {
      ...investigation.reconstructed,
      summary: patch.summary ?? investigation.reconstructed.summary,
      environment:
        patch.environment === undefined
          ? investigation.reconstructed.environment
          : patch.environment,
      impact:
        patch.impact === undefined
          ? investigation.reconstructed.impact
          : patch.impact,
      ticketScope:
        patch.ticketScope === undefined
          ? investigation.reconstructed.ticketScope
          : patch.ticketScope,
      evidence: patch.evidence
        ? [...investigation.reconstructed.evidence, patch.evidence]
        : investigation.reconstructed.evidence,
      hypotheses:
        patch.hypotheses === undefined
          ? investigation.reconstructed.hypotheses
          : patch.hypotheses,
      branches:
        patch.branches === undefined
          ? investigation.reconstructed.branches
          : patch.branches,
      knowledgeRetrieval:
        patch.knowledgeRetrieval === undefined
          ? investigation.reconstructed.knowledgeRetrieval
          : patch.knowledgeRetrieval,
      missingInformation:
        patch.missingInformation ??
        investigation.reconstructed.missingInformation,
      engineeringDraft:
        patch.engineeringDraft === undefined
          ? investigation.reconstructed.engineeringDraft
          : patch.engineeringDraft,
    },
    updatedAt: new Date().toISOString(),
  };
}

export class InvestigationService {
  private readonly activeRuns = new Map<string, AbortController>();

  constructor(
    private readonly repository: InvestigationRepository,
    private readonly runner: InvestigationRunner,
    private readonly subscriptions: AgentEventSubscription,
  ) {}

  list(actor: InvestigationActor, status?: InvestigationStatus) {
    return this.repository.list(actor.workspaceId, status);
  }

  findByExternalTicket(
    actor: InvestigationActor,
    provider: InvestigationCase["ticket"]["provider"],
    externalId: string,
  ) {
    return this.repository.findByExternalTicket(
      actor.workspaceId,
      provider,
      externalId,
    );
  }

  async get(
    actor: InvestigationActor,
    caseId: string,
  ): Promise<InvestigationSnapshot | null> {
    const investigation = await this.repository.get(actor.workspaceId, caseId);
    if (!investigation) return null;
    const activity = await this.repository.listEvents(
      actor.workspaceId,
      caseId,
    );
    return {
      case: investigation,
      activity,
      lastSequence: activity.at(-1)?.sequence ?? 0,
    };
  }

  async createAndStart(
    actor: InvestigationActor,
    input: CreateInvestigationInput,
  ) {
    const now = new Date().toISOString();
    const investigation: InvestigationCase = {
      id: randomUUID(),
      workspaceId: actor.workspaceId,
      title: input.title?.trim() || input.report.trim().slice(0, 72),
      status: "queued",
      ticket: {
        provider: input.ticket?.provider ?? "manual",
        externalId: input.ticket?.externalId,
        url: input.ticket?.url,
        customerEmail: input.ticket?.customerEmail,
        occurredAt: input.ticket?.occurredAt,
        intercom: input.ticket?.intercom,
        report: input.report.trim(),
      },
      reconstructed: {
        customer: input.customer.trim(),
        environment: null,
        impact: null,
        summary: input.report.trim(),
        ticketScope: null,
        evidence: [],
        hypotheses: [],
        branches: [],
        knowledgeRetrieval: [],
        missingInformation: [],
        engineeringDraft: null,
      },
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.create(investigation);
    const runId = await this.start(actor, investigation.id);
    return { investigation, runId };
  }

  async refreshAndStart(
    actor: InvestigationActor,
    caseId: string,
    input: CreateInvestigationInput,
  ) {
    const existing = await this.repository.get(actor.workspaceId, caseId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const refreshed: InvestigationCase = {
      ...existing,
      title: input.title?.trim() || input.report.trim().slice(0, 72),
      status: "queued",
      ticket: {
        provider: input.ticket?.provider ?? existing.ticket.provider,
        externalId: input.ticket?.externalId,
        url: input.ticket?.url,
        customerEmail: input.ticket?.customerEmail,
        occurredAt: input.ticket?.occurredAt,
        intercom: input.ticket?.intercom,
        report: input.report.trim(),
      },
      reconstructed: {
        customer: input.customer.trim(),
        environment: null,
        impact: null,
        summary: input.report.trim(),
        ticketScope: null,
        evidence: [],
        hypotheses: [],
        branches: [],
        knowledgeRetrieval: [],
        missingInformation: [],
        engineeringDraft: null,
      },
      updatedAt: now,
    };
    await this.repository.update(refreshed);
    const runId = await this.start(actor, caseId);
    return { investigation: refreshed, runId };
  }

  async start(actor: InvestigationActor, caseId: string) {
    const key = `${actor.workspaceId}:${caseId}`;
    if (this.activeRuns.has(key)) return null;

    const investigation = await this.repository.get(actor.workspaceId, caseId);
    if (!investigation) return null;

    const runId = randomUUID();
    const controller = new AbortController();
    this.activeRuns.set(key, controller);
    await this.repository.update(
      applyPatch(investigation, { status: "investigating" }),
    );
    void this.execute(actor.workspaceId, caseId, runId, controller).catch(
      () => {
        // The failure is represented as a public run.failed event by execute().
      },
    );
    return runId;
  }

  async delete(actor: InvestigationActor, caseId: string) {
    const key = `${actor.workspaceId}:${caseId}`;
    this.activeRuns.get(key)?.abort();
    this.activeRuns.delete(key);
    return this.repository.delete(actor.workspaceId, caseId);
  }

  events(actor: InvestigationActor, caseId: string, afterSequence = 0) {
    return this.repository.listEvents(actor.workspaceId, caseId, afterSequence);
  }

  async requestFollowUp(
    actor: InvestigationActor,
    caseId: string,
    input: RequestFollowUpInput,
  ): Promise<AgentEvent | null> {
    const investigation = await this.repository.get(actor.workspaceId, caseId);
    if (!investigation) return null;

    const event = await this.repository.appendEvent(actor.workspaceId, {
      schemaVersion: 1,
      caseId,
      runId: randomUUID(),
      type: "follow_up.requested",
      title: "Follow-up requested",
      publicSummary: input.prompt.trim(),
      occurredAt: new Date().toISOString(),
    });
    this.subscriptions.publish(actor.workspaceId, event);
    return event;
  }

  subscribe(
    actor: InvestigationActor,
    caseId: string,
    listener: AgentEventListener,
  ) {
    return this.subscriptions.subscribe(actor.workspaceId, caseId, listener);
  }

  close() {
    this.activeRuns.forEach((controller) => controller.abort());
    this.activeRuns.clear();
  }

  private async execute(
    workspaceId: string,
    caseId: string,
    runId: string,
    controller: AbortController,
  ) {
    const key = `${workspaceId}:${caseId}`;

    try {
      const initial = await this.repository.get(workspaceId, caseId);
      if (!initial) return;

      for await (const step of this.runner.run(initial, controller.signal)) {
        const current = await this.repository.get(workspaceId, caseId);
        if (!current) return;
        const event = await this.repository.appendEvent(workspaceId, {
          ...step.event,
          agentRole: step.agentRole ?? step.event.agentRole,
          taskId: step.taskId ?? step.event.taskId,
          casePatch: step.patch,
          schemaVersion: 1,
          caseId,
          runId,
          occurredAt: new Date().toISOString(),
        });
        if (step.patch || step.event.evidence) {
          await this.repository.update(
            applyPatch(current, {
              ...step.patch,
              evidence: step.event.evidence,
            }),
          );
        }
        this.subscriptions.publish(workspaceId, event);
      }
    } catch {
      if (controller.signal.aborted) return;
      const current = await this.repository.get(workspaceId, caseId);
      if (current) {
        await this.repository.update(applyPatch(current, { status: "failed" }));
        const event: AgentEvent = await this.repository.appendEvent(
          workspaceId,
          {
            schemaVersion: 1,
            caseId,
            runId,
            type: "run.failed",
            title: "Investigation failed",
            publicSummary:
              "The investigation agent could not complete this run. Retry the case or contact a workspace administrator.",
            occurredAt: new Date().toISOString(),
          },
        );
        this.subscriptions.publish(workspaceId, event);
      }
    } finally {
      this.activeRuns.delete(key);
    }
  }
}
