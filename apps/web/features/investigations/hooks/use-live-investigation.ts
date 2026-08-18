"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { createInvestigationStream } from "../data/mock-investigation-stream";
import { loadInvestigation } from "../data/investigation-api.client";
import {
  createLiveInvestigationState,
  investigationReducer,
} from "../model/investigation.reducer";
import type { InvestigationSnapshot } from "../model/investigation.types";

export function useLiveInvestigation(
  initialSnapshot: InvestigationSnapshot,
  streamMode: "mock" | "sse",
) {
  const [state, dispatch] = useReducer(
    investigationReducer,
    initialSnapshot,
    createLiveInvestigationState,
  );
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const stream = useMemo(
    () => createInvestigationStream(streamMode),
    [streamMode],
  );

  useEffect(
    () =>
      stream.connect({
        caseId: initialSnapshot.case.id,
        afterSequence: initialSnapshot.lastSequence,
        onEvent: (event) => dispatch({ type: "event.received", event }),
        onConnectionChange: (connection) =>
          dispatch({ type: "connection.changed", connection }),
      }),
    [initialSnapshot.case.id, initialSnapshot.lastSequence, stream],
  );

  useEffect(() => {
    let active = true;
    const refreshSnapshot = async () => {
      try {
        const snapshot = await loadInvestigation(initialSnapshot.case.id);
        if (active) dispatch({ type: "snapshot.received", snapshot });
      } catch {
        // SSE remains the primary transport; a failed fallback refresh is retried.
      }
    };
    const interval = window.setInterval(() => void refreshSnapshot(), 1_500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [initialSnapshot.case.id]);

  const sendFollowUp = useCallback(
    async (prompt: string) => {
      setIsSendingFollowUp(true);
      setFollowUpError(null);
      try {
        await stream.sendFollowUp(initialSnapshot.case.id, prompt);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The follow-up could not be sent.";
        setFollowUpError(message);
        throw error;
      } finally {
        setIsSendingFollowUp(false);
      }
    },
    [initialSnapshot.case.id, stream],
  );

  return {
    ...state,
    sendFollowUp,
    isSendingFollowUp,
    followUpError,
  };
}
