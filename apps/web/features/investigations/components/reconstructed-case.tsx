"use client";

import { useState } from "react";

import type {
  InvestigationCase,
  InvestigationDiagnosis,
} from "../model/investigation.types";
import { CaseAgentPrompt } from "./case-agent-prompt";

type ReconstructedCaseProps = {
  investigation: InvestigationCase;
  showHeader?: boolean;
  onFollowUp?: (prompt: string) => Promise<string>;
  isSendingFollowUp?: boolean;
  followUpError?: string | null;
};

const verdictLabels: Record<InvestigationDiagnosis["verdict"], string> = {
  confirmed: "Confirmed cause",
  likely: "Likely cause",
  inconclusive: "Inconclusive",
};

const verdictStyles: Record<InvestigationDiagnosis["verdict"], string> = {
  confirmed: "bg-[#eaf4ef] text-[#28745f] dark:bg-emerald-950/60 dark:text-emerald-300",
  likely: "bg-[#f8eee8] text-[#9a5b39] dark:bg-amber-950/60 dark:text-amber-300",
  inconclusive: "bg-secondary text-text-secondary",
};

function confidenceLabel(confidence: InvestigationDiagnosis["confidence"]) {
  return confidence ? `${confidence[0]?.toUpperCase()}${confidence.slice(1)} confidence` : null;
}

export function ReconstructedCase({
  investigation,
  showHeader = true,
  onFollowUp,
  isSendingFollowUp = false,
  followUpError = null,
}: ReconstructedCaseProps) {
  const [copied, setCopied] = useState<"engineering" | "customer" | null>(null);
  const [copyError, setCopyError] = useState(false);
  const reconstructed = investigation.reconstructed;
  const diagnosis = reconstructed.diagnosis;
  const diagnosisEvidence = diagnosis
    ? diagnosis.evidenceIds.flatMap((id) => {
        const item = reconstructed.evidence.find((evidence) => evidence.id === id);
        return item ? [item] : [];
      })
    : [];

  const copyDraft = async (
    kind: "engineering" | "customer",
    value: string,
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyError(false);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1_800);
    } catch {
      setCopied(null);
      setCopyError(true);
    }
  };

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-card"
      aria-labelledby={showHeader ? "reconstructed-heading" : undefined}
      aria-label={showHeader ? undefined : "Case details"}
    >
      {showHeader ? (
        <div className="flex h-14 shrink-0 items-center border-b border-border/20 px-5 sm:px-6">
          <h2 id="reconstructed-heading" className="text-sm font-medium text-foreground">
            Case details
          </h2>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-7 lg:px-10">
        <div className="mx-auto w-full max-w-4xl">
          {diagnosis ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${verdictStyles[diagnosis.verdict]}`}>
                    {verdictLabels[diagnosis.verdict]}
                  </span>
                  {confidenceLabel(diagnosis.confidence) ? (
                    <span className="text-xs text-text-tertiary">
                      {confidenceLabel(diagnosis.confidence)}
                    </span>
                  ) : null}
                </div>
                {onFollowUp ? (
                  <CaseAgentPrompt
                    caseReference={investigation.ticket.externalId ?? investigation.id}
                    onSubmit={onFollowUp}
                    isSending={isSendingFollowUp}
                    error={followUpError}
                  />
                ) : null}
              </div>
              <h1 className="mt-4 text-2xl font-medium leading-tight text-foreground">
                {diagnosis.headline}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
                {diagnosis.summary}
              </p>

              <div className="mt-8 grid border-y border-border/25 sm:grid-cols-2">
                <section className="py-5 sm:pr-6">
                  <h2 className="text-xs font-medium text-text-tertiary">Impact</h2>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {diagnosis.impact ?? "Impact has not been established."}
                  </p>
                </section>
                <section className="border-t border-border/25 py-5 sm:border-l sm:border-t-0 sm:pl-6">
                  <h2 className="text-xs font-medium text-text-tertiary">Recommended next step</h2>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {diagnosis.recommendedNextStep ?? "Review the collected evidence before taking action."}
                  </p>
                </section>
              </div>

              <section className="mt-8" aria-labelledby="diagnosis-evidence-heading">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="diagnosis-evidence-heading" className="text-sm font-medium text-foreground">
                    Supporting evidence
                  </h2>
                  <span className="text-xs tabular-nums text-text-tertiary">
                    {diagnosisEvidence.length}
                  </span>
                </div>
                {diagnosisEvidence.length ? (
                  <div className="mt-3 divide-y divide-border/20 border-y border-border/20">
                    {diagnosisEvidence.map((evidence) => (
                      <article key={evidence.id} className="py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-medium text-foreground">{evidence.title}</h3>
                          <span className="text-[11px] text-text-tertiary">{evidence.source}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-text-secondary">{evidence.summary}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-text-tertiary">
                    No linked evidence is available in this snapshot.
                  </p>
                )}
              </section>

              {diagnosis.drafts.engineering || diagnosis.drafts.customerReply ? (
                <section className="mt-8 border-t border-border/25 pt-5">
                  <h2 className="text-sm font-medium text-foreground">Prepared drafts</h2>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Copy only. Nothing is published to an external system.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {diagnosis.drafts.engineering ? (
                      <button type="button" onClick={() => void copyDraft("engineering", diagnosis.drafts.engineering!)} className="inline-flex h-[34px] items-center rounded-lg border border-border/35 bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary">
                        {copied === "engineering" ? "Engineering draft copied" : "Copy engineering draft"}
                      </button>
                    ) : null}
                    {diagnosis.drafts.customerReply ? (
                      <button type="button" onClick={() => void copyDraft("customer", diagnosis.drafts.customerReply!)} className="inline-flex h-[34px] items-center rounded-lg border border-border/35 bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary">
                        {copied === "customer" ? "Customer reply copied" : "Copy customer reply"}
                      </button>
                    ) : null}
                  </div>
                  <p className="sr-only" role="status" aria-live="polite">
                    {copyError
                      ? "The draft could not be copied."
                      : copied
                        ? `${copied === "engineering" ? "Engineering" : "Customer reply"} draft copied.`
                        : ""}
                  </p>
                </section>
              ) : null}
            </>
          ) : (
            <div className="py-8">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                  Investigation in progress
                </span>
                {onFollowUp ? (
                  <CaseAgentPrompt
                    caseReference={investigation.ticket.externalId ?? investigation.id}
                    onSubmit={onFollowUp}
                    isSending={isSendingFollowUp}
                    error={followUpError}
                  />
                ) : null}
              </div>
              <h1 className="mt-4 text-2xl font-medium text-foreground">
                The diagnosis is still being assembled
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
                Findings and verified evidence will appear here when the agent completes the investigation.
              </p>
            </div>
          )}

          <details className="mt-10 border-t border-border/25 pt-5">
            <summary className="cursor-pointer select-none text-sm font-medium text-foreground">
              Technical details
            </summary>
            <div className="mt-6 space-y-8 text-sm text-text-secondary">
              <section>
                <h2 className="text-xs font-medium text-text-tertiary">Original report</h2>
                <blockquote className="mt-2 border-l-2 border-border/30 pl-4 leading-6">
                  {investigation.ticket.report}
                </blockquote>
              </section>

              <section className="grid gap-5 sm:grid-cols-3">
                <div><h2 className="text-xs font-medium text-text-tertiary">Customer</h2><p className="mt-2 text-foreground">{reconstructed.customer}</p></div>
                <div><h2 className="text-xs font-medium text-text-tertiary">Environment</h2><p className="mt-2 text-foreground">{reconstructed.environment ?? "Not established"}</p></div>
                <div><h2 className="text-xs font-medium text-text-tertiary">Evidence collected</h2><p className="mt-2 text-foreground">{reconstructed.evidence.length}</p></div>
              </section>

              {reconstructed.ticketScope?.problems.length ? (
                <section>
                  <h2 className="text-xs font-medium text-text-tertiary">Ticket scope</h2>
                  <ul className="mt-3 divide-y divide-border/20 border-y border-border/20">
                    {reconstructed.ticketScope.problems.map((problem) => (
                      <li key={problem.id} className="py-3">
                        <p className="font-medium text-foreground">{problem.label}</p>
                        <p className="mt-1 leading-6">{problem.observedBehavior}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {reconstructed.hypotheses.length ? (
                <section>
                  <h2 className="text-xs font-medium text-text-tertiary">Hypotheses</h2>
                  <ul className="mt-3 space-y-3">
                    {reconstructed.hypotheses.map((hypothesis) => (
                      <li key={hypothesis.id} className="border-l-2 border-border/30 pl-3">
                        <p className="text-foreground">{hypothesis.statement}</p>
                        <p className="mt-1 text-xs">{hypothesis.confidence} confidence · {hypothesis.limitations.join(" · ")}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {reconstructed.branches.length ? (
                <section>
                  <h2 className="text-xs font-medium text-text-tertiary">Investigation branches</h2>
                  <div className="mt-3 divide-y divide-border/20 border-y border-border/20">
                    {reconstructed.branches.map((branch) => (
                      <div key={branch.id} className="py-3">
                        <div className="flex justify-between gap-3"><p className="font-medium text-foreground">{branch.label}</p><span className="text-xs text-text-tertiary">{branch.status}</span></div>
                        <p className="mt-1 leading-6">{branch.conclusion ?? branch.observation ?? branch.question}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {reconstructed.missingInformation.length ? (
                <section>
                  <h2 className="text-xs font-medium text-[#9a5b39] dark:text-amber-300">Information needed</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {reconstructed.missingInformation.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
