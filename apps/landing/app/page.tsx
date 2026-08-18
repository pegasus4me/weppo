import Image from "next/image";

import { FAQSection } from "./components/faq-section";
import { FinalCloser } from "./components/final-closer";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { SocialProofTrust } from "./components/social-proof-trust";

const discoveryCallUrl = "https://cal.com/safoan/30min";

const heroIntegrations = [
  { name: "Intercom", icon: "/integrations/intercom.svg" },
  { name: "Zendesk", icon: "/integrations/zendesk.svg" },
  { name: "Slack", icon: "/integrations/slack.png" },
  { name: "Datadog", icon: "/integrations/datadog.svg" },
  { name: "Sentry", icon: "/integrations/sentry.svg" },
  { name: "PostgreSQL", icon: "/integrations/postgresql.png" },
  { name: "Linear", icon: "/integrations/linear.svg" },
  { name: "Jira", icon: "/integrations/jira.svg" },
  { name: "Notion", icon: "/integrations/notion.png" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#292929]">
      <Header />
      <div className="mx-auto w-full max-w-[1440px] border-x border-[#9e9e9e]/25 bg-white">
        {/* Hero Section */}
        <section className="flex min-h-[calc(100svh-112px)] flex-col px-5 pb-12 pt-16 sm:px-8 sm:pt-24 lg:px-12 lg:pt-28">
          <div className="max-w-4xl text-left">
            <h1 className="text-balance text-[40px] font-medium leading-[1.06] text-[#292929] sm:text-[52px] lg:text-[60px]">
              Turn vague support tickets into engineering-ready bug reports.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-[1.45] text-[#5d5d5d] sm:text-xl">
              We gather logs, technical context, incident history and
              reproduction steps so Tier 2 can escalate complex issues in
              minutes—not 30–45 minutes.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="text-base font-medium text-[#5d5d5d]">
                Interested?
              </span>
              <a
                href={discoveryCallUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-md bg-[#292929] px-6 text-base font-medium text-white transition-opacity hover:opacity-85"
              >
                Book a call
              </a>
            </div>

            {/* Logos under Book a call */}
            <div className="mt-10 flex flex-col items-start gap-2.5">
              <span className="text-[11px] font-normal tracking-wide text-[#9e9e9e]/70">
                Integrates with
              </span>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                {heroIntegrations.map((tool) => (
                  <div
                    key={tool.name}
                    title={tool.name}
                    className="flex items-center justify-center opacity-85 transition-all hover:opacity-100 hover:scale-110"
                  >
                    <Image
                      src={tool.icon}
                      alt={tool.name}
                      width={32}
                      height={32}
                      className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative -mx-5 mt-12 overflow-hidden border-b border-[#9e9e9e]/25 sm:-mx-8 sm:mt-16 lg:-mx-12">
            <div
              className="absolute inset-0 bg-cover bg-center animate-[hero-gradient-drift_14s_ease-in-out_infinite]"
              style={{ backgroundImage: "url('/hero-ffflux.svg')" }}
            />
            <div className="relative z-10 px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              <Image
                src="/hero-preview.png"
                alt="Weppo investigation workspace"
                width={3600}
                height={2080}
                priority
                quality={100}
                unoptimized
                className="h-auto w-full border border-[#9e9e9e]/40 bg-white"
              />
            </div>
          </div>
        </section>

        {/* 1. Social Proof & Trust (Credibility + Data & Stats) */}
        <SocialProofTrust />

        {/* 2. Objection Handling (FAQ Accordion) */}
        <FAQSection />

        {/* 3. Final Closer (High-Converting CTA Banner) */}
        <FinalCloser />
      </div>

      <Footer />
    </main>
  );
}
