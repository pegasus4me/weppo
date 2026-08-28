import Image from "next/image";

import { DiscoveryCallLink } from "./components/discovery-call-link";
import { FAQSection } from "./components/faq-section";
import { FinalCloser } from "./components/final-closer";
import { Footer } from "./components/footer";
import { ProblemSolution } from "./components/problem-solution";
import { SocialProofTrust } from "./components/social-proof-trust";

const discoveryCallUrl = "https://cal.com/safoan/30min";

const heroIntegrations = [
  { name: "Intercom", icon: "/landing-intercom.png" },
  { name: "Zendesk", icon: "/integrations/zendesk.svg" },
  { name: "Slack", icon: "/integrations/slack.png" },
  { name: "Datadog", icon: "/integrations/datadog.svg" },
  { name: "Sentry", icon: "/integrations/sentry.svg" },
  { name: "PostgreSQL", icon: "/integrations/postgresql.png" },
  { name: "Linear", icon: "/integrations/linear.svg" },
  { name: "Jira", icon: "/integrations/jira.svg" },
  { name: "GitHub", icon: "/integrations/github.svg" },
  { name: "Notion", icon: "/integrations/notion.png" },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-white">
      <div className="mx-auto w-full max-w-[1440px] border-x border-dashed border-border bg-card">
        {/* Hero Section */}
        <section className="flex min-h-[calc(100svh-112px)] flex-col px-5 pb-12 pt-10 sm:px-8 sm:pt-12 lg:px-12 lg:pt-14">
          <div className="mx-auto w-full max-w-4xl text-center">
            <h1 className="text-balance text-center text-[40px] font-medium leading-[1.06] text-foreground dark:text-white sm:text-[52px] lg:text-[50px]">
              Your B2B agentic teammate for technical support{" "}
              <span className="hero-gradient-text">investigations</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-center text-lg leading-[1.45] text-text-secondary sm:text-xl">
              Weppo automates the technical investigation behind customer
              support issues, gathering context, checking logs, reproducing
              bugs in a sandbox, and preparing engineering-ready escalations.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <DiscoveryCallLink
                href={discoveryCallUrl}
                className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-base font-medium text-background transition-opacity hover:opacity-85"
              >
                Book a discovery call
              </DiscoveryCallLink>
            </div>

            {/* Logos under Book a discovery call */}
            <div className="mt-10 flex flex-col items-center gap-2.5">
              <span className="text-[11px] font-normal tracking-wide text-text-tertiary/70">
                Integrates with
              </span>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
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

          <div className="relative -mx-5 mt-12 sm:-mx-8 sm:mt-16 lg:-mx-12">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 z-20 w-screen -translate-x-1/2 border-t border-dashed border-border"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-1/2 z-20 w-screen -translate-x-1/2 border-b border-dashed border-border"
            />
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/hero-landscape.png')" }}
            />
            <div className="relative z-10 px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              <Image
                src="/weppo-dark-dashboard.png"
                alt="Weppo investigating a technical support case in dark mode"
                width={3600}
                height={2088}
                priority
                quality={100}
                unoptimized
                sizes="(max-width: 1440px) 100vw, 1344px"
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        {/* The Problem + How It Works */}
        <ProblemSolution />

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
