import { DemoInvestigationRunner } from "./demo-runner.js";
import { InMemoryAgentEventSubscription } from "./event-subscription.js";
import { InMemoryInvestigationRepository } from "./in-memory-repository.js";
import type { IntegrationReadClients } from "../integrations/ports.js";
import {
  IntercomInvestigationRunner,
} from "./intercom-runner.js";
import { OpenAIInvestigationPlanner } from "./openai-planner.js";
import { PlanningInvestigationRunner } from "./planning-runner.js";
import { InvestigationService } from "./service.js";
import { SupervisorInvestigationRunner } from "./supervisor-runner.js";

type InvestigationModuleOptions = {
  openAI?: {
    apiKey: string;
    model: string;
  };
  readClients?: IntegrationReadClients;
};

export function createInvestigationModule(
  options: InvestigationModuleOptions = {},
) {
  const repository = new InMemoryInvestigationRepository();
  const subscriptions = new InMemoryAgentEventSubscription();
  const planningRunner = options.openAI
    ? new PlanningInvestigationRunner(
        new OpenAIInvestigationPlanner(options.openAI),
      )
    : null;
  const intercomRunner = options.readClients
    ? new IntercomInvestigationRunner(options.readClients)
    : null;
  const runner = planningRunner || intercomRunner
    ? new SupervisorInvestigationRunner(
        planningRunner
          ? { role: "case", run: planningRunner.run.bind(planningRunner) }
          : null,
        intercomRunner
          ? [
              {
                role: "observability",
                run: intercomRunner.run.bind(intercomRunner),
              },
            ]
          : [],
      )
    : new DemoInvestigationRunner();
  const service = new InvestigationService(repository, runner, subscriptions);

  return {
    service,
    close: () => service.close(),
  };
}

export type InvestigationModule = ReturnType<typeof createInvestigationModule>;
