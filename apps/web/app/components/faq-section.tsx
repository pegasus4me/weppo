"use client";

import { useState } from "react";

type FAQItem = {
  question: string;
  answer: string;
};

const faqs: FAQItem[] = [
  {
    question: "Does Weppo have write access to our production databases or customer tickets?",
    answer:
      "No. Weppo operates exclusively with strict read-only permissions. It cannot alter production data, run destructive queries, or post public responses to your customers without explicit human action.",
  },
  {
    question: "How does Weppo prevent AI hallucinations in technical escalations?",
    answer:
      "Weppo uses a strict truth-classification model: every piece of evidence in the report is tagged (Verified Fact, Hypothesis, Customer Statement, or Missing Info) and backed by an exact log timestamp, Sentry event ID, or database query result.",
  },
  {
    question: "How long does onboarding and connector setup take?",
    answer:
      "Under 5 minutes. You can connect your helpdesk (Intercom, Zendesk) and observability tools (Sentry, Datadog, read-only PostgreSQL) via standard read-only credentials or OAuth integrations.",
  },
  {
    question: "Does Weppo replace Technical Support Engineers or Developers?",
    answer:
      "Neither. Weppo automates the manual, repetitive detective work (log-hunting, context reconstruction). Human support engineers remain in complete control to review, validate, and approve escalations before handoff to Engineering.",
  },
  {
    question: "Which issue trackers and helpdesks are supported for escalation handoffs?",
    answer:
      "Weppo generates structured, engineering-ready reports formatted for Linear, Jira, and GitHub Issues, and integrates directly with Intercom and Zendesk for ticket intake.",
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
            Got questions about security, setup, or how investigations work? Here are the most common answers.
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
