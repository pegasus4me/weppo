"use client";

import { useState } from "react";

type FAQItem = {
  question: string;
  answer: string;
};

const faqs: FAQItem[] = [
  {
    question: "How does Weppo work alongside my existing team?",
    answer:
      "Weppo plugs into your helpdesk (Intercom, Zendesk), Slack, or Discord and monitors incoming tickets. When it detects a technical issue that needs investigation, it automatically triages, investigates across your connected systems, and notifies your team with a complete, sourced technical case. Your engineers stay focused on building — they only get pulled in when there's a verified issue with full context.",
  },
  {
    question: "Does Weppo auto-respond to customers?",
    answer:
      "No. Weppo triages and investigates behind the scenes, but it never responds to customers directly. It notifies your team (engineers, tech support) with a complete case — your humans decide what to say and when.",
  },
  {
    question: "Does Weppo have write access to our systems?",
    answer:
      "No. Weppo operates exclusively with strict read-only permissions. It cannot alter production data, run destructive queries, or modify customer tickets. It reads, investigates, and reports — nothing more.",
  },
  {
    question: "How does Weppo prevent AI hallucinations in investigations?",
    answer:
      "Weppo uses a strict truth-classification model: every piece of evidence in the report is tagged (Verified Fact, Hypothesis, Customer Statement, or Missing Info) and backed by an exact log timestamp, Sentry event ID, or database query result.",
  },
  {
    question: "Does Weppo work with Slack and Discord?",
    answer:
      "Yes. Weppo can plug into Slack channels or Discord servers where customers or internal teams report issues. It monitors messages, identifies technical problems, and runs investigations — just like it does with helpdesk tickets.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Under 5 minutes. Connect your helpdesk (Intercom, Zendesk), communication channels (Slack, Discord), and observability tools (Sentry, Datadog, read-only PostgreSQL) via standard read-only credentials or OAuth.",
  },
  {
    question: "Does Weppo replace Technical Support Engineers or Developers?",
    answer:
      "Neither. Weppo is a teammate, not a replacement. It handles the repetitive triage and investigation work — log-hunting, context reconstruction, evidence correlation. Your team stays in full control of the resolution.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="border-t border-border/25 bg-card px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <div className="text-left">
          <h2 className="text-balance text-3xl font-medium leading-tight text-foreground sm:text-4xl">
            Everything you need to know about Weppo
          </h2>
          <p className="mt-4 text-pretty text-base text-text-secondary">
            Got questions about how Weppo works with your team, security, or setup? Here are the most common answers.
          </p>
        </div>

        <div className="mt-10 divide-y divide-border/25 border-y border-border/25">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-5">
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between text-left focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-medium text-foreground sm:text-lg pr-4">
                    {faq.question}
                  </span>
                  <span className="shrink-0 text-xl font-light text-text-secondary">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen ? (
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base pr-8">
                    {faq.answer}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
