import { Header } from "@/app/components/header";
import Image from "next/image";
import heroPreview from "@/public/hero-preview.png";

const discoveryCallUrl = "https://cal.com/safoan/30min";

const knowledgeSources = [
  "Slack",
  "Support tickets",
  "Wikis and docs",
  "Internal tools",
];

const knowledgeProblems = [
  "Important context is scattered across tools",
  "Documentation falls behind product and policy changes",
  "Conflicting answers make the right source hard to trust",
  "Critical knowledge stays trapped in people’s heads",
];

const contextLayerSteps = [
  {
    number: "01",
    title: "Connect",
    description:
      "Bring together the sources your company already relies on—from Slack and tickets to wikis and internal tools.",
  },
  {
    number: "02",
    title: "Structure",
    description:
      "Turn fragmented conversations and documents into clear, usable company knowledge for your AI support agents.",
  },
  {
    number: "03",
    title: "Maintain",
    description:
      "Keep that context current as products, policies, processes, and customer questions change.",
  },
];

const outcomes = [
  {
    title: "More accurate",
    description:
      "Agents answer from reliable company context instead of incomplete or outdated fragments.",
  },
  {
    title: "More consistent",
    description:
      "Customers get aligned answers across conversations, channels, and support agents.",
  },
  {
    title: "More company-specific",
    description:
      "Responses reflect how your business, product, policies, and teams actually work.",
  },
];

const audienceSignals = [
  "You already use AI to answer customer questions",
  "Support knowledge is spread across several systems",
  "Your product or processes change faster than your docs",
  "Generic answers are creating risk or extra review work",
  "Support volume is growing faster than the team",
];

function YellowPixelEdge({ flipped = false }: { flipped?: boolean }) {
  return (
    <div className="relative z-10 -mb-px aspect-[1440/336] w-full">
      <svg
        aria-hidden="true"
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
            <p className="mt-8 font-urbanist text-sm font-light uppercase tracking-[0.22em] text-[#FFFB2A]">
              Technical Investigation Workspace
            </p>
            <h1 className="mt-6 max-w-5xl font-urbanist text-4xl font-light leading-[1.08] text-text md:text-7xl">
              Turn vague support tickets into engineering-ready bug reports.
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
              Weppo reconstructs context across logs, databases, and helpdesks
              to build a sourced, verified timeline of facts before your team escalates to Engineering.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="font-urbanist text-base font-light tracking-wide text-muted-foreground">
                Interested?
              </p>
              <a
                className="inline-flex rounded-full bg-secondary px-6 py-3.5 text-lg font-light text-[#FFFB2A] transition-opacity hover:opacity-80 md:text-xl"
                href={discoveryCallUrl}
                rel="noreferrer"
                target="_blank"
              >
                Book a call
              </a>
            </div>

            <div className="mt-14 w-full overflow-hidden border border-[#333333] bg-[#141414]">
              <Image
                src={heroPreview}
                alt="Weppo Investigation Workspace"
                className="h-auto w-full object-contain"
                priority
                quality={100}
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative">
        <YellowPixelEdge />

        <div className="relative z-20 bg-[#FFFB2A] text-[#141414]">
          <section
            className="container mx-auto -mt-16 max-w-7xl px-4 pb-16 pt-0 md:-mt-28 md:px-6 md:pb-24"
            id="problem"
          >
            <div className="grid gap-12 md:grid-cols-[1.05fr_0.95fr] md:items-start">
              <div>
                <p className="font-urbanist text-sm font-light uppercase tracking-[0.18em] text-[#141414]/60">
                  The problem
                </p>
                <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-[#141414] md:text-6xl">
                  AI support is only as reliable as the knowledge behind it.
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-[#141414]/70">
                  When company knowledge is scattered, outdated, or trapped in
                  people’s heads, AI agents miss context and give answers that
                  feel generic, inconsistent, or wrong.
                </p>
              </div>

              <div className="grid gap-3">
                {knowledgeProblems.map((problem) => (
                  <div
                    className="rounded-xs border border-[#141414]/15 bg-[#c4cd0d] px-5 py-4 text-lg text-[#141414]"
                    key={problem}
                  >
                    {problem}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            className="container mx-auto max-w-7xl border-t border-[#141414]/20 px-4 py-16 md:px-6 md:py-24"
            id="context-layer"
          >
            <div className="max-w-4xl">
              <p className="font-urbanist text-sm font-light uppercase tracking-[0.18em] text-[#141414]/60">
                The context layer
              </p>
              <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-[#141414] md:text-6xl">
                One reliable layer between your company knowledge and your AI
                agents.
              </h2>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {knowledgeSources.map((source) => (
                <div
                  className="rounded-xs border border-[#141414]/15 bg-[#c4cd0d] px-5 py-5 text-lg text-[#141414]"
                  key={source}
                >
                  {source}
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {contextLayerSteps.map((step) => (
                <article
                  className="rounded-xs border border-[#141414]/15 bg-[#141414] p-6 text-[#f4f4f4]"
                  key={step.number}
                >
                  <p className="text-sm text-[#FFFB2A]">{step.number}</p>
                  <h3 className="mt-8 font-urbanist text-3xl font-light">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-[#f4f4f4]/65">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            className="container mx-auto max-w-7xl border-t border-[#141414]/20 px-4 py-16 md:px-6 md:py-24"
            id="value"
          >
            <div className="max-w-4xl">
              <p className="font-urbanist text-sm font-light uppercase tracking-[0.18em] text-[#141414]/60">
                The result
              </p>
              <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-[#141414] md:text-6xl">
                Better answers, grounded in how your company actually works.
              </h2>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {outcomes.map((outcome) => (
                <article
                  className="rounded-xs border border-[#141414]/15 bg-[#c4cd0d] p-6"
                  key={outcome.title}
                >
                  <h3 className="font-urbanist text-3xl font-light text-[#141414]">
                    {outcome.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-[#141414]/70">
                    {outcome.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            className="container mx-auto max-w-7xl border-t border-[#141414]/20 px-4 py-16 md:px-6 md:py-24"
            id="who-its-for"
          >
            <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-start">
              <div>
                <p className="font-urbanist text-sm font-light uppercase tracking-[0.18em] text-[#141414]/60">
                  Who it’s for
                </p>
                <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-[#141414] md:text-6xl">
                  Built for fast-growing companies using AI for customer support.
                </h2>
              </div>
              <div className="grid gap-3">
                {audienceSignals.map((signal) => (
                  <div
                    className="rounded-xs border border-[#141414]/15 bg-[#c4cd0d] px-5 py-4 text-lg text-[#141414]"
                    key={signal}
                  >
                    {signal}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            className="container mx-auto max-w-7xl border-t border-[#141414]/20 px-4 py-16 md:px-6 md:py-24"
            id="pricing"
          >
            <div className="grid gap-12 md:grid-cols-[1fr_1fr] md:items-end">
              <div>
                <p className="font-urbanist text-sm font-light uppercase tracking-[0.18em] text-[#141414]/60">
                  Pricing
                </p>
                <h2 className="mt-4 font-urbanist text-4xl font-light leading-tight text-[#141414] md:text-6xl">
                  A SaaS subscription that scales with your support operation.
                </h2>
              </div>
              <div>
                <p className="text-lg leading-8 text-[#141414]/70 md:text-xl">
                  Pricing is based on company size, connected knowledge sources,
                  or support volume. We’ll help you choose the model that best
                  matches your setup.
                </p>
                <a
                  className="mt-8 inline-flex rounded-full bg-[#141414] px-5 py-3 text-lg font-light text-[#FFFB2A] hover:opacity-80"
                  href={discoveryCallUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Talk through your setup
                </a>
              </div>
            </div>
          </section>
        </div>

        <YellowPixelEdge flipped />
      </section>

      <section className="container mx-auto max-w-7xl px-4 pb-24 pt-8 text-center md:px-6 md:pb-32">
        <h2 className="mx-auto max-w-4xl font-urbanist text-4xl font-light leading-tight text-text md:text-6xl">
          Your AI support agents should know your company—not just the internet.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Build a reliable, continuously maintained context layer with Weppo.
        </p>
        <a
          className="mt-10 inline-flex rounded-full bg-secondary px-5 py-3 text-lg font-light text-[#FFFB2A] hover:opacity-70 md:text-xl"
          href={discoveryCallUrl}
          rel="noreferrer"
          target="_blank"
        >
          Book a discovery call
        </a>
      </section>
    </main>
  );
}
