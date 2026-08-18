import type { InvestigationCase } from "../model/investigation.types";

type ReconstructedCaseProps = {
  investigation: InvestigationCase;
};

export function ReconstructedCase({ investigation }: ReconstructedCaseProps) {
  const reconstructed = investigation.reconstructed;
  const branches = reconstructed.branches ?? [];
  const knowledgeRetrieval = reconstructed.knowledgeRetrieval ?? [];
  const ticketScope = reconstructed.ticketScope;
  const intercom = investigation.ticket.intercom;
  const contact = intercom?.contact;
  const contactFacts = contact
    ? [
        ["Email", contact.email],
        ["Phone", contact.phone],
        ["Contact ID", contact.id],
        ["External ID", contact.externalId],
        ["Role", contact.role],
        ["Workspace", contact.workspaceId],
        ["Company", contact.companyIds.join(", ") || intercom?.companyId],
        ["Channel", intercom?.channel],
        ["Browser", [contact.browser, contact.browserVersion].filter(Boolean).join(" ")],
        ["OS", contact.os],
        ["Language", contact.language],
        ["Location", contact.location],
        ["Ticket state", intercom?.ticketState],
        ["Ticket type", intercom?.ticketType],
      ].filter(([, value]) => Boolean(value))
    : [];

  const evidenceSourceLabel = (source: string) => {
    if (source.startsWith("Sentry")) return "View in Sentry";
    if (source === "Notion") return "View in Notion";
    return "View source";
  };
  const handoffStatus = branches.some((branch) => branch.status === "blocked")
    ? "Root cause not yet confirmed"
    : branches.length
      ? "Evidence ready for review"
      : "Investigation in progress";
  const nextSteps = branches.flatMap((branch) =>
    branch.nextStep ? [{ branch: branch.label, ...branch.nextStep }] : [],
  );

  return (
    <section
      className="flex min-h-0 flex-col bg-white"
      aria-labelledby="reconstructed-heading"
    >
      <div className="flex h-14 shrink-0 items-center border-b border-border/20 px-5 sm:px-6">
        <h2
          id="reconstructed-heading"
          className="text-sm font-medium text-foreground"
        >
          Reconstructed case
        </h2>
      </div>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-6 sm:px-6 lg:px-8">
        <section>
          <p className="text-xs font-medium text-text-tertiary">Original report</p>
          <blockquote className="mt-3 border-l-2 border-border/30 pl-4 text-sm leading-6 text-text-secondary">
            {investigation.ticket.report}
          </blockquote>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-text-tertiary">Customer</p>
            <p className="mt-2 text-sm text-foreground">{reconstructed.customer}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-tertiary">Environment</p>
            <p className="mt-2 text-sm text-foreground">
              {reconstructed.environment ?? "Not established"}
            </p>
          </div>
        </section>

        {ticketScope?.problems.length ? (
          <section aria-labelledby="ticket-understanding-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p id="ticket-understanding-heading" className="text-xs font-medium text-text-tertiary">
                  Ticket understanding
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  The bounded problem scope used to route every connector search.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-blue-700">
                {ticketScope.problems.length} scoped
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {ticketScope.problems.map((problem) => (
                <article key={problem.id} className="rounded-lg border border-border/25 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{problem.label}</h3>
                      {problem.productArea || problem.action ? (
                        <p className="mt-1 text-sm text-text-secondary">
                          {[problem.productArea, problem.action].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-secondary">
                      {problem.confidence} confidence
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm leading-5 sm:grid-cols-2">
                    {problem.expectedBehavior ? (
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">Expected</dt>
                        <dd className="mt-1 text-text-secondary">{problem.expectedBehavior}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">Observed</dt>
                      <dd className="mt-1 text-text-secondary">{problem.observedBehavior}</dd>
                    </div>
                  </dl>
                  <details className="mt-3 text-xs text-text-secondary">
                    <summary className="cursor-pointer select-none font-mono hover:text-foreground">
                      Scope signals and ticket evidence
                    </summary>
                    <div className="mt-2 grid gap-3 border-l border-border/25 pl-3 sm:grid-cols-2">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">Search signals</p>
                        <p className="mt-1 font-mono text-[11px] leading-5 text-foreground">{problem.searchSignals.join(" · ")}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">Ticket evidence</p>
                        <p className="mt-1 text-[11px] leading-5 text-foreground">{problem.ticketEvidence.join(" ")}</p>
                      </div>
                    </div>
                  </details>
                </article>
              ))}
            </div>
            {ticketScope.ambiguities.length ? (
              <div className="mt-3 rounded-lg bg-amber-50/65 px-3 py-3 text-sm text-amber-900">
                <p className="font-mono text-[10px] uppercase tracking-wide">Ambiguities retained</p>
                <p className="mt-1 leading-5">{ticketScope.ambiguities.join(" · ")}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {intercom ? (
          <section className="rounded-xl border border-border/25 bg-background/45 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-text-tertiary">
                  Intercom customer context
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Read-only profile and ticket metadata used for investigation.
                </p>
              </div>
              <span className="rounded-full border border-border/25 bg-white px-2 py-1 text-[11px] font-medium text-text-secondary">
                Intercom
              </span>
            </div>

            {contactFacts.length ? (
              <dl className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                {contactFacts.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-[11px] font-medium text-text-tertiary">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words font-mono text-xs text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-text-tertiary">
                Contact profile details are not available for this ticket yet.
              </p>
            )}

            {Object.keys(intercom.attributes).length ||
            Object.keys(contact?.customAttributes ?? {}).length ||
            Object.keys(contact?.activity ?? {}).length ? (
              <details className="mt-4 border-t border-border/20 pt-3 text-xs text-text-secondary">
                <summary className="cursor-pointer select-none font-medium hover:text-foreground">
                  View all Intercom attributes
                </summary>
                <div className="mt-3 space-y-3 font-mono text-[11px] leading-5">
                  {Object.entries(intercom.attributes).map(([key, value]) => (
                    <p key={`ticket-${key}`} className="break-words">
                      <span className="text-text-tertiary">ticket.{key}: </span>
                      {value}
                    </p>
                  ))}
                  {Object.entries(contact?.customAttributes ?? {}).map(([key, value]) => (
                    <p key={`contact-${key}`} className="break-words">
                      <span className="text-text-tertiary">contact.{key}: </span>
                      {value}
                    </p>
                  ))}
                  {Object.entries(contact?.activity ?? {}).map(([key, value]) => (
                    <p key={`activity-${key}`} className="break-words">
                      <span className="text-text-tertiary">activity.{key}: </span>
                      {value}
                    </p>
                  ))}
                </div>
              </details>
            ) : null}
          </section>
        ) : null}

        <section>
          <p className="text-xs font-medium text-text-tertiary">Customer impact</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {reconstructed.impact ?? "Still being assessed."}
          </p>
        </section>

        {branches.length ? (
          <section
            className="rounded-xl border border-border/30 bg-background/[0.38] p-4"
            aria-labelledby="tse-handoff-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">
                  TSE handoff
                </p>
                <h3 id="tse-handoff-heading" className="mt-1 text-sm font-medium text-foreground">
                  {handoffStatus}
                </h3>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-amber-800">
                Review required
              </span>
            </div>

            <div className="mt-4 grid gap-4 text-sm leading-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">
                  Ticket scope
                </p>
                <p className="mt-1 text-text-secondary">
                  {branches.map((branch) => branch.label).join(" · ")}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">
                  Verified evidence
                </p>
                <ul className="mt-1 space-y-1.5 text-text-secondary">
                  {branches.map((branch) => (
                    <li key={branch.id}>
                      <span className="font-medium text-foreground">{branch.label}:</span>{" "}
                      {branch.observation ?? "No verified observation yet."}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">
                  Current assessment
                </p>
                <ul className="mt-1 space-y-1.5 text-text-secondary">
                  {branches.map((branch) => (
                    <li key={branch.id}>
                      <span className="font-medium text-foreground">{branch.label}:</span>{" "}
                      {branch.conclusion ?? "Still being assessed."}
                    </li>
                  ))}
                </ul>
              </div>
              {nextSteps.length ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">
                    Next evidence required
                  </p>
                  <ul className="mt-1 space-y-2 text-text-secondary">
                    {nextSteps.map((step) => (
                      <li key={`${step.branch}-${step.source}`}>
                        <span className="font-medium text-foreground">{step.branch} · {step.source}:</span>{" "}
                        {step.question}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {branches.length ? (
          <section>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium text-text-tertiary">
                Investigation branches
              </p>
              <span className="text-xs text-text-tertiary">
                Each branch stops only at its next evidence boundary
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {branches.map((branch) => (
                <article
                  key={branch.id}
                  className="rounded-lg border border-border/25 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {branch.label}
                    </h3>
                    <span className="rounded-full border border-border/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-secondary">
                      {branch.status.replace("-", " ")}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-3 text-sm leading-5">
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">
                        Question
                      </dt>
                      <dd className="mt-1 text-text-secondary">{branch.question}</dd>
                    </div>
                    {branch.observation ? (
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">
                          Verified observation
                        </dt>
                        <dd className="mt-1 text-text-secondary">{branch.observation}</dd>
                      </div>
                    ) : null}
                    {branch.conclusion ? (
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">
                          Current conclusion
                        </dt>
                        <dd className="mt-1 text-text-secondary">{branch.conclusion}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {branch.nextStep ? (
                    <div className="mt-4 rounded-md border border-amber-200/80 bg-amber-50/60 px-3 py-3">
                      <p className="font-mono text-[10px] uppercase tracking-wide text-amber-900">
                        Next evidence required · {branch.nextStep.availability}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {branch.nextStep.source}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-text-secondary">
                        {branch.nextStep.question}
                      </p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {knowledgeRetrieval.length ? (
          <section>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium text-text-tertiary">
                Knowledge retrieval
              </p>
              <span className="text-xs text-text-tertiary">
                What was actually used in this run
              </span>
            </div>
            <ol className="mt-3 divide-y divide-border/15 rounded-lg border border-border/25">
              {knowledgeRetrieval.map((step, index) => (
                <li key={step.id} className="grid grid-cols-[24px_minmax(0,1fr)_auto] gap-3 px-4 py-3.5">
                  <span className="pt-0.5 font-mono text-[11px] text-text-tertiary">
                    {index + 1}.
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                    <p className="mt-1 text-sm leading-5 text-text-secondary">{step.summary}</p>
                  </div>
                  <span
                    className={`mt-0.5 h-fit rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                      step.status === "completed"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-background text-text-tertiary"
                    }`}
                  >
                    {step.status === "completed" ? "used" : "not connected"}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text-tertiary">
              Verified evidence
            </p>
            <span className="text-xs text-text-tertiary">
              {reconstructed.evidence.length}
            </span>
          </div>
          {reconstructed.evidence.length ? (
            <div className="mt-3 space-y-2.5">
              {reconstructed.evidence.map((item) => {
                const isSentry = item.source.startsWith("Sentry");
                return (
                <article
                  key={item.id}
                  className={`rounded-lg px-4 py-3.5 ${
                    isSentry
                      ? "bg-[#4b2f7a]/[0.025]"
                      : "border-border/25 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-sm font-medium text-foreground">
                      {item.title}
                    </h3>
                    <span className="shrink-0 text-[11px] text-text-tertiary">
                      {item.source}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-text-secondary">
                    {item.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          isSentry
                            ? "text-[#80629a] hover:text-[#59416f]"
                            : "text-text-secondary hover:text-foreground"
                        }`}
                      >
                        {evidenceSourceLabel(item.source)}
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : null}
                    {item.details?.length ? (
                      <details className="text-xs text-text-secondary">
                        <summary className="cursor-pointer select-none font-mono hover:text-foreground">
                          Telemetry details
                        </summary>
                        <dl className="mt-2 grid gap-x-5 gap-y-1.5 border-l border-border/25 pl-3 font-mono text-[11px] leading-5 sm:grid-cols-2">
                          {item.details.map((detail) => (
                            <div key={`${detail.label}-${detail.value}`} className="min-w-0">
                              <dt className="text-text-tertiary">{detail.label}</dt>
                              <dd className="break-words text-foreground">{detail.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    ) : null}
                  </div>
                </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-border/30 px-4 py-6 text-sm text-text-tertiary">
              Evidence will appear here as the agent verifies it.
            </div>
          )}
        </section>

        {reconstructed.hypotheses.length ? (
          <section>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-text-tertiary">
                Leading explanations
              </p>
              <span className="text-xs text-text-tertiary">
                Evidence-based, not confirmed causes
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {reconstructed.hypotheses.map((hypothesis) => (
                <article
                  key={hypothesis.id}
                  className="rounded-lg border border-border/25 px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium leading-5 text-foreground">
                      {hypothesis.statement}
                    </p>
                    <span className="shrink-0 rounded-full border border-border/35 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-secondary">
                      {hypothesis.confidence}
                    </span>
                  </div>
                  {hypothesis.limitations.length ? (
                    <details className="mt-2.5">
                      <summary className="cursor-pointer font-mono text-[11px] text-text-secondary">
                        Evidence boundaries
                      </summary>
                      <ul className="mt-2 space-y-1 font-mono text-[11px] leading-5 text-text-secondary">
                        {hypothesis.limitations.map((limitation) => (
                          <li key={limitation}>{limitation}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {reconstructed.missingInformation.length ? (
          <section
            className="rounded-xl border border-amber-200/80 bg-amber-50/55 p-4"
            aria-labelledby="missing-information-heading"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800"
              >
                ?
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    id="missing-information-heading"
                    className="text-sm font-medium text-foreground"
                  >
                    Information needed
                  </h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                    {reconstructed.missingInformation.length}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-5 text-text-secondary">
                  These details would make the next search more precise.
                </p>
              </div>
            </div>
            <ol className="mt-4 space-y-2.5">
              {reconstructed.missingInformation.map((item, index) => (
                <li
                  key={item}
                  className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 rounded-lg border border-amber-200/70 bg-white/85 px-3 py-3 text-sm leading-5 text-text-secondary"
                >
                  <span className="flex size-[22px] items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-900">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section>
          <p className="text-xs font-medium text-text-tertiary">
            Engineering-ready escalation
          </p>
          <div className="mt-3 rounded-lg border border-border/25 px-4 py-4 text-sm leading-6 text-text-secondary">
            {reconstructed.engineeringDraft ??
              "The draft will be assembled when enough verified context has been collected."}
          </div>
        </section>
      </div>
    </section>
  );
}
