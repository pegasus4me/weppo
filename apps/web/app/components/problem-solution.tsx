const problemPoints = [
  {
    title: "Engineers get pulled in too early",
    description:
      "A vague ticket lands and someone has to dig through logs, databases, and error trackers just to understand what happened — pulling engineers off building.",
  },
  {
    title: "Tickets wait for investigation",
    description:
      "Until a human finds time to reconstruct the context, the customer waits. And every hour of waiting makes the issue harder to fix.",
  },
  {
    title: "Context gets lost in handoffs",
    description:
      "The person who investigated walks away, or the details live in someone's head. The next person starts from scratch, asking the same questions.",
  },
  {
    title: "Support can't scale without hiring",
    description:
      "The volume grows faster than the team. The only lever left is more headcount — even for work a teammate could handle automatically.",
  },
];

const solutionSteps = [
  {
    number: "01",
    title: "Weppo plugs in",
    description:
      "Connects to your helpdesk, Slack, or Discord. Sees every incoming ticket and message in real-time.",
    detail: "One-time setup. Under 5 minutes.",
  },
  {
    number: "02",
    title: "Weppo triages",
    description:
      "Identifies which tickets are technical and need investigation. Filters the noise so your team doesn't have to.",
    detail: "Automatic. No manual sorting required.",
  },
  {
    number: "03",
    title: "Weppo investigates",
    description:
      "Connects to logs, error tracking, databases, and internal docs. Follows the evidence, correlates events, reconstructs the timeline.",
    detail: "Read-only. Never modifies your data.",
  },
  {
    number: "04",
    title: "Weppo notifies your team",
    description:
      "Engineers and tech support get a complete, sourced case — impact, reproduction steps, root cause hypothesis, and what's still missing.",
    detail: "Your team reviews and owns the resolution.",
  },
];

export function ProblemSolution() {
  return (
    <>
      {/* The Problem */}
      <section className="border-t border-border/25 bg-background px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <h2 className="mt-4 text-balance text-3xl font-medium leading-tight text-foreground sm:text-4xl">
              Your team shouldn&apos;t be the bottleneck on every technical
              issue.
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
              A customer reports a bug. Someone has to triage it, dig through
              logs, and connect the dots — and meanwhile your engineers get
              pulled in too early. That&apos;s not sustainable.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {problemPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-lg border border-border/25 bg-white p-6 shadow-2xs"
              >
                <h3 className="text-base font-semibold text-foreground">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {point.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-primary/40 bg-primary/[0.06] px-5 py-4">
            <p className="text-sm leading-relaxed text-text-secondary">
              <span className="font-medium text-foreground">The result:</span>{" "}
              Your team is constantly reactive. Engineers investigate instead
              of building. Support hires earlier than they should. And
              customers wait.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/25 bg-card px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <h2 className="mt-4 text-balance text-3xl font-medium leading-tight text-foreground sm:text-4xl">
              A teammate that triages, investigates, and notifies.
              Automatically.
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
              Weppo plugs into your existing channels, identifies technical
              issues, investigates across your systems in read-only mode, and
              notifies your team with a complete, sourced case.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4">
            {solutionSteps.map((step) => (
              <div
                key={step.number}
                className="group relative border-t border-border/25 pt-6 pb-8 pr-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 first:border-l-0 first:border-t-0 first:pl-0"
              >
                <span className="text-[11px] font-semibold tracking-widest text-text-tertiary">
                  {step.number}
                </span>
                <h3 className="mt-3 text-[17px] font-medium leading-snug text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-text-secondary">
                  {step.description}
                </p>
                <p className="mt-3 text-xs font-medium text-text-tertiary">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}