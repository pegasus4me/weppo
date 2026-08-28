import { getMockInvestigationSnapshot } from "@/features/investigations/data/mock-investigations";

import { InboxWorkspace } from "./_components/inbox-workspace";

const inboxCaseIds = [
  "api-requests-returning-401",
  "missing-webhook-events",
  "duplicate-export-records",
  "saml-login-loop",
  "salesforce-sync-failure",
];

export default function DashboardPage() {
  const snapshots = inboxCaseIds.flatMap((caseId) => {
    const snapshot = getMockInvestigationSnapshot(caseId);
    return snapshot ? [snapshot] : [];
  });

  return <InboxWorkspace snapshots={snapshots} />;
}
