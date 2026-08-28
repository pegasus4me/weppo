"use client";

import { useState } from "react";

import { InvestigationWorkspace } from "@/features/investigations/components/investigation-workspace";
import type { InvestigationSnapshot } from "@/features/investigations/model/investigation.types";

const inboxTickets = [
  {
    caseId: "api-requests-returning-401", id: "INC-2481", customer: "Stripe", initials: "ST", domain: "stripe.com",
    title: "API requests fail after key rotation", description: "Production requests started returning 401 errors after an API key rotation.",
    status: "Needs input", statusClass: "bg-[#9a5b39]", updated: "4m", openedAt: "Today, 09:42", openedBy: "Maya Chen", openedInitials: "MC", openerClass: "bg-[#dceee7] text-[#28745f] dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  {
    caseId: "missing-webhook-events", id: "INC-2479", customer: "Linear", initials: "LI", domain: "linear.app",
    title: "Webhook deliveries are delayed", description: "Events arrive eight to twelve minutes after they are created.",
    status: "Investigating", statusClass: "bg-[#9e9e9e]", updated: "18m", openedAt: "Today, 09:18", openedBy: "Elias Ford", openedInitials: "EF", openerClass: "bg-[#e4edf5] text-[#356b9a] dark:bg-blue-950/60 dark:text-blue-300",
  },
  {
    caseId: "duplicate-export-records", id: "INC-2476", customer: "Vercel", initials: "VE", domain: "vercel.com",
    title: "Invoices missing from account export", description: "The completed CSV export excludes last cycle's invoices.",
    status: "Ready for review", statusClass: "bg-[#28745f]", updated: "42m", openedAt: "Today, 08:54", openedBy: "Nora Singh", openedInitials: "NS", openerClass: "bg-[#eee5f3] text-[#74538f] dark:bg-violet-950/60 dark:text-violet-300",
  },
  {
    caseId: "saml-login-loop", id: "INC-2471", customer: "Notion", initials: "NO", domain: "notion.so",
    title: "SAML login loops back to sign in", description: "Admins return to sign in after authenticating with their identity provider.",
    status: "Needs input", statusClass: "bg-[#9a5b39]", updated: "1h", openedAt: "Today, 08:07", openedBy: "Jon Bell", openedInitials: "JB", openerClass: "bg-[#f6e6dc] text-[#9a5b39] dark:bg-amber-950/60 dark:text-amber-300",
  },
  {
    caseId: "salesforce-sync-failure", id: "INC-2468", customer: "Sentry", initials: "SE", domain: "sentry.io",
    title: "Usage dashboard shows stale totals", description: "Workspace usage has not refreshed since yesterday's completed jobs.",
    status: "Investigating", statusClass: "bg-[#9e9e9e]", updated: "2h", openedAt: "Today, 07:31", openedBy: "Amara Okafor", openedInitials: "AO", openerClass: "bg-[#f4dfdf] text-[#a74b4b] dark:bg-red-950/60 dark:text-red-300",
  },
] as const;

export function InboxWorkspace({ snapshots }: { snapshots: InvestigationSnapshot[] }) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(inboxTickets[0].caseId);
  const [showList, setShowList] = useState(true);
  const selectedSnapshot = snapshots.find((snapshot) => snapshot.case.id === selectedCaseId) ?? snapshots[0];
  const selectedTicket = inboxTickets.find((ticket) => ticket.caseId === selectedCaseId) ?? inboxTickets[0];
  const displaySnapshot: InvestigationSnapshot | undefined = selectedSnapshot
    ? {
        ...selectedSnapshot,
        case: {
          ...selectedSnapshot.case,
          title: selectedTicket.title,
          ticket: {
            ...selectedSnapshot.case.ticket,
            externalId: selectedTicket.id,
            report: selectedTicket.description,
          },
          reconstructed: {
            ...selectedSnapshot.case.reconstructed,
            customer: selectedTicket.customer,
            summary: selectedTicket.description,
          },
        },
      }
    : undefined;

  return (
    <main className="h-full min-h-0 bg-card">
      <div className="grid h-full min-h-0 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside aria-label="Customer ticket inbox" className={`${showList ? "flex" : "hidden"} min-h-0 flex-col border-r border-dashed border-border/35 bg-background xl:flex`}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {inboxTickets.map((ticket) => {
              const selected = ticket.caseId === selectedCaseId;
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => { setSelectedCaseId(ticket.caseId); setShowList(false); }}
                  className={`w-full border-b border-border/20 px-4 py-3 text-left transition-colors ${selected ? "bg-secondary" : "hover:bg-card"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-medium ${ticket.openerClass}`}>{ticket.openedInitials}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{ticket.openedBy}</span>
                    <time className="shrink-0 text-[11px] tabular-nums text-text-tertiary">{ticket.updated}</time>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium text-foreground">{ticket.title}</p>
                  <p className="mt-0.5 truncate text-sm text-text-tertiary">{ticket.description}</p>
                  <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] text-text-tertiary">
                    <span className={`size-1.5 shrink-0 rounded-full ${ticket.statusClass}`} />
                    <span className="shrink-0">{ticket.status}</span>
                    <span aria-hidden="true">·</span>
                    <time className="shrink-0">{ticket.openedAt}</time>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{ticket.customer}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section aria-label="Selected ticket investigation" className={`${showList ? "hidden" : "block"} min-h-0 min-w-0 xl:block`}>
          {displaySnapshot ? (
            <InvestigationWorkspace
              key={displaySnapshot.case.id}
              initialSnapshot={displaySnapshot}
              streamMode="mock"
              embedded
              onBackToInbox={() => setShowList(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-text-tertiary">Select a ticket to open its investigation.</div>
          )}
        </section>
      </div>
    </main>
  );
}
