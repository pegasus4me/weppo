"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { BellIcon, GearIcon } from "@radix-ui/react-icons";
import { Building2 } from "lucide-react";
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
import posthog from "posthog-js";

import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/app/components/theme-toggle";
import {
  getPublishedInvestigationPath,
  investigationPathEvent,
  type InvestigationPathDetail,
} from "@/features/investigations/model/investigation-path";

type DashboardLayoutProps = {
  children: ReactNode;
};

function InboxIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M5 4.5h14l2 9.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V14z" />
      <path d="M3 14h5l1.5 2h5l1.5-2h5" />
    </svg>
  );
}

function InvestigationsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
      <path d="M8 10.5h5" />
    </svg>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const sessionUserId = session?.user.id ?? null;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const isIntegrationsPage = pathname === "/dashboard/integrations";
  const isInboxPage = pathname === "/dashboard";
  const usesFixedWorkspace = isIntegrationsPage || isInboxPage;
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
  const [activeInvestigationPath, setActiveInvestigationPath] =
    useState<InvestigationPathDetail | null>(null);

  useEffect(() => {
    const updatePath = (event: Event) => {
      setActiveInvestigationPath(
        (event as CustomEvent<InvestigationPathDetail | null>).detail,
      );
    };
    window.addEventListener(investigationPathEvent, updatePath);
    setActiveInvestigationPath(getPublishedInvestigationPath());
    return () => window.removeEventListener(investigationPathEvent, updatePath);
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [isPending, router, session]);

  useEffect(() => {
    if (!isPending && session) {
      posthog.identify(session.user.id, { email: session.user.email });
    }
  }, [isPending, session]);

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
  const visibleRecentInvestigations = recentInvestigations.filter(
    (investigation) =>
      investigation.title.toLowerCase().includes(sidebarQuery.toLowerCase()),
  );

  return (
    <div
      className={`${
        usesFixedWorkspace ? "h-svh overflow-hidden" : "min-h-screen"
      } bg-sidebar text-sm`}
    >
      <header className="border-b border-border/25 bg-card">
        <div className="flex h-12 w-full items-center justify-between px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
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
            <span className="hidden shrink-0 text-sm font-medium text-foreground sm:block">
              {name} workspace
            </span>
            {activeInvestigationPath ? (
              <>
                <span className="text-text-tertiary" aria-hidden="true">/</span>
                <span className="hidden shrink-0 items-center gap-1.5 text-sm text-text-secondary md:flex">
                  <Building2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  {activeInvestigationPath.customer}
                </span>
                <span className="hidden text-text-tertiary md:block" aria-hidden="true">/</span>
                <span className="truncate text-sm font-medium text-foreground">
                  {activeInvestigationPath.title}
                </span>
              </>
            ) : null}
          </div>

          <div className="ml-3 flex shrink-0 items-center gap-3">
            {activeInvestigationPath ? (
              <div className="hidden items-center gap-2 lg:flex">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-background px-2 py-1 text-[11px] font-medium text-text-secondary">
                  <span className="size-1.5 rounded-full bg-text-tertiary" aria-hidden="true" />
                  {statusLabels[activeInvestigationPath.status]}
                </span>
                <span className="whitespace-nowrap text-xs text-text-tertiary">
                  {activeInvestigationPath.provider}
                  {activeInvestigationPath.externalId ? ` · ${activeInvestigationPath.externalId}` : ""}
                </span>
              </div>
            ) : null}
            <ThemeToggle />
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
        </div>
      </header>

      <div
        className={`grid w-full transition-[grid-template-columns] duration-200 ease-out ${
          usesFixedWorkspace
            ? "h-[calc(100svh-48px)] min-h-0"
            : "min-h-[calc(100svh-48px)]"
        } ${
          isSidebarCollapsed
            ? "grid-cols-[52px_minmax(0,1fr)]"
            : "grid-cols-[224px_minmax(0,1fr)]"
        }`}
      >
        <aside
          aria-label="Dashboard sidebar"
          className={`relative flex w-full min-w-0 flex-col overflow-hidden border-r border-sidebar-border/25 bg-sidebar text-sidebar-foreground ${
            usesFixedWorkspace ? "min-h-0" : "min-h-full"
          }`}
        >
          <div
            className={`flex min-h-full flex-1 flex-col py-2.5 ${
              isSidebarCollapsed ? "w-full items-center px-2" : "w-full min-w-0 px-2"
            }`}
          >
            {isSidebarCollapsed ? (
              <>
                <Link
                  href="/dashboard"
                  title="Inbox"
                  aria-label="Inbox"
                  className={`flex size-8 items-center justify-center rounded-lg ${
                    pathname === "/dashboard"
                      ? "bg-card text-foreground"
                      : "text-text-secondary hover:bg-card hover:text-foreground"
                  }`}
                >
                  <InboxIcon />
                </Link>
                <Link
                  href="/dashboard/investigations"
                  title="Investigations"
                  aria-label="Investigations"
                  className={`mt-1 flex size-8 items-center justify-center rounded-lg ${
                    pathname.startsWith("/dashboard/investigations")
                      ? "bg-card text-foreground"
                      : "text-text-secondary hover:bg-card hover:text-foreground"
                  }`}
                >
                  <InvestigationsIcon />
                </Link>
                <Link
                  href="/dashboard/integrations"
                  title="Integrations"
                  aria-label="Integrations"
                  className={`mt-1 flex size-8 items-center justify-center rounded-lg ${
                    pathname === "/dashboard/integrations"
                      ? "bg-card text-foreground"
                      : "text-text-secondary hover:bg-card hover:text-foreground"
                  }`}
                >
                  <span className="grid size-4 grid-cols-2 gap-0.5" aria-hidden="true">
                    <span className="rounded-[1px] bg-current" />
                    <span className="rounded-[1px] bg-current" />
                    <span className="rounded-[1px] bg-current" />
                    <span className="rounded-[1px] bg-current" />
                  </span>
                </Link>
                {connectedSidebarIntegrations.map(
                  ({ connection, definition }) => (
                    <Link
                      key={connection.provider}
                      href="/dashboard/integrations"
                      title={definition.name}
                      aria-label={`${definition.name} integration`}
                      className="mt-1 flex size-8 items-center justify-center rounded-lg hover:bg-card"
                    >
                      <Image
                        src={definition.logo}
                        alt=""
                        width={20}
                        height={20}
                        className="size-5 object-contain"
                      />
                    </Link>
                  ),
                )}
              </>
            ) : (
              <>
            <div className="flex h-8 items-center">
              <Link href="/dashboard" title="Inbox" className={`flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-sm font-medium ${pathname === "/dashboard" ? "bg-card text-foreground" : "text-text-secondary hover:bg-card hover:text-foreground"}`}>
                <InboxIcon /><span>Inbox</span>
              </Link>
            </div>
            <Link href="/dashboard/investigations" title="All investigations" className={`mt-1 flex h-8 items-center gap-2 rounded-lg px-2 text-sm font-medium ${pathname === "/dashboard/investigations" ? "bg-card text-foreground" : "text-text-secondary hover:bg-card hover:text-foreground"}`}>
              <InvestigationsIcon /><span>Investigations</span>
            </Link>
            <button type="button" onClick={() => setIsInvestigationsOpen((open) => !open)} className="flex h-8 items-center justify-between rounded-lg px-2 text-sm text-text-secondary hover:bg-card hover:text-foreground">
              <span className="pl-6">Filters</span><span className={isInvestigationsOpen ? "rotate-90" : ""}>›</span>
            </button>
            {isInvestigationsOpen ? <div className="ml-4 border-l border-border/25 pl-2">
              <Link href="/dashboard/investigations/needs-input" className="flex h-8 items-center justify-between rounded-lg px-2 text-xs text-text-secondary hover:bg-card"><span>Needs input</span>{needsInputCount > 0 ? <span>{needsInputCount}</span> : null}</Link>
              <Link href="/dashboard/investigations/ready-for-review" className="flex h-8 items-center justify-between rounded-lg px-2 text-xs text-text-secondary hover:bg-card"><span>Ready for review</span>{readyForReviewCount > 0 ? <span>{readyForReviewCount}</span> : null}</Link>
            </div> : null}

            <div className="mt-1">
              <Link href="/dashboard/integrations" title="Integrations" className={`flex h-8 items-center gap-2 rounded-lg px-2 text-sm ${pathname === "/dashboard/integrations" ? "bg-card font-medium text-foreground" : "text-text-secondary hover:bg-card hover:text-foreground"}`}><span className="grid size-4 grid-cols-2 gap-0.5"><span className="bg-current"/><span className="bg-current"/><span className="bg-current"/><span className="bg-current"/></span><span>Integrations</span></Link>
              {connectedSidebarIntegrations.length > 0 ? <div className="ml-4 border-l border-border/25 pl-2">{connectedSidebarIntegrations.map(({ connection, definition }) => <Link key={connection.provider} href="/dashboard/integrations" className="flex h-8 items-center gap-2 text-xs text-text-secondary"><Image src={definition.logo} alt="" width={20} height={20} className="size-5 object-contain"/><span className="truncate">{definition.name}</span></Link>)}</div> : null}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              <div className="mb-1 flex items-center gap-1 px-2">
                <span className="flex-1 text-xs font-medium text-text-tertiary">Recent</span>
                <input value={sidebarQuery} onChange={(event) => setSidebarQuery(event.target.value)} aria-label="Search recent investigations" placeholder="Search" className="w-16 bg-transparent text-xs outline-none placeholder:text-text-tertiary focus:w-28" />
              </div>
              <div className="space-y-0.5">
                {visibleRecentInvestigations.map((investigation) => <Link key={investigation.id} href={`/dashboard/investigations/${investigation.id}`} title={investigation.title} className={`block rounded-lg px-2 py-1.5 text-sm ${pathname === `/dashboard/investigations/${investigation.id}` ? "bg-card text-foreground" : "text-text-secondary hover:bg-card hover:text-foreground"}`}>
                  <span className="block truncate">{investigation.title}</span>
                  <span className="block truncate text-[11px] text-text-tertiary">{statusLabels[investigation.status]}</span>
                </Link>)}
                {investigationsError ? <p className="px-2 py-2 text-xs text-red-600">{investigationsError}</p> : null}
                {!investigationsError && recentInvestigations.length === 0 ? <p className="px-2 py-2 text-xs text-text-tertiary">No investigations yet.</p> : null}
              </div>
            </div>

              </>
            )}
            <div className={`mt-auto w-full border-t border-border/20 pt-2 ${isSidebarCollapsed ? "flex flex-col items-center" : ""}`}>
              <button
                type="button"
                title="Notifications"
                aria-label="Notifications"
                className={`flex h-8 items-center rounded-lg text-text-secondary hover:bg-card hover:text-foreground ${isSidebarCollapsed ? "w-8 justify-center" : "w-full gap-2 px-2"}`}
              >
                <BellIcon className="size-5 shrink-0" />
                {isSidebarCollapsed ? null : <span>Notifications</span>}
              </button>
              <Link
                href="/dashboard/settings"
                title="Settings"
                aria-label="Settings"
                className={`mt-1 flex h-8 items-center rounded-lg ${
                  pathname === "/dashboard/settings"
                    ? "bg-card text-foreground"
                    : "text-text-secondary hover:bg-card hover:text-foreground"
                } ${isSidebarCollapsed ? "w-8 justify-center" : "w-full gap-2 px-2"}`}
              >
                <GearIcon className="size-5 shrink-0" />
                {isSidebarCollapsed ? null : <span>Settings</span>}
              </Link>
            </div>
            <button
              type="button"
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
              className={`mt-1 flex h-8 shrink-0 items-center rounded-lg text-text-tertiary hover:bg-card hover:text-foreground ${
                isSidebarCollapsed
                  ? "w-8 justify-center"
                  : "w-full justify-end px-2"
              }`}
            >
              <span className={isSidebarCollapsed ? "rotate-180" : ""}>‹</span>
              {isSidebarCollapsed ? null : (
                <span className="ml-2 text-xs">Collapse</span>
              )}
            </button>
          </div>
        </aside>
        <div
          className={`min-w-0 overflow-hidden bg-card text-foreground lg:rounded-tl-xl ${
            usesFixedWorkspace
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
