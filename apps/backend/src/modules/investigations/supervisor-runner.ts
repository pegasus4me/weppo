import { randomUUID } from "node:crypto";

import type {
  InvestigationCase,
  InvestigationPatch,
  RunnerStep,
} from "./domain.js";
import type {
  InvestigationAgent,
  InvestigationOrchestrator,
} from "./ports.js";

async function* mergeAgents(
  agents: InvestigationAgent[],
  investigation: InvestigationCase,
  signal: AbortSignal,
): AsyncIterable<RunnerStep> {
  const iterators = agents.map((agent) => agent.run(investigation, signal)[Symbol.asyncIterator]());
  const pending = iterators.map((iterator, index) =>
    iterator.next().then((result) => ({ index, result })),
  );
  let active = iterators.length;

  while (active > 0) {
    const completed = await Promise.race(pending);
    if (completed.result.done) {
      pending[completed.index] = new Promise(() => undefined);
      active -= 1;
      continue;
    }

    const agent = agents[completed.index];
    if (agent) {
      yield {
        ...completed.result.value,
        agentRole: completed.result.value.agentRole ?? agent.role,
      };
    }
    pending[completed.index] = iterators[completed.index]!
      .next()
      .then((result) => ({ index: completed.index, result }));
  }
}

function applyPlanningPatch(
  investigation: InvestigationCase,
  patch: InvestigationPatch | undefined,
): InvestigationCase {
  if (!patch) return investigation;
  return {
    ...investigation,
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
      missingInformation:
        patch.missingInformation ?? investigation.reconstructed.missingInformation,
    },
  };
}

export class SupervisorInvestigationRunner implements InvestigationOrchestrator {
  constructor(
    private readonly planningAgent: InvestigationAgent | null,
    private readonly specialistAgents: InvestigationAgent[],
  ) {}

  async *run(
    investigation: InvestigationCase,
    signal: AbortSignal,
  ): AsyncIterable<RunnerStep> {
    yield {
      delayMs: 0,
      agentRole: "supervisor",
      taskId: `supervisor-${investigation.id}`,
      event: {
        type: "run.started",
        title: "Investigation started",
        publicSummary: "Weppo assigned the case to specialist investigators.",
      },
    };

    let scopedInvestigation = investigation;
    if (this.planningAgent) {
      for await (const step of this.planningAgent.run(investigation, signal)) {
        if (step.event.type === "run.started") continue;
        scopedInvestigation = applyPlanningPatch(scopedInvestigation, step.patch);
        yield {
          ...step,
          agentRole: this.planningAgent.role,
          taskId: `${this.planningAgent.role}-${investigation.id}`,
        };
        // Missing information is a signal to reduce confidence, not a reason to
        // skip read-only evidence gathering from the connected specialists.
      }
    }

    for await (const step of mergeAgents(
      this.specialistAgents,
      scopedInvestigation,
      signal,
    )) {
      if (["run.started", "ticket.parsed", "plan.created"].includes(step.event.type)) {
        continue;
      }
      yield {
        ...step,
        taskId: step.taskId ?? `${step.agentRole ?? "agent"}-${randomUUID()}`,
      };
    }
  }
}
