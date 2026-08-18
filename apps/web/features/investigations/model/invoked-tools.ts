import type { AgentEvent } from "./investigation.types";
import { integrationLogos } from "../../integrations/model/integration.types";

export type InvokedTool = {
  id: string;
  label: string;
  logo?: string;
};

const toolLogos: Record<string, string> = {
  ...integrationLogos,
};

function toolId(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function selectInvokedTools(events: AgentEvent[]): InvokedTool[] {
  const tools = new Map<string, InvokedTool>();

  for (const event of events) {
    const isToolActivity =
      event.type === "tool.started" || event.type === "finding.added";
    const label = event.source?.trim();
    if (!isToolActivity || !label) continue;

    const id = toolId(label);
    if (!tools.has(id)) {
      tools.set(id, {
        id,
        label,
        logo: toolLogos[id],
      });
    }
  }

  return [...tools.values()];
}
