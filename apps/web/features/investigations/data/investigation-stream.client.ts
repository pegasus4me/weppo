import type {
  AgentEvent,
  ConnectionState,
} from "../model/investigation.types";
import { submitInvestigationFollowUp } from "./investigation-api.client";

export type InvestigationStreamOptions = {
  caseId: string;
  afterSequence: number;
  onEvent: (event: AgentEvent) => void;
  onConnectionChange: (state: ConnectionState) => void;
};

export interface InvestigationStream {
  connect(options: InvestigationStreamOptions): () => void;
  sendFollowUp(caseId: string, prompt: string): Promise<void>;
}

export class SseInvestigationStream implements InvestigationStream {
  constructor(
    private readonly apiUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  ) {}

  connect(options: InvestigationStreamOptions) {
    options.onConnectionChange("connecting");
    const query = new URLSearchParams({
      after: String(options.afterSequence),
    });
    const source = new EventSource(
      `${this.apiUrl}/api/v1/investigations/${encodeURIComponent(options.caseId)}/events/stream?${query}`,
      { withCredentials: true },
    );

    source.onopen = () => options.onConnectionChange("live");
    source.addEventListener("agent-event", (message) => {
      try {
        options.onEvent(JSON.parse(message.data) as AgentEvent);
      } catch {
        options.onConnectionChange("reconnecting");
      }
    });
    source.onerror = () => options.onConnectionChange("reconnecting");

    return () => {
      source.close();
      options.onConnectionChange("closed");
    };
  }

  async sendFollowUp(caseId: string, prompt: string) {
    await submitInvestigationFollowUp(caseId, prompt);
  }
}
