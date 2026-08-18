"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

type FollowUpComposerProps = {
  onSubmit: (prompt: string) => Promise<void>;
  isSending: boolean;
  error: string | null;
};

export function FollowUpComposer({
  onSubmit,
  isSending,
  error,
}: FollowUpComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [wasSent, setWasSent] = useState(false);
  const canSubmit = prompt.trim().length > 0 && !isSending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const followUp = prompt.trim();
    if (!followUp || isSending) return;

    try {
      await onSubmit(followUp);
      setPrompt("");
      setWasSent(true);
    } catch {
      setWasSent(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t border-border/20 bg-white px-4 py-3 sm:px-5"
    >
      <label htmlFor="agent-follow-up" className="sr-only">
        Follow up with the investigation agent
      </label>
      <div className="flex items-end gap-2 rounded-xl border border-border/30 bg-background/45 p-1.5 pl-3 transition-colors focus-within:border-text-tertiary">
        <textarea
          id="agent-follow-up"
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setWasSent(false);
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={4_000}
          placeholder="Ask the agent to investigate further…"
          className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-foreground outline-none placeholder:text-text-tertiary"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-foreground px-3.5 text-xs font-medium text-white transition-colors hover:bg-text-secondary disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </div>
      <div className="mt-1.5 min-h-4 px-1 text-[10px] text-text-tertiary">
        {error ? (
          <p role="alert">{error}</p>
        ) : wasSent ? (
          <p role="status">Follow-up sent to the agent.</p>
        ) : (
          <p>Enter to send · Shift + Enter for a new line</p>
        )}
      </div>
    </form>
  );
}
