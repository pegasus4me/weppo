"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import posthog from "posthog-js";

import { deleteInvestigation } from "../data/investigation-api.client";
import { useLiveInvestigation } from "../hooks/use-live-investigation";
import { publishInvestigationPath } from "../model/investigation-path";
import type { InvestigationSnapshot } from "../model/investigation.types";
import {
  initialInvestigationTab,
  isCaseReady,
  type InvestigationTab,
} from "../model/investigation-view";
import { ActivityFeed } from "./activity-feed";
import { InvestigationTabs } from "./investigation-tabs";
import { ReconstructedCase } from "./reconstructed-case";

type InvestigationWorkspaceProps = {
  initialSnapshot: InvestigationSnapshot;
  streamMode?: "mock" | "sse";
  embedded?: boolean;
  onBackToInbox?: () => void;
};

export function InvestigationWorkspace({
  initialSnapshot,
  streamMode = "mock",
  embedded = false,
  onBackToInbox,
}: InvestigationWorkspaceProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<InvestigationTab>(() =>
    initialInvestigationTab(initialSnapshot.case.status),
  );
  const state = useLiveInvestigation(initialSnapshot, streamMode);
  const investigation = state.snapshot.case;
  const caseReady = isCaseReady(investigation.status);
  const panelPrefix = `investigation-${investigation.id}`.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  );

  useEffect(() => {
    publishInvestigationPath({
      title: investigation.title,
      customer: investigation.reconstructed.customer,
      provider: investigation.ticket.provider,
      externalId: investigation.ticket.externalId,
      status: investigation.status,
    });
    return () => publishInvestigationPath(null);
  }, [
    investigation.reconstructed.customer,
    investigation.status,
    investigation.ticket.externalId,
    investigation.ticket.provider,
    investigation.title,
  ]);

  const removeCase = async () => {
    if (!window.confirm("Delete this test case and its activity? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteInvestigation(investigation.id);
      posthog.capture("investigation_deleted", {
        investigation_id: investigation.id,
        status: investigation.status,
      });
      router.push("/dashboard/investigations");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className={`relative flex flex-col bg-card ${embedded ? "h-full min-h-0 overflow-hidden" : "min-h-[calc(100svh-48px)] lg:h-[calc(100svh-48px)] lg:min-h-0 lg:overflow-hidden"}`}>
      <InvestigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        caseReady={caseReady}
        events={state.snapshot.activity}
        connection={state.connection}
        idPrefix={panelPrefix}
        actions={
          <>
            {embedded ? (
              <button type="button" onClick={onBackToInbox} className="mr-1 text-xs text-text-tertiary transition-colors hover:text-foreground xl:hidden">
                ← Inbox
              </button>
            ) : null}
            {embedded ? null : (
              <button type="button" onClick={() => void removeCase()} disabled={isDeleting} className="inline-flex h-8 items-center justify-center rounded-lg bg-[#faeeee] px-2.5 text-xs font-medium text-[#a74b4b] transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950/80">
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </>
        }
      />
      <div className="relative min-h-0 flex-1">
        <div
          id={`${panelPrefix}-agent-panel`}
          role="tabpanel"
          aria-labelledby={`${panelPrefix}-agent-tab`}
          tabIndex={0}
          hidden={activeTab !== "agent"}
          className="h-full min-h-0 outline-none"
        >
          <ActivityFeed
            events={state.snapshot.activity}
            connection={state.connection}
            announcement={state.latestAnnouncement}
            onReviewCaseDetails={() => setActiveTab("case")}
          />
        </div>
        <div
          id={`${panelPrefix}-case-panel`}
          role="tabpanel"
          aria-labelledby={`${panelPrefix}-case-tab`}
          tabIndex={0}
          hidden={activeTab !== "case"}
          className="h-full min-h-0 outline-none"
        >
          <ReconstructedCase
            investigation={investigation}
            showHeader={false}
            onFollowUp={state.sendFollowUp}
            isSendingFollowUp={state.isSendingFollowUp}
            followUpError={state.followUpError}
          />
        </div>
      </div>
    </main>
  );
}
