"use client";

import {
  ChatBubbleIcon,
  CheckIcon,
  CopyIcon,
  Cross2Icon,
  FileTextIcon,
  MagnifyingGlassIcon,
  PaperPlaneIcon,
  ReaderIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

const quickPrompts = [
  {
    label: "Explain the diagnosis",
    prompt: "Explain this diagnosis in plain language and cite the supporting evidence.",
    icon: ReaderIcon,
  },
  {
    label: "Review supporting evidence",
    prompt: "Summarize the available evidence and explain what it confirms or leaves uncertain.",
    icon: MagnifyingGlassIcon,
  },
  {
    label: "Draft customer follow-up",
    prompt: "Draft a concise and empathetic customer follow-up based on this investigation.",
    icon: ChatBubbleIcon,
  },
  {
    label: "Draft engineering handoff",
    prompt: "Draft an engineering handoff with the impact, evidence, and recommended next step.",
    icon: FileTextIcon,
  },
] as const;

type CaseAgentPromptProps = {
  caseReference: string;
  onSubmit: (prompt: string) => Promise<string>;
  isSending: boolean;
  error: string | null;
};

export function CaseAgentPrompt({
  caseReference,
  onSubmit,
  isSending,
  error,
}: CaseAgentPromptProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [sentPrompt, setSentPrompt] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canSend = prompt.trim().length > 0 && !isSending;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  async function sendPrompt(retryPrompt?: string) {
    const value = (retryPrompt ?? prompt).trim();
    if (!value || isSending) return;

    setSentPrompt(value);
    setAnswer(null);
    setCopied(false);
    setPrompt("");
    try {
      setAnswer(await onSubmit(value));
    } catch {
      // The shared investigation state exposes the actionable error below.
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
    void sendPrompt();
  }

  function close() {
    setIsOpen(false);
    setSentPrompt(null);
    setAnswer(null);
    setCopied(false);
  }

  async function copyAnswer() {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-[34px] items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-text-secondary"
      >
        <ChatBubbleIcon aria-hidden="true" />
        Ask agent
      </button>

      <dialog
        ref={dialogRef}
        data-case-agent-drawer
        aria-label="Ask the investigation agent"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-foreground backdrop:bg-black/20"
      >
        <section className="relative ml-auto flex h-full w-full max-w-[520px] flex-col border-l border-border/40 bg-card [animation:case-agent-drawer-in_220ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <button
            type="button"
            onClick={close}
            aria-label="Close agent prompt"
            className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-background hover:text-foreground"
          >
            <Cross2Icon aria-hidden="true" />
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 pr-14">
            {!sentPrompt ? (
              <>
                <p className="text-sm leading-6 text-text-secondary">
                  Ask for more context, challenge the diagnosis, or prepare a response from the evidence already collected.
                </p>

                <div className="mt-5 grid gap-2" aria-label="Suggested prompts">
                  {quickPrompts.map((item) => {
                    const PromptIcon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setPrompt(item.prompt);
                          textareaRef.current?.focus();
                        }}
                        className="flex min-h-10 items-center gap-2 border-b border-border/20 px-1 py-2 text-left text-sm text-text-secondary transition-colors hover:text-foreground"
                      >
                        <PromptIcon className="shrink-0 text-text-tertiary" aria-hidden="true" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {sentPrompt ? (
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-[10px] bg-secondary px-3 py-2.5 text-sm leading-6 text-foreground">
                  {sentPrompt}
                </p>
              </div>
            ) : null}

            {isSending && sentPrompt ? (
              <div className="mt-6" role="status">
                <p className="text-xs font-medium text-text-tertiary">Weppo</p>
                <p className="mt-2 text-sm text-text-secondary">Thinking…</p>
              </div>
            ) : null}

            {answer ? (
              <div className="mt-6">
                <p className="text-xs font-medium text-text-tertiary">Weppo</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{answer}</p>
                <button
                  type="button"
                  onClick={() => void copyAnswer()}
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-text-tertiary transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
                  {copied ? "Copied" : "Copy answer"}
                </button>
              </div>
            ) : null}

            {error && sentPrompt && !isSending ? (
              <div className="mt-6 border-l-2 border-[#a74b4b]/40 pl-3">
                <p className="text-sm text-[#a74b4b] dark:text-red-300">{error}</p>
                <button
                  type="button"
                  onClick={() => void sendPrompt(sentPrompt)}
                  className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-foreground hover:bg-secondary"
                >
                  <ReloadIcon aria-hidden="true" />
                  Retry
                </button>
              </div>
            ) : null}
          </div>

          <footer className="shrink-0 bg-card p-3">
            <div className="rounded-[14px] border border-border/50 bg-card p-2 transition-colors focus-within:border-text-tertiary">
              <label htmlFor="case-agent-prompt" className="sr-only">
                Message the investigation agent
              </label>
              <textarea
                ref={textareaRef}
                id="case-agent-prompt"
                rows={2}
                maxLength={4_000}
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value);
                  setSentPrompt(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this case…"
                className="max-h-32 min-h-14 w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none placeholder:text-text-tertiary"
              />
              <div className="flex items-center justify-between gap-3 px-1 pt-1">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded-md bg-violet-50 px-2 py-1 text-sm font-medium text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                    #{caseReference}
                  </span>
                  <span className="truncate text-[11px] text-text-tertiary">
                    Case evidence included
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void sendPrompt()}
                  disabled={!canSend}
                  aria-label="Send prompt to agent"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground transition-[color,transform] hover:text-text-secondary active:scale-95 disabled:cursor-not-allowed disabled:text-text-tertiary"
                >
                  <PaperPlaneIcon aria-hidden="true" />
                </button>
              </div>
            </div>

          </footer>
        </section>
      </dialog>
    </>
  );
}
