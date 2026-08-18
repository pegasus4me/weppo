"use client";

import { useEffect, useState } from "react";

import { loadInvestigation } from "../data/investigation-api.client";
import type { InvestigationSnapshot } from "../model/investigation.types";
import { InvestigationWorkspace } from "./investigation-workspace";

type InvestigationPageClientProps = {
  caseId: string;
  initialSnapshot: InvestigationSnapshot | null;
  streamMode?: "mock" | "sse";
};

export function InvestigationPageClient({
  caseId,
  initialSnapshot,
  streamMode = "sse",
}: InvestigationPageClientProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSnapshot) return;
    let active = true;
    loadInvestigation(caseId)
      .then((result) => {
        if (active) setSnapshot(result);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Investigation could not be loaded.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [caseId, initialSnapshot]);

  if (snapshot) {
    return (
      <InvestigationWorkspace
        initialSnapshot={snapshot}
        streamMode={streamMode}
      />
    );
  }

  return (
    <main className="flex min-h-[calc(100svh-56px)] items-center justify-center bg-white px-6">
      <p className="text-sm text-text-tertiary">
        {error ?? "Loading investigation…"}
      </p>
    </main>
  );
}
