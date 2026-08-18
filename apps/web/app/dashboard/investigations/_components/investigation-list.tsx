"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { loadInvestigations } from "@/features/investigations/data/investigation-api.client";
import {
  statusLabels,
  type InvestigationStatus,
  type InvestigationSummary,
} from "@/features/investigations/model/investigation.types";

type InvestigationListProps = {
  status?: InvestigationStatus;
};

const descriptions: Partial<Record<InvestigationStatus, string>> = {
  investigating: "Cases currently being reconstructed by Weppo.",
  "needs-input": "Cases waiting for information that could not be recovered automatically.",
  "ready-for-review": "Technical cases ready for a support engineer to validate.",
};

export function InvestigationList({ status }: InvestigationListProps) {
  const [investigations, setInvestigations] = useState<
    InvestigationSummary[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setInvestigations(null);
    setError(null);
    loadInvestigations(status)
      .then(({ investigations: result }) => {
        if (active) setInvestigations(result);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Investigations could not be loaded.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [status]);

  const visibleInvestigations = investigations ?? [];

  return (
    <main className="min-h-full px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-text-tertiary">Workspace</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight text-foreground">
              {status ? statusLabels[status] : "Investigations"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
              {status
                ? descriptions[status] ?? "Investigations in this state."
                : "Technical cases reconstructed from your support and engineering tools."}
            </p>
          </div>

          <Link
            href="/dashboard/investigations/new"
            className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-white transition-colors hover:bg-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            New investigation
          </Link>
        </div>

        <div className="mt-9 overflow-hidden rounded-lg border border-border/25">
          <div className="hidden grid-cols-[minmax(0,1fr)_140px_150px] border-b border-border/20 bg-background px-5 py-3 text-xs font-medium text-text-tertiary sm:grid">
            <span>Investigation</span>
            <span>Status</span>
            <span>Updated</span>
          </div>

          {error ? (
            <div className="px-5 py-14 text-center text-sm text-red-600">
              {error}
            </div>
          ) : investigations === null ? (
            <div className="px-5 py-14 text-center text-sm text-text-tertiary">
              Loading investigations…
            </div>
          ) : visibleInvestigations.length ? (
            visibleInvestigations.map((investigation) => (
              <Link
                key={investigation.id}
                href={`/dashboard/investigations/${investigation.id}`}
                className="grid gap-3 border-b border-border/15 px-5 py-4 transition-colors last:border-b-0 hover:bg-background sm:grid-cols-[minmax(0,1fr)_140px_150px] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {investigation.title}
                  </p>
                  <p className="mt-1 truncate text-sm text-text-tertiary">
                    {investigation.customer} · {investigation.summary}
                  </p>
                </div>
                <span className="text-xs text-text-secondary">
                  {statusLabels[investigation.status]}
                </span>
                <span className="text-xs text-text-tertiary">
                  {investigation.updatedAt}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-5 py-14 text-center text-sm text-text-tertiary">
              No investigations in this state.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
