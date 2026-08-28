import type {
  EvidenceItem,
  InvestigationDiagnosis,
} from "./domain.js";

type DiagnosisInput = Omit<InvestigationDiagnosis, "evidenceIds"> & {
  evidence: EvidenceItem[];
  evidenceIds: string[];
  hasBlockingLimitations?: boolean;
};

export function createInvestigationDiagnosis({
  evidence,
  evidenceIds,
  hasBlockingLimitations = false,
  ...input
}: DiagnosisInput): InvestigationDiagnosis {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const validEvidenceIds = [...new Set(evidenceIds)].filter((id) =>
    evidenceById.has(id),
  );
  const hasVerifiedEvidence = validEvidenceIds.some(
    (id) => evidenceById.get(id)?.verification === "verified",
  );
  const unsupported = !validEvidenceIds.length;
  const confirmedWithoutProof =
    input.verdict === "confirmed" &&
    (!hasVerifiedEvidence || hasBlockingLimitations);
  const likelyWithoutSupport = input.verdict === "likely" && unsupported;
  const mustBeInconclusive = confirmedWithoutProof || likelyWithoutSupport;

  return {
    ...input,
    verdict: mustBeInconclusive ? "inconclusive" : input.verdict,
    confidence: mustBeInconclusive ? null : input.confidence,
    evidenceIds: validEvidenceIds,
  };
}
