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

export default function Home() {
  return (
    <main className="mx-auto min-h-screen bg-background">
      <Header />

      <section className="container relative mx-auto border-r border-l border-[#FFFB2A]/40 border-dotted flex max-w-7xl px-4 pb-20 pt-16 md:px-6 md:pb-28 md:pt-24">
        <div className="max-w-5xl">
          <h2 className="mt-8 max-w-5xl  text-4xl font-light font-urbanist  text-text md:text-7xl">
            Help your support reps handle complex customer cases like your best
            seniors.
          </h2>
          <div className="mt-8 grid max-w-5xl gap-5 text-lg leading-8 text-muted-foreground md:grid-cols-[1.2fr_1fr] md:text-xl">
            <p>
              Weppo helps B2B SaaS support and customer success teams turn
              scattered internal knowledge into clear workflows for handling
              complex customer cases.
            </p>
          </div>
          <div className="mt-10">
            <a
              className="inline-flex rounded-full bg-secondary px-4 py-2 text-xl font-light text-[#FFFB2A] hover:opacity-70 md:text-base"
              href={discoveryCallUrl}
              rel="noreferrer"
              target="_blank"
            >
              Book a 20-minute discovery call
            </a>
          </div>
        </div>
      </section>

      <section
        className="container mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24"
        id="problem"
      >
        <div className="grid gap-10  md:items-start">
          <div>
            <p className="font-urbanist text-lg font-light text-[#FFFB2A]">
              The problem
            </p>
            <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-foreground md:text-6xl">
              Support and CS teams already have the knowledge they need.
            </h2>
            <p className="mt-6 text-xl leading-8 text-muted-foreground">
              It is just scattered.
            </p>
          </div>

          <div>
            <p className="text-lg leading-8 text-muted-foreground">
              The real process for handling complex cases often lives across
              too many places at once.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {knowledgeSources.map((source) => (
                <div
                  className="rounded-[1.5rem] bg-secondary px-5 py-4 text-base text-secondary-foreground"
                  key={source}
                >
                  {source}
                </div>
              ))}
            </div>
            <p className="mt-8 text-lg leading-8 text-muted-foreground">
              As a result, reps lose time, managers get interrupted, and
              decisions become inconsistent from one customer case to another.
            </p>
          </div>
        </div>
      </section>

      <section
        className="container mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24"
        id="symptoms"
      >
        <div className="max-w-3xl">
          <p className="font-urbanist text-sm font-light text-[#FFFB2A]">
            Common symptoms
          </p>
          <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-foreground md:text-6xl">
            Your team may be facing this if
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {symptoms.map((symptom) => (
            <div
              className="rounded-[1.5rem] border border-white/10 bg-secondary px-6 py-5 text-lg leading-7 text-secondary-foreground"
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
            <p className="font-urbanist text-sm font-light text-[#FFFB2A]">
              What Weppo does
            </p>
            <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-foreground md:text-6xl">
              Weppo transforms scattered internal knowledge into clear,
              reusable workflows.
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Instead of forcing reps to search through docs, Slack, or old
              tickets, Weppo helps them understand what to do next.
            </p>
          </div>

          <div className="grid gap-3">
            {workflowSteps.map((step) => (
              <div
                className="rounded-[1.5rem] bg-secondary px-6 py-5 font-urbanist text-2xl leading-tight text-secondary-foreground"
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
          <p className="font-urbanist text-sm font-light text-[#FFFB2A]">
            Use cases
          </p>
          <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-foreground md:text-6xl">
            Built for complex customer situations.
          </h2>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <div
              className="rounded-[1.5rem] bg-secondary px-5 py-4 text-base text-secondary-foreground"
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
            <p className="font-urbanist text-sm font-light text-[#FFFB2A]">
              Built for B2B SaaS teams
            </p>
            <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-foreground md:text-6xl">
              Designed for growing Support and Customer Success teams.
            </h2>
          </div>
          <div>
            <p className="text-lg leading-8 text-muted-foreground">
              Especially teams where:
            </p>
            <div className="mt-8 grid gap-4">
              {teamSignals.map((signal) => (
                <div
                  className="rounded-[1.5rem] border border-white/10 bg-secondary px-6 py-5 text-lg leading-7 text-secondary-foreground"
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
          <p className="font-urbanist text-sm font-light text-[#FFFB2A]">
            Why now
          </p>
          <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-foreground md:text-6xl">
            As support and CS teams scale, tribal knowledge becomes expensive.
          </h2>
          <p className="mt-8 text-lg leading-8 text-muted-foreground md:text-xl">
            Every repeated question, unclear escalation, and inconsistent
            decision slows the team down.
          </p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground md:text-xl">
            Weppo helps companies turn internal know-how into workflows that
            humans can use today, and future AI agents can use tomorrow.
          </p>
        </div>
      </section>

    </main>
  );
}
