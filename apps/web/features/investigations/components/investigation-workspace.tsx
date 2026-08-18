"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteInvestigation } from "../data/investigation-api.client";
import { useLiveInvestigation } from "../hooks/use-live-investigation";
import { statusLabels, type InvestigationSnapshot } from "../model/investigation.types";
import { ActivityFeed } from "./activity-feed";
import { ReconstructedCase } from "./reconstructed-case";

type InvestigationWorkspaceProps = {
  initialSnapshot: InvestigationSnapshot;
  streamMode?: "mock" | "sse";
};

export function InvestigationWorkspace({
  initialSnapshot,
  streamMode = "mock",
}: InvestigationWorkspaceProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const state = useLiveInvestigation(initialSnapshot, streamMode);
  const investigation = state.snapshot.case;

  const removeCase = async () => {
    if (!window.confirm("Delete this test case and its activity? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteInvestigation(investigation.id);
      router.push("/dashboard/investigations");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100svh-56px)] flex-col bg-white lg:h-[calc(100svh-56px)] lg:min-h-0 lg:overflow-hidden">
      <header className="shrink-0 border-b border-border/20 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard/investigations"
              className="text-xs text-text-tertiary transition-colors hover:text-foreground"
            >
              ← Investigations
            </Link>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="truncate text-xl font-medium text-foreground">
                {investigation.title}
              </h1>
              <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                {statusLabels[investigation.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              {investigation.reconstructed.customer} · {investigation.ticket.provider}
              {investigation.ticket.externalId
                ? ` · ${investigation.ticket.externalId}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void removeCase()}
            disabled={isDeleting}
            className="inline-flex h-10 w-fit items-center justify-center rounded-full border border-border/30 px-4 text-sm font-medium text-text-secondary transition-colors hover:border-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete case"}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(470px,1.2fr)_minmax(360px,0.8fr)]">
        <ActivityFeed
          events={state.snapshot.activity}
          connection={state.connection}
          announcement={state.latestAnnouncement}
          onFollowUp={state.sendFollowUp}
          isSendingFollowUp={state.isSendingFollowUp}
          followUpError={state.followUpError}
        />
        <div className="min-h-0 border-t border-border/20 lg:border-l lg:border-t-0">
          <ReconstructedCase investigation={investigation} />
        </div>
      </div>
    </main>
  );
}
