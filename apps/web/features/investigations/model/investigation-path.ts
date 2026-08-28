import type { InvestigationStatus } from "./investigation.types";

export const investigationPathEvent = "weppo:investigation-path";

export type InvestigationPathDetail = {
  title: string;
  customer: string;
  provider: string;
  externalId?: string;
  status: InvestigationStatus;
};

let currentInvestigationPath: InvestigationPathDetail | null = null;

export function getPublishedInvestigationPath() {
  return currentInvestigationPath;
}

export function publishInvestigationPath(detail: InvestigationPathDetail | null) {
  currentInvestigationPath = detail;
  window.dispatchEvent(
    new CustomEvent<InvestigationPathDetail | null>(investigationPathEvent, {
      detail,
    }),
  );
}
