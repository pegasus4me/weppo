"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  AgentEvent,
  ConnectionState,
} from "../model/investigation.types";
import { selectInvokedTools } from "../model/invoked-tools";
import { AgentLoadingState } from "./agent-loading-state";
import { FollowUpComposer } from "./follow-up-composer";

type ActivityFeedProps = {
  events: AgentEvent[];
  connection: ConnectionState;
  announcement: string;
  onFollowUp: (prompt: string) => Promise<void>;
  isSendingFollowUp: boolean;
  followUpError: string | null;
};

const connectionLabels: Record<ConnectionState, string> = {
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline",
  closed: "Closed",
};

const toolBorderColors = [
  "#4b2f7a",
  "#1d4ed8",
  "#0f9f6e",
  "#d97706",
  "#dc2626",
  "#7c3aed",
];

const branchStyles = {
  "webhook-retry": {
    label: "Webhook branch",
    dot: "bg-[#4b2f7a]",
    rail: "border-[#4b2f7a]/35",
    badge: "bg-[#4b2f7a]/[0.06] text-[#70538b]",
  },
  "invoice-export": {
    label: "Invoice branch",
    dot: "bg-[#b45309]",
    rail: "border-amber-600/35",
    badge: "bg-amber-50 text-amber-800",
  },
} as const;

const dynamicBranchStyles = [
  { dot: "bg-[#0f766e]", rail: "border-teal-600/35", badge: "bg-teal-50 text-teal-800" },
  { dot: "bg-[#2563eb]", rail: "border-blue-600/35", badge: "bg-blue-50 text-blue-800" },
  { dot: "bg-[#be185d]", rail: "border-pink-600/35", badge: "bg-pink-50 text-pink-800" },
  { dot: "bg-[#7c3aed]", rail: "border-violet-600/35", badge: "bg-violet-50 text-violet-800" },
] as const;

const agentStyles = {
  supervisor: {
    label: "Supervisor",
    rail: "border-slate-400/45",
    badge: "bg-slate-100 text-slate-600",
  },
  case: {
    label: "Case",
    rail: "border-blue-500/40",
    badge: "bg-blue-50 text-blue-700",
  },
  observability: {
    label: "Observability",
    rail: "border-violet-500/35",
    badge: "bg-violet-50 text-violet-700",
  },
  knowledge: {
    label: "Knowledge",
    rail: "border-emerald-500/35",
    badge: "bg-emerald-50 text-emerald-700",
  },
} as const;

function toolBorderColor(id: string) {
  const total = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return toolBorderColors[total % toolBorderColors.length];
}

function roleLabel(role: AgentEvent["agentRole"]) {
  if (!role) return null;
  return role;
}

function branchForEvent(event: AgentEvent) {
  const match = event.taskId?.match(/^branch-([a-z0-9-]+)/);
  if (!match) return null;
  const id = match[1] as keyof typeof branchStyles;
  if (branchStyles[id]) return { id, ...branchStyles[id] };
  const index = [...id].reduce((total, character) => total + character.charCodeAt(0), 0) % dynamicBranchStyles.length;
  return {
    id,
    label: event.title.startsWith("Decision branch: ")
      ? event.title.slice("Decision branch: ".length)
      : id.replace(/-/g, " "),
    ...dynamicBranchStyles[index]!,
  };
}

function agentStyleForEvent(event: AgentEvent) {
  const role = event.agentRole as keyof typeof agentStyles | undefined;
  return role ? agentStyles[role] ?? null : null;
}

function TicketIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5 shrink-0"
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.25 4.25a1 1 0 0 1 1-1h7.5a1 1 0 0 1 1 1v1.45a1.3 1.3 0 0 0 0 2.6v1.45a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1V8.3a1.3 1.3 0 0 0 0-2.6V4.25Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path
        d="M6.25 5.25v5.5"
        stroke="currentColor"
        strokeDasharray="1.2 1.2"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function InputRequest({ message }: { message: string }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <p className="mt-3 rounded-md bg-white px-3 py-2.5 text-sm text-text-secondary">
        Answer added to the case. The agent will resume when the backend input
        endpoint is connected.
      </p>
    );
  }

  return (
    <form
      className="mt-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (answer.trim()) setSubmitted(true);
      }}
    >
      <label className="sr-only" htmlFor="agent-answer">
        Answer the agent’s question
      </label>
      <textarea
        id="agent-answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        rows={3}
        placeholder={message}
        className="w-full resize-none rounded-md border border-border/30 bg-white px-3 py-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-text-tertiary focus:border-foreground"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-xs font-medium text-white transition-colors hover:bg-text-secondary"
        >
          Send answer
        </button>
      </div>
    </form>
  );
}

function compactSummary(summary: string) {
  const firstSentence = summary.match(/^.+?[.!?](?:\s|$)/)?.[0] ?? summary;
  return firstSentence.length > 150
    ? `${firstSentence.slice(0, 147).trimEnd()}…`
    : firstSentence;
}

function sourceLinkLabel(source: string | undefined) {
  if (source?.startsWith("Sentry")) return "View in Sentry";
  if (source === "Notion") return "View in Notion";
  return "View source";
}

function StreamingTextOutput({ text }: { text: string }) {
  const words = useMemo(() => text.split(" "), [text]);
  const [count, setCount] = useState(0);
  const done = count >= words.length;

  useEffect(() => {
    setCount(0);
  }, [text]);

  useEffect(() => {
    if (done) return;
    const timer = window.setTimeout(() => {
      setCount((current) => Math.min(current + 1, words.length));
    }, 45);
    return () => window.clearTimeout(timer);
  }, [count, done, words.length]);

  return (
    <>
      {words.slice(0, count).map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline [will-change:filter,opacity]"
          style={{
            animation:
              "stream-text-in 420ms cubic-bezier(0.22,0.61,0.25,1) both",
          }}
        >
          {word}{" "}
        </span>
      ))}
      {!done ? (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-text-secondary"
        />
      ) : null}
    </>
  );
}

function ActivityItem({
  event,
  animateAgent,
}: {
  event: AgentEvent;
  animateAgent: boolean;
}) {
  const isWorking = event.type === "tool.started";
  const isFinding = event.type === "finding.added";
  const isInput = event.type === "input.requested";
  const isFollowUp = event.type === "follow_up.requested";
  const isTicketUnderstood = event.type === "ticket.parsed";
  const isSentrySearch = isWorking && event.source === "Sentry";
  const isSentryEvidence = Boolean(event.evidence?.source.startsWith("Sentry"));
  const branch = branchForEvent(event);
  const agent = agentStyleForEvent(event);
  const agentRoleLabel = roleLabel(event.agentRole);
  const visibleSummary = compactSummary(event.publicSummary);
  const summaryHasHiddenDetail = visibleSummary !== event.publicSummary;

  return (
    <li>
      <article className="relative grid grid-cols-[18px_minmax(0,1fr)] gap-3 pb-7">
        <span
          className={`relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
            branch
              ? branch.dot
              : isFollowUp
              ? "bg-primary"
              : isFinding
              ? "bg-primary"
              : isInput
                ? "bg-text-tertiary"
                : isWorking
                  ? "bg-[#7f6df2]"
                  : "bg-foreground"
          }`}
          aria-hidden="true"
        />
        <div
          className={`min-w-0 ${
            isSentryEvidence
              ? "rounded-lg bg-[#4b2f7a]/[0.025] px-3 py-3"
              : ""
          } border-l-2 pl-3 ${branch?.rail ?? agent?.rail ?? "border-transparent"}`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {branch ? (
              <span className={`inline-flex h-6 items-center rounded-md px-2 text-[10px] ${branch.badge}`}>
                {branch.label}
              </span>
            ) : null}
            {!branch && agent ? (
              <span className={`inline-flex h-6 items-center rounded-md px-2 text-[10px] ${agent.badge}`}>
                {agent.label}
              </span>
            ) : null}
            {isSentryEvidence ? (
              <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#4b2f7a]/[0.06] px-2.5 text-xs font-medium text-[#70538b]">
                <Image
                  src="/integrations/sentry.svg"
                  alt=""
                  width={14}
                  height={14}
                  aria-hidden="true"
                />
                Sentry
              </span>
            ) : null}
            {isWorking && animateAgent ? (
              <div className="flex flex-wrap items-center gap-2">
                {isSentrySearch ? (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#4b2f7a]/[0.06] px-2.5 text-xs font-medium text-[#70538b]">
                    <Image
                      src="/integrations/sentry.svg"
                      alt=""
                      width={14}
                      height={14}
                      aria-hidden="true"
                    />
                    Sentry
                  </span>
                ) : null}
                <AgentLoadingState label={event.title} />
              </div>
            ) : isSentrySearch ? (
              <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#4b2f7a]/[0.06] px-2.5 text-xs font-medium text-[#70538b]">
                <Image
                  src="/integrations/sentry.svg"
                  alt=""
                  width={14}
                  height={14}
                  aria-hidden="true"
                />
                {event.title}
              </span>
            ) : isTicketUnderstood ? (
              <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#2563eb]/12 px-2.5 text-xs font-medium text-[#1d4ed8]">
                <TicketIcon />
                {event.title}
              </span>
            ) : (
              <h3 className="text-sm font-medium text-foreground">{event.title}</h3>
            )}
            {agentRoleLabel ? (
              <span className="text-[11px] font-medium text-text-tertiary">
                / {agentRoleLabel}
              </span>
            ) : null}
            {isFollowUp ? (
              <span className="rounded-full bg-primary/45 px-2 py-0.5 text-[10px] font-medium text-foreground">
                You
              </span>
            ) : null}
            <time
              dateTime={event.occurredAt}
              className="text-[11px] text-text-tertiary"
            >
              {new Intl.DateTimeFormat("en", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(event.occurredAt))}
            </time>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-text-secondary">
            {animateAgent ? (
              <StreamingTextOutput text={visibleSummary} />
            ) : (
              visibleSummary
            )}
          </p>
          {summaryHasHiddenDetail || event.source || event.details?.length || event.plan?.length || event.evidence?.details?.length || event.evidence?.sourceUrl ? (
            <details className="mt-2 text-xs text-text-secondary">
              <summary className="cursor-pointer select-none hover:text-foreground">
                Details
              </summary>
              <div className="mt-2 space-y-3 border-l border-border/30 pl-3 text-[11px] leading-5">
                {summaryHasHiddenDetail ? <p>{event.publicSummary}</p> : null}
                {event.source ? (
                  <p>
                    Source: {event.source}
                    {event.evidence?.sourceReference
                      ? ` · ${event.evidence.sourceReference}`
                      : ""}
                  </p>
                ) : null}
                {event.details?.length ? (
                  <dl className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
                    {event.details.map((detail) => (
                      <div key={`${detail.label}-${detail.value}`} className="min-w-0">
                        <dt className="text-text-tertiary">{detail.label}</dt>
                        <dd className="break-words text-foreground">{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {event.evidence?.sourceUrl ? (
                  <a
                    href={event.evidence.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-sans text-xs font-medium text-[#80629a] hover:text-[#59416f]"
                  >
                    {sourceLinkLabel(event.evidence.source)} <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
                {event.evidence?.details?.length ? (
                  <dl className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
                    {event.evidence.details.map((detail) => (
                      <div key={`${detail.label}-${detail.value}`} className="min-w-0">
                        <dt className="text-text-tertiary">{detail.label}</dt>
                        <dd className="break-words text-foreground">{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {event.plan?.length ? (
                  <ul className="list-disc space-y-1 pl-4">
                    {event.plan.map((step) => (
                      <li key={`${step.source}-${step.objective}`}>
                        <span className="font-medium text-text-secondary">
                          {step.source}:
                        </span>{" "}
                        {step.objective}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </details>
          ) : null}
          {isInput ? <InputRequest message={event.publicSummary} /> : null}
        </div>
      </article>
    </li>
  );
}

export function ActivityFeed({
  events,
  connection,
  announcement,
  onFollowUp,
  isSendingFollowUp,
  followUpError,
}: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const invokedTools = useMemo(() => selectInvokedTools(events), [events]);
  const visibleTools = invokedTools.slice(-3);
  const hiddenToolCount = invokedTools.length - visibleTools.length;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 160) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
  }, [events.length]);

  return (
    <section className="flex min-h-0 flex-col bg-background/55" aria-labelledby="activity-heading">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/20 px-5 sm:px-6">
        <h2 id="activity-heading" className="text-sm font-medium text-foreground">
          Agent activity
        </h2>
        <div className="flex min-w-0 items-center gap-2 text-xs text-text-tertiary">
          {invokedTools.length > 0 ? (
            <>
              <div
                className="flex min-w-0 items-center -space-x-2"
                aria-label={`Tools used: ${invokedTools
                  .map((tool) => tool.label)
                  .join(", ")}`}
              >
                {hiddenToolCount > 0 ? (
                  <span
                    className="relative z-20 inline-flex size-7 shrink-0 items-center justify-center rounded-full border-[3px] bg-white text-[10px] font-medium text-text-tertiary"
                    style={{ borderColor: "#9e9e9e" }}
                    title={invokedTools
                      .slice(0, hiddenToolCount)
                      .map((tool) => tool.label)
                      .join(", ")}
                  >
                    +{hiddenToolCount}
                  </span>
                ) : null}
                {visibleTools.map((tool) => (
                  <span
                    key={tool.id}
                    title={tool.label}
                    className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-full border-[3px] bg-white"
                    style={{ borderColor: toolBorderColor(tool.id) }}
                  >
                    {tool.logo ? (
                      <Image
                        src={tool.logo}
                        alt=""
                        width={15}
                        height={15}
                        aria-hidden="true"
                        className="shrink-0"
                      />
                    ) : null}
                    <span className="sr-only">{tool.label}</span>
                  </span>
                ))}
              </div>
              <span className="h-4 w-px shrink-0 bg-border/30" aria-hidden="true" />
            </>
          ) : null}
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              connection === "live" ? "bg-[#42a66b]" : "bg-text-tertiary"
            }`}
            aria-hidden="true"
          />
          <span className="shrink-0">{connectionLabels[connection]}</span>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
        <ol className="relative before:absolute before:bottom-7 before:left-[4px] before:top-2 before:w-px before:bg-border/25">
          {events.map((event) => (
            <ActivityItem
              key={event.id}
              event={event}
              animateAgent={
                event.id === events.at(-1)?.id &&
                event.type === "tool.started" &&
                connection === "live"
              }
            />
          ))}
        </ol>
      </div>

      <FollowUpComposer
        onSubmit={onFollowUp}
        isSending={isSendingFollowUp}
        error={followUpError}
      />
    </section>
  );
}
