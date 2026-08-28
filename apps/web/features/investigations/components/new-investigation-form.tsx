"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import posthog from "posthog-js";

import { createInvestigation } from "../data/investigation-api.client";

export function NewInvestigationForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const ticketUrl = String(form.get("ticket") ?? "").trim() || undefined;
      const created = await createInvestigation({
        customer: String(form.get("customer") ?? "").trim(),
        report: String(form.get("report") ?? "").trim(),
        ticketUrl,
      });
      posthog.capture("investigation_created", {
        investigation_id: created.case.id,
        has_ticket_url: Boolean(ticketUrl),
      });
      router.push(`/dashboard/investigations/${created.case.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The investigation could not be created.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-10 space-y-7" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="ticket" className="text-sm font-medium text-foreground">
          Ticket URL
        </label>
        <input
          id="ticket"
          name="ticket"
          type="url"
          placeholder="https://…"
          className="mt-2 h-10 w-full rounded-lg border border-border/40 bg-card px-3 text-sm text-foreground outline-none placeholder:text-text-tertiary focus:border-foreground"
        />
      </div>

      <div>
        <label htmlFor="customer" className="text-sm font-medium text-foreground">
          Customer
        </label>
        <input
          id="customer"
          name="customer"
          type="text"
          required
          placeholder="Company or workspace"
          className="mt-2 h-10 w-full rounded-lg border border-border/40 bg-card px-3 text-sm text-foreground outline-none placeholder:text-text-tertiary focus:border-foreground"
        />
      </div>

      <div>
        <label htmlFor="report" className="text-sm font-medium text-foreground">
          Customer report
        </label>
        <textarea
          id="report"
          name="report"
          rows={8}
          required
          placeholder="Paste the incomplete ticket or describe the issue…"
          className="mt-2 w-full resize-none rounded-lg border border-border/40 bg-card px-3 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-text-tertiary focus:border-foreground"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-text-secondary">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-[34px] items-center justify-center rounded-lg bg-foreground px-3 text-sm font-medium text-background transition-colors hover:bg-text-secondary disabled:cursor-wait disabled:bg-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {pending ? "Starting investigation…" : "Start investigation"}
        </button>
      </div>
    </form>
  );
}
