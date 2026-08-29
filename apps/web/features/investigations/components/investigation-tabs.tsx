"use client";

import Image from "next/image";

import { IntegrationLogo } from "@/app/components/integration-logo";
import type { KeyboardEvent, ReactNode } from "react";
import { useMemo, useRef } from "react";

import type { AgentEvent, ConnectionState } from "../model/investigation.types";
import type { InvestigationTab } from "../model/investigation-view";
import { selectInvokedTools } from "../model/invoked-tools";

type InvestigationTabsProps = {
  activeTab: InvestigationTab;
  onTabChange: (tab: InvestigationTab) => void;
  caseReady: boolean;
  events: AgentEvent[];
  connection: ConnectionState;
  idPrefix: string;
  actions?: ReactNode;
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

function toolBorderColor(id: string) {
  const total = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return toolBorderColors[total % toolBorderColors.length];
}

export function InvestigationTabs({
  activeTab,
  onTabChange,
  caseReady,
  events,
  connection,
  idPrefix,
  actions,
}: InvestigationTabsProps) {
  const invokedTools = useMemo(() => selectInvokedTools(events), [events]);
  const visibleTools = invokedTools.slice(-3);
  const hiddenToolCount = invokedTools.length - visibleTools.length;
  const agentRef = useRef<HTMLButtonElement>(null);
  const caseRef = useRef<HTMLButtonElement>(null);
  const safePrefix = idPrefix.replace(/[^a-zA-Z0-9_-]/g, "-");

  const selectAndFocus = (tab: InvestigationTab) => {
    onTabChange(tab);
    (tab === "agent" ? agentRef : caseRef).current?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: InvestigationTab,
  ) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      selectAndFocus(current === "agent" ? "case" : "agent");
    } else if (event.key === "Home") {
      event.preventDefault();
      selectAndFocus("agent");
    } else if (event.key === "End") {
      event.preventDefault();
      selectAndFocus("case");
    }
  };

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/30 pl-0 pr-5 sm:pr-6">
      <div className="flex self-end" role="tablist" aria-label="Investigation views">
        <button
          ref={agentRef}
          id={`${safePrefix}-agent-tab`}
          type="button"
          role="tab"
          aria-selected={activeTab === "agent"}
          aria-controls={`${safePrefix}-agent-panel`}
          tabIndex={activeTab === "agent" ? 0 : -1}
          onClick={() => onTabChange("agent")}
          onKeyDown={(event) => handleKeyDown(event, "agent")}
          className={`-mb-px flex h-10 items-center gap-2 border border-l-0 px-3 text-sm transition-colors ${activeTab === "agent" ? "border-border/35 border-b-card bg-card font-medium text-foreground" : "border-border/20 bg-secondary text-text-secondary hover:bg-card/70 hover:text-foreground"}`}
        >
          <Image
            src="/agent-investigator-mark.png"
            alt=""
            width={325}
            height={295}
            aria-hidden="true"
            className="h-5 w-auto shrink-0 object-contain"
          />
          Agent investigator
        </button>
        <button
          ref={caseRef}
          id={`${safePrefix}-case-tab`}
          type="button"
          role="tab"
          aria-selected={activeTab === "case"}
          aria-controls={`${safePrefix}-case-panel`}
          tabIndex={activeTab === "case" ? 0 : -1}
          onClick={() => onTabChange("case")}
          onKeyDown={(event) => handleKeyDown(event, "case")}
          className={`-mb-px -ml-px flex h-10 items-center gap-2 border px-3 text-sm transition-colors ${activeTab === "case" ? "relative z-10 border-border/35 border-b-card bg-card font-medium text-foreground" : "border-border/20 bg-secondary text-text-secondary hover:bg-card/70 hover:text-foreground"}`}
        >
          Case details
          {caseReady && activeTab !== "case" ? (
            <span className="size-1.5 rounded-full bg-[#28745f]" aria-hidden="true" />
          ) : null}
          {caseReady ? <span className="sr-only">Ready for review</span> : null}
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-2 text-xs text-text-tertiary">
        {actions}
        {invokedTools.length > 0 ? (
          <>
            <div className="hidden min-w-0 items-center -space-x-2 sm:flex" aria-label={`Tools used: ${invokedTools.map((tool) => tool.label).join(", ")}`}>
              {hiddenToolCount > 0 ? (
                <span className="relative z-20 inline-flex size-7 shrink-0 items-center justify-center rounded-full border-[3px] bg-card text-[10px] font-medium text-text-tertiary" style={{ borderColor: "#9e9e9e" }}>
                  +{hiddenToolCount}
                </span>
              ) : null}
              {visibleTools.map((tool) => (
                <span key={tool.id} title={tool.label} className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-full border-[3px] bg-card" style={{ borderColor: toolBorderColor(tool.id) }}>
                  {tool.logo ? (
                    <IntegrationLogo
                      src={tool.logo}
                      darkSrc={tool.darkLogo}
                      alt=""
                      width={15}
                      height={15}
                    />
                  ) : null}
                  <span className="sr-only">{tool.label}</span>
                </span>
              ))}
            </div>
            <span className="hidden h-4 w-px shrink-0 bg-border/30 sm:block" aria-hidden="true" />
          </>
        ) : null}
        <span className={`size-2 shrink-0 rounded-full ${connection === "live" ? "bg-[#42a66b]" : "bg-text-tertiary"}`} aria-hidden="true" />
        <span className="hidden shrink-0 sm:block">{connectionLabels[connection]}</span>
      </div>
    </div>
  );
}
