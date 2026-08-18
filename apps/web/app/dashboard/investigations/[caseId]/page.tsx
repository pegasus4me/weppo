import { InvestigationPageClient } from "@/features/investigations/components/investigation-page-client";
import { getMockInvestigationSnapshot } from "@/features/investigations/data/mock-investigations";

type InvestigationPageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function InvestigationPage({
  params,
}: InvestigationPageProps) {
  const { caseId } = await params;
  const initialSnapshot = getMockInvestigationSnapshot(caseId);

  return (
    <InvestigationPageClient
      caseId={caseId}
      initialSnapshot={initialSnapshot}
      streamMode={initialSnapshot ? "mock" : "sse"}
    />
  );
}
