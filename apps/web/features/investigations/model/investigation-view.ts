import type { InvestigationStatus } from "./investigation.types";

export type InvestigationTab = "agent" | "case";

export function isCaseReady(status: InvestigationStatus) {
  return ["ready-for-review", "escalated", "closed"].includes(status);
}

export function initialInvestigationTab(
  status: InvestigationStatus,
): InvestigationTab {
  return isCaseReady(status) ? "case" : "agent";
}
