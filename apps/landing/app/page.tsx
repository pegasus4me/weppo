import { Header } from "@/app/components/header";

const discoveryCallUrl = "https://cal.com/safoan/30min";

const knowledgeSources = [
  "Slack messages",
  "Old support tickets",
  "Internal docs",
  "Notion or Confluence",
  "CRM notes",
  "Product and Engineering conversations",
  "Senior teammates' experience",
];

const symptoms = [
  "Reps keep asking seniors or managers the same questions",
  "Internal docs are outdated or hard to trust",
  "New reps take too long to ramp up",
  "Escalations to Product or Engineering feel messy",
  "Different reps handle similar cases differently",
  "Important context gets buried in Slack or old tickets",
  "Support, CS, Product, and Engineering are not always aligned on what to do",
];

const workflowSteps = [
  "What the issue is",
  "What context matters",
  "What steps to follow",
  "When to escalate",
  "Who should be involved",
  "What a good resolution looks like",
];

const useCases = [
  "Billing disputes",
  "Refund requests",
  "Cancellation flows",
  "Technical escalations",
  "Onboarding blockers",
  "Enterprise customer issues",
  "Product-related questions",
  "CS to Support handoffs",
  "Support to Engineering escalations",
];

const teamSignals = [
  "Customer cases are becoming more complex",
  "The team is scaling beyond a few senior people",
  "Processes are changing faster than documentation",
  "Too much operational knowledge lives in people's heads",
  "Support, CS, Product, and Engineering need better alignment",
];

function YellowPixelEdge({ flipped = false }: { flipped?: boolean }) {
  return (
    <div className="relative z-10 -mb-px aspect-[1440/336] w-full">
      <svg
        className={`h-auto w-full text-[#FFFB2A] ${flipped ? "rotate-180" : ""}`}
        fill="none"
        height="336"
        viewBox="0 0 1440 336"
        width="1440"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M90 84H45V126H90V84Z" fill="currentColor" />
        <path d="M90 42V0H0V84H45V42H90Z" fill="currentColor" />
        <path d="M135 42H90V84H135V42Z" fill="currentColor" />
        <path
          d="M1350 0V42H1215V84H1170V126H1260V168H1170V126H1125V168H1080V126H1125V84H1035V126H360V84H225V42H180V84H135V126H90V168H45V126H0V336H1440V0H1350ZM1305 84H1350V126H1305V84ZM270 126V168H180V126H270Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto min-h-screen bg-background">
      <Header />

      <section className="relative">
        <div className="container relative mx-auto flex max-w-7xl justify-center px-4 pb-24 pt-16 md:px-6 md:pb-12 md:pt-14">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <h2 className="mt-8 max-w-5xl font-urbanist text-4xl font-light text-text md:text-7xl">
              Help your support reps handle complex customer cases like your
              best seniors.
            </h2>
            <div className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
              <p>
                Weppo helps B2B SaaS support and customer success teams turn
                scattered internal knowledge into clear workflows for handling
                complex customer cases.
              </p>
            </div>
            <div className="mt-10 flex justify-center">
              <a
                className="inline-flex rounded-full bg-secondary px-4 py-2 text-xl font-light text-[#FFFB2A] ring inset-ring-cyan-600 hover:opacity-70 md:text-xl"
                href={discoveryCallUrl}
                rel="noreferrer"
                target="_blank"
              >
                Book a 20-minute discovery call
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative">
        <YellowPixelEdge />

        <div className="relative z-20 bg-[#FFFB2A] text-[#141414]">
          <section
            className="container mx-auto -mt-16 max-w-7xl px-4 pb-16 pt-0 md:-mt-28 md:px-6 md:pb-24 md:pt-0"
            id="problem"
          >
            <div className="grid gap-10 md:items-start ">
              <div>
                <p className="font-urbanist text-lg font-light text-[#141414]/70">
                  The problem
                </p>
                <h2 className="mt-4 font-urbanist text-5xl font-light leading-tight text-[#141414] md:text-6xl">
                  Support and CS teams already have the knowledge they need.
                </h2>
                <p className="mt-6 text-xl leading-8 text-[#141414]/70">
                  It is just scattered.
                </p>
              </div>

              <div>
                <p className="text-lg leading-8 text-[#141414]/70">
                  The real process for handling complex cases often lives across
                  too many places at once.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {knowledgeSources.map((source) => (
                    <div
                      className="rounded-xs bg-[#c4cd0d] px-5 py-4 text-lg text-[#141414]"
                      key={source}
                    >
                      {source}
                    </div>
                  ))}
                </div>
                <p className="mt-8 text-lg leading-8 text-[#141414]/70">
                  As a result, reps lose time, managers get interrupted, and
                  decisions become inconsistent from one customer case to
                  another.
                </p>
              </div>
            </div>
          </section>

          <section
            className="container mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24"
            id="symptoms"
          >
            <div className="max-w-3xl">
              <p className="font-urbanist text-sm font-light text-[#141414]/70">
                Common symptoms
              </p>
              <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-[#141414] md:text-6xl">
                Your team may be facing this if
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {symptoms.map((symptom) => (
                <div
                  className="rounded-xs bg-[#c4cd0d] px-5 py-4 text-lg text-[#141414]"
                  key={symptom}
                >
                  {symptom}
                </div>
              ))}
            </div>
          </section>

          <section
            className="container mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24"
            id="workflow"
          >
            <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:items-start">
              <div>
                <p className="font-urbanist text-sm font-light text-[#141414]/70">
                  What Weppo does
                </p>
                <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-[#141414] md:text-6xl">
                  Weppo transforms scattered internal knowledge into clear,
                  reusable workflows.
                </h2>
                <p className="mt-6 text-lg leading-8 text-[#141414]/70">
                  Instead of forcing reps to search through docs, Slack, or old
                  tickets, Weppo helps them understand what to do next.
                </p>
              </div>

              <div className="grid gap-3">
                {workflowSteps.map((step) => (
                  <div
                    className="rounded-xs bg-[#c4cd0d] px-5 py-4 text-lg text-[#141414]"
                    key={step}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            className="container mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24"
            id="use-cases"
          >
            <div className="max-w-3xl">
              <p className="font-urbanist text-sm font-light text-[#141414]/70">
                Use cases
              </p>
              <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-[#141414] md:text-6xl">
                Built for complex customer situations.
              </h2>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((useCase) => (
                <div
                  className="rounded-xs bg-[#c4cd0d] px-5 py-4 text-lg text-[#141414]"
                  key={useCase}
                >
                  {useCase}
                </div>
              ))}
            </div>
          </section>

          <section className="container mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
            <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
              <div>
                <p className="font-urbanist text-sm font-light text-[#141414]/70">
                  Built for B2B SaaS teams
                </p>
                <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-[#141414] md:text-6xl">
                  Designed for growing Support and Customer Success teams.
                </h2>
              </div>
              <div>
                <p className="text-lg leading-8 text-[#141414]/70">
                  Especially teams where:
                </p>
                <div className="mt-8 grid gap-4">
                  {teamSignals.map((signal) => (
                    <div
                      className="rounded-xs bg-[#c4cd0d] px-5 py-4 text-lg text-[#141414]"
                      key={signal}
                    >
                      {signal}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="container mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
            <div className="max-w-4xl">
              <p className="font-urbanist text-sm font-light text-[#141414]/70">
                Why now
              </p>
              <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-[#141414] md:text-6xl">
                As support and CS teams scale, tribal knowledge becomes
                expensive.
              </h2>
              <p className="mt-8 text-lg leading-8 text-[#141414]/70 md:text-xl">
                Every repeated question, unclear escalation, and inconsistent
                decision slows the team down.
              </p>
              <p className="mt-6 text-lg leading-8 text-[#141414]/70 md:text-xl">
                Weppo helps companies turn internal know-how into workflows that
                humans can use today, and future AI agents can use tomorrow.
              </p>
            </div>
          </section>
        </div>

        <YellowPixelEdge flipped />
      </section>

    </main>
  );
}
