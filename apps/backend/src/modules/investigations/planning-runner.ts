import type { InvestigationCase, RunnerStep } from "./domain.js";
import type {
  InvestigationPlanner,
  InvestigationRunner,
} from "./ports.js";

export class PlanningInvestigationRunner implements InvestigationRunner {
  constructor(private readonly planner: InvestigationPlanner) {}

  async *run(
    investigation: InvestigationCase,
    signal: AbortSignal,
  ): AsyncIterable<RunnerStep> {
    yield {
      delayMs: 0,
      event: {
        type: "run.started",
        title: "Investigation started",
        publicSummary: "The agent is analyzing the ticket and known case context.",
      },
    };

    const plan = await this.planner.plan(investigation, signal);

    yield {
      delayMs: 0,
      event: {
        type: "ticket.parsed",
        title: "Ticket understood",
        publicSummary: plan.summary,
      },
      patch: {
        summary: plan.summary,
        environment: plan.environment,
        impact: plan.impact,
        ticketScope: plan.ticketScope,
      },
    };

    yield {
      delayMs: 0,
      event: {
        type: "plan.created",
        title: "Investigation plan created",
        publicSummary: plan.planSummary,
        plan: plan.searchObjectives,
      },
      patch: {
        missingInformation: plan.missingInformation,
      },
    };

    // Gaps are retained on the case, but connected read-only evidence can often
    // resolve them. Only a specialist that is genuinely blocked may request input.
  }
}
