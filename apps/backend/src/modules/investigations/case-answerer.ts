import type { InvestigationCase } from "./domain.js";
import type { InvestigationQuestionAnswerer } from "./ports.js";

function joinedEvidence(investigation: InvestigationCase) {
  return investigation.reconstructed.evidence
    .slice(0, 4)
    .map((evidence) => `${evidence.title}: ${evidence.summary}`)
    .join(" ");
}

export class CaseContextAnswerer implements InvestigationQuestionAnswerer {
  async answer(investigation: InvestigationCase, prompt: string) {
    const diagnosis = investigation.reconstructed.diagnosis;
    const normalizedPrompt = prompt.toLowerCase();

    if (
      normalizedPrompt.includes("customer") ||
      normalizedPrompt.includes("follow-up") ||
      normalizedPrompt.includes("follow up") ||
      normalizedPrompt.includes("reply")
    ) {
      return diagnosis?.drafts.customerReply ??
        `We investigated the reported issue. ${diagnosis?.summary ?? investigation.reconstructed.summary} ${diagnosis?.recommendedNextStep ?? "We will share the next confirmed update as soon as it is available."}`;
    }

    if (
      normalizedPrompt.includes("engineering") ||
      normalizedPrompt.includes("handoff")
    ) {
      return diagnosis?.drafts.engineering ??
        investigation.reconstructed.engineeringDraft ??
        `Issue: ${diagnosis?.headline ?? investigation.title}. Evidence: ${joinedEvidence(investigation) || "No verified evidence is available yet."}`;
    }

    const parts = [
      diagnosis?.headline,
      diagnosis?.summary ?? investigation.reconstructed.summary,
      joinedEvidence(investigation)
        ? `Supporting evidence: ${joinedEvidence(investigation)}`
        : null,
      diagnosis?.recommendedNextStep
        ? `Recommended next step: ${diagnosis.recommendedNextStep}`
        : null,
    ].filter(Boolean);

    return parts.join("\n\n") || "The investigation does not contain enough information to answer that question yet.";
  }
}
