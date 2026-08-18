"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import {
  integrationsChangedEvent,
  loadIntegrations,
} from "@/features/integrations/data/integration-api.client";
import {
  integrationGroups,
  type IntegrationConnection,
} from "@/features/integrations/model/integration.types";
import { loadInvestigations } from "@/features/investigations/data/investigation-api.client";
import {
  statusLabels,
  type InvestigationSummary,
} from "@/features/investigations/model/investigation.types";
import { authClient } from "@/lib/auth-client";

type DashboardLayoutProps = {
  children: ReactNode;
};

function InvestigationsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.38a1.7 1.7 0 0 0-1 .24 1.7 1.7 0 0 0-.82 1.46V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-.82-1.46 1.7 1.7 0 0 0-1-.24 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.62 15a1.7 1.7 0 0 0-.24-1 1.7 1.7 0 0 0-1.46-.82H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.46-.82 1.7 1.7 0 0 0 .24-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.62a1.7 1.7 0 0 0 1-.24 1.7 1.7 0 0 0 .82-1.46V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .82 1.46 1.7 1.7 0 0 0 1 .24 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.38 9c.1.33.1.67 0 1a1.7 1.7 0 0 0 1.46.82H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.46.82z" />
    </svg>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const sessionUserId = session?.user.id ?? null;
  const isSidebarCollapsed = false;
  const isIntegrationsPage = pathname === "/dashboard/integrations";
  const [isInvestigationsOpen, setIsInvestigationsOpen] = useState(
    pathname === "/dashboard/investigations/needs-input" ||
      pathname === "/dashboard/investigations/ready-for-review",
  );
  const [connectedIntegrations, setConnectedIntegrations] = useState<
    IntegrationConnection[]
  >([]);
  const [recentInvestigations, setRecentInvestigations] = useState<
    InvestigationSummary[]
  >([]);
  const [investigationsError, setInvestigationsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [isPending, router, session]);

  useEffect(() => {
    if (isPending || !sessionUserId) return;

    const controller = new AbortController();
    const refreshConnectedIntegrations = async () => {
      try {
        const integrations = await loadIntegrations(controller.signal);
        if (!controller.signal.aborted) {
          setConnectedIntegrations(
            integrations.filter((integration) => integration.connected),
          );
        }
      } catch {
        if (!controller.signal.aborted) setConnectedIntegrations([]);
      }
    };

    void refreshConnectedIntegrations();
    window.addEventListener(
      integrationsChangedEvent,
      refreshConnectedIntegrations,
    );

    return () => {
      controller.abort();
      window.removeEventListener(
        integrationsChangedEvent,
        refreshConnectedIntegrations,
      );
    };
  }, [isPending, sessionUserId]);

  useEffect(() => {
    if (isPending || !sessionUserId) return;

    let active = true;
    const refreshInvestigations = async () => {
      try {
        const { investigations } = await loadInvestigations();
        if (active) {
          setRecentInvestigations(investigations.slice(0, 5));
          setInvestigationsError(null);
        }
      } catch (reason: unknown) {
        if (active) {
          setRecentInvestigations([]);
          setInvestigationsError(
            reason instanceof Error
              ? reason.message
              : "Investigations could not be loaded.",
          );
        }
      }
    };

    void refreshInvestigations();
    const interval = window.setInterval(() => void refreshInvestigations(), 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isPending, pathname, sessionUserId]);

  if (isPending || !session) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-background px-5"
        aria-busy="true"
      >
        <p className="text-sm text-text-tertiary">Loading dashboard…</p>
      </main>
    );
  }

  const name = session.user.name || session.user.email;
  const avatarImage = session.user.image;
  const connectedSidebarIntegrations = connectedIntegrations.flatMap(
    (connection) => {
      const definition = integrationGroups
        .flatMap((group) => group.integrations)
        .find((integration) => integration.provider === connection.provider);
      return definition ? [{ connection, definition }] : [];
    },
  );
  const needsInputCount = recentInvestigations.filter(
    (investigation) => investigation.status === "needs-input",
  ).length;
  const readyForReviewCount = recentInvestigations.filter(
    (investigation) => investigation.status === "ready-for-review",
  ).length;

  return (
    <div
      className={`${
        isIntegrationsPage ? "h-svh overflow-hidden" : "min-h-screen"
      } bg-background`}
    >
      <header className="border-b border-border/25 bg-background">
        <div className="flex h-14 w-full items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/workspace-header-logo.png"
              alt="Weppo"
              width={252}
              height={221}
              priority
              className="h-6 w-auto max-w-7 shrink-0 object-contain"
            />
            <span className="text-text-tertiary" aria-hidden="true">
              /
            </span>
            <span className="truncate text-sm font-medium text-foreground">
              {name} workspace
            </span>
          </div>

          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary">
            {avatarImage ? (
              <Image
                src={avatarImage}
                alt={`${name} avatar`}
                fill
                sizes="32px"
                className="object-cover"
              />
            ) : (
              <Image
                src="/weppo-mark.png"
                alt={`${name} avatar`}
                width={32}
                height={32}
                className="h-8 w-8 object-cover"
              />
            )}
          </div>
        </div>
      </header>

      <div
        className={`grid w-full transition-[grid-template-columns] duration-200 ease-out ${
          isIntegrationsPage
            ? "h-[calc(100svh-56px)] min-h-0"
            : "min-h-[calc(100svh-56px)]"
        } ${
          isSidebarCollapsed
            ? "grid-cols-[64px_minmax(0,1fr)]"
            : "grid-cols-[240px_minmax(0,1fr)]"
        }`}
      >
        <aside
          aria-label="Dashboard sidebar"
          className={`relative flex flex-col border-r border-sidebar-border/25 bg-white text-sidebar-foreground ${
            isIntegrationsPage
              ? "min-h-0 overflow-y-auto overscroll-contain"
              : "min-h-full"
          }`}
        >
          <div
            className={`flex min-h-full flex-1 flex-col pb-4 pt-4 ${
              isSidebarCollapsed ? "px-2" : "px-3"
            }`}
          >
            <nav aria-label="Investigations">
              {isSidebarCollapsed ? null : (
                <p className="flex items-center gap-2 px-2 text-xs font-medium text-text-tertiary">
                  <InvestigationsIcon />
                  <span>Investigations</span>
                </p>
              )}

              <div
                className={isSidebarCollapsed ? "space-y-1" : "mt-2 space-y-1"}
              >
                <button
                  type="button"
                  title="All investigations"
                  aria-expanded={isInvestigationsOpen}
                  aria-controls="investigation-filters"
                  onClick={() => setIsInvestigationsOpen((open) => !open)}
                  className={`flex h-9 w-full items-center justify-between rounded-md px-2.5 text-sm transition-colors ${
                    pathname === "/dashboard/investigations"
                      ? "bg-white font-medium text-foreground"
                      : "text-text-secondary hover:bg-white hover:text-foreground"
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`text-base leading-none transition-transform duration-200 ${
                      isInvestigationsOpen ? "rotate-90" : ""
                    }`}
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>

                {isInvestigationsOpen ? (
                  <div
                    id="investigation-filters"
                    className="ml-3 space-y-1 border-l border-sidebar-border/25 pl-2"
                  >
                    <Link
                      href="/dashboard/investigations/needs-input"
                      title="Needs input"
                      aria-current={
                        pathname === "/dashboard/investigations/needs-input"
                          ? "page"
                          : undefined
                      }
                      className={`flex h-9 items-center rounded-md text-sm transition-colors ${
                        isSidebarCollapsed
                          ? "justify-center px-0"
                          : "justify-between px-2.5"
                      } ${
                        pathname === "/dashboard/investigations/needs-input"
                          ? "bg-white font-medium text-foreground"
                          : "text-text-secondary hover:bg-white hover:text-foreground"
                      }`}
                    >
                      {isSidebarCollapsed ? null : (
                        <>
                          <span>Needs input</span>
                          {needsInputCount > 0 ? (
                            <span className="flex min-w-5 items-center justify-center rounded-full bg-primary/70 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                              {needsInputCount}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>

                    <Link
                      href="/dashboard/investigations/ready-for-review"
                      title="Ready for review"
                      aria-current={
                        pathname ===
                        "/dashboard/investigations/ready-for-review"
                          ? "page"
                          : undefined
                      }
                      className={`flex h-9 items-center rounded-md text-sm transition-colors ${
                        isSidebarCollapsed
                          ? "justify-center px-0"
                          : "justify-between px-2.5"
                      } ${
                        pathname ===
                        "/dashboard/investigations/ready-for-review"
                          ? "bg-white font-medium text-foreground"
                          : "text-text-secondary hover:bg-white hover:text-foreground"
                      }`}
                    >
                      {isSidebarCollapsed ? null : (
                        <>
                          <span>Ready for review</span>
                          {readyForReviewCount > 0 ? (
                            <span className="text-xs text-text-tertiary">
                              {readyForReviewCount}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>
                  </div>
                ) : null}
              </div>
            </nav>

            {isSidebarCollapsed ? null : (
              <div className="mt-7">
                <p className="px-2 text-xs font-medium text-text-tertiary">
                  Recent
                </p>
                <div className="mt-2 space-y-0.5">
                  {recentInvestigations.map((investigation) => (
                    <Link
                      key={investigation.id}
                      href={`/dashboard/investigations/${investigation.id}`}
                      aria-current={
                        pathname === `/dashboard/investigations/${investigation.id}`
                          ? "page"
                          : undefined
                      }
                      className={`block rounded-md px-2.5 py-2 transition-colors ${
                        pathname === `/dashboard/investigations/${investigation.id}`
                          ? "bg-white font-medium text-foreground"
                          : "text-text-secondary hover:bg-white hover:text-foreground"
                      }`}
                    >
                      <span className="block truncate text-sm">
                        {investigation.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-text-tertiary">
                        {investigation.id.slice(0, 8)} · {statusLabels[investigation.status]}
                      </span>
                    </Link>
                  ))}
                  {investigationsError ? (
                    <p className="px-2.5 py-2 text-xs text-red-600">
                      {investigationsError}
                    </p>
                  ) : recentInvestigations.length === 0 ? (
                    <p className="px-2.5 py-2 text-xs text-text-tertiary">
                      No investigations yet.
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            <nav className="mt-7" aria-label="Workspace">
              <Link
                href="/dashboard/integrations"
                title="Integrations"
                aria-current={
                  pathname === "/dashboard/integrations" ? "page" : undefined
                }
                className={`flex h-9 items-center rounded-md text-sm transition-colors ${
                  isSidebarCollapsed
                    ? "justify-center px-0"
                    : "justify-start px-2.5"
                } ${
                  pathname === "/dashboard/integrations"
                    ? "bg-white font-medium text-foreground"
                    : "text-text-secondary hover:bg-white hover:text-foreground"
                }`}
              >
                {isSidebarCollapsed ? (
                  <span
                    className="grid h-4 w-4 grid-cols-2 gap-0.5"
                    aria-hidden="true"
                  >
                    <span className="rounded-[1px] bg-text-tertiary" />
                    <span className="rounded-[1px] bg-text-tertiary" />
                    <span className="rounded-[1px] bg-text-tertiary" />
                    <span className="rounded-[1px] bg-text-tertiary" />
                  </span>
                ) : (
                  <span>Integrations</span>
                )}
              </Link>

              {isSidebarCollapsed ||
              connectedSidebarIntegrations.length === 0 ? null : (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-sidebar-border/25 pl-2">
                  {connectedSidebarIntegrations.map(
                    ({ connection, definition }) => (
                      <Link
                        key={connection.provider}
                        href="/dashboard/integrations"
                        title={`${definition.name} — ${connection.accountLabel ?? "Connected"}`}
                        className="flex h-8 items-center gap-2 rounded-md px-2.5 text-xs text-text-secondary transition-colors hover:bg-white hover:text-foreground"
                      >
                        <Image
                          src={definition.logo}
                          alt=""
                          width={16}
                          height={16}
                          className="size-4 shrink-0 object-contain"
                        />
                        <span className="truncate">{definition.name}</span>
                        <span className="sr-only">Connected</span>
                      </Link>
                    ),
                  )}
                </div>
              )}
            </nav>

            <div className="mt-auto border-t border-sidebar-border/20 pt-3">
              <Link
                href="/dashboard/settings"
                title="Settings"
                aria-current={
                  pathname === "/dashboard/settings" ? "page" : undefined
                }
                className={`flex h-9 items-center rounded-md text-sm transition-colors ${
                  isSidebarCollapsed
                    ? "justify-center px-0"
                    : "justify-start px-2.5"
                } ${
                  pathname === "/dashboard/settings"
                    ? "bg-white font-medium text-foreground"
                    : "text-text-secondary hover:bg-white hover:text-foreground"
                }`}
              >
                {isSidebarCollapsed ? (
                  <SettingsIcon />
                ) : (
                  <span className="flex items-center gap-2">
                    <SettingsIcon />
                    <span>Settings</span>
                  </span>
                )}
              </Link>
            </div>
          </div>
        </aside>
        <div
          className={`min-w-0 bg-card text-foreground ${
            isIntegrationsPage
              ? "min-h-0 overflow-y-auto overscroll-contain"
              : ""
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
