import Image from "next/image";

import type {
  ConnectableIntegrationProvider,
  IntegrationConnection,
  IntegrationDefinition,
  IntercomRegion,
} from "../model/integration.types";

export type IntegrationAction = "authorizing" | "disconnecting" | null;

type IntegrationCardProps = {
  definition: IntegrationDefinition;
  connection: IntegrationConnection | null;
  isLoading: boolean;
  action: IntegrationAction;
  error: string | null;
  intercomRegion: IntercomRegion;
  onIntercomRegionChange: (region: IntercomRegion) => void;
  onConnect: (provider: ConnectableIntegrationProvider) => void;
  onDisconnect: (provider: ConnectableIntegrationProvider) => void;
};

const writableScopePattern = /\b(write|manage)\b|(^|[:._-])admin([:._-]|$)/i;

function formatUpdatedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(
  definition: IntegrationDefinition,
  connection: IntegrationConnection | null,
  isLoading: boolean,
) {
  if (!definition.available) return "Coming next";
  if (isLoading) return "Checking";
  if (!connection?.configured) return "Unavailable";
  if (connection.connected) return "Connected";
  if (connection.status === "pending") return "Pending";
  if (connection.status === "error") return "Needs attention";
  return "Not connected";
}

function isConnectableProvider(
  provider: IntegrationDefinition["provider"],
): provider is ConnectableIntegrationProvider {
  return (
    provider === "intercom" || provider === "sentry" || provider === "notion"
  );
}

export function IntegrationCard({
  definition,
  connection,
  isLoading,
  action,
  error,
  intercomRegion,
  onIntercomRegionChange,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const provider = definition.provider;
  const isConnected = connection?.connected ?? false;
  const isConfigured = connection?.configured ?? false;
  const safeProviderScopes =
    connection?.scopes.filter((scope) => !writableScopePattern.test(scope)) ??
    [];
  const hasUnexpectedScope =
    connection?.scopes.some((scope) => writableScopePattern.test(scope)) ??
    false;
  const access = safeProviderScopes.length
    ? safeProviderScopes
    : definition.readOnlyAccess;
  const updatedAt = formatUpdatedAt(connection?.updatedAt ?? null);
  const controlsDisabled =
    isLoading ||
    action !== null ||
    !isConfigured ||
    connection?.status === "pending";
  const describedBy = error ? `${provider}-integration-error` : undefined;

  return (
    <article
      className="rounded-lg border border-border/25 bg-white px-4 py-4"
      aria-busy={action !== null || undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/20 bg-white">
            <Image
              src={definition.logo}
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-foreground">
              {definition.name}
            </h3>
            {isConnected &&
            (connection?.accountLabel || connection?.accountDomain) ? (
              <p className="mt-0.5 truncate text-xs text-text-tertiary">
                {[connection.accountLabel, connection.accountDomain]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isConnected
              ? "bg-primary/45 text-foreground"
              : "bg-background text-text-secondary"
          }`}
        >
          {isConnected ? (
            <span
              className="size-1.5 rounded-full bg-foreground"
              aria-hidden="true"
            />
          ) : null}
          {statusLabel(definition, connection, isLoading)}
        </span>
      </div>

      <p className="mt-3 text-sm leading-5 text-text-secondary">
        {definition.description}
      </p>

      {definition.available ? (
        <div className="mt-4 rounded-md bg-background px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-foreground">
              {safeProviderScopes.length
                ? "Read-only scopes reported by provider"
                : "Read-only access"}
            </p>
            <span className="text-[10px] font-medium uppercase text-text-tertiary">
              No write access
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {access.map((scope) => (
              <li
                key={scope}
                className="flex items-start gap-2 text-xs leading-5 text-text-secondary"
              >
                <span
                  className="mt-[7px] size-1 shrink-0 rounded-full bg-foreground/55"
                  aria-hidden="true"
                />
                <span>{scope}</span>
              </li>
            ))}
          </ul>
          {hasUnexpectedScope ? (
            <p
              className="mt-2 text-xs leading-5 text-text-secondary"
              role="alert"
            >
              Unexpected provider permissions were detected. Weppo will not use
              write access; review the provider configuration.
            </p>
          ) : null}
        </div>
      ) : null}

      {definition.available && !isLoading && !isConfigured ? (
        <p className="mt-3 text-xs leading-5 text-text-tertiary">
          OAuth credentials are not configured for this workspace yet.
        </p>
      ) : null}

      {connection?.status === "error" && !error ? (
        <p className="mt-3 text-xs leading-5 text-text-secondary">
          This connection needs attention. Reconnect it to restore access.
        </p>
      ) : null}

      {error ? (
        <p
          id={`${provider}-integration-error`}
          role="alert"
          className="mt-3 text-xs leading-5 text-text-secondary"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex min-h-9 items-center justify-between gap-3 border-t border-border/15 pt-4">
        {updatedAt && isConnected ? (
          <p className="text-[11px] text-text-tertiary">
            Updated{" "}
            <time dateTime={connection?.updatedAt ?? undefined}>
              {updatedAt}
            </time>
          </p>
        ) : (
          <span />
        )}

        {!definition.available ? (
          <button
            type="button"
            disabled
            className="inline-flex h-9 cursor-not-allowed items-center rounded-full bg-background px-4 text-xs font-medium text-text-tertiary"
          >
            Coming next
          </button>
        ) : isConnectableProvider(provider) && isConnected ? (
          <button
            type="button"
            disabled={action !== null}
            aria-describedby={describedBy}
            onClick={() => onDisconnect(provider)}
            className="inline-flex h-9 items-center rounded-full border border-border/35 px-4 text-xs font-medium text-text-secondary transition-colors hover:border-foreground/40 hover:text-foreground disabled:cursor-wait disabled:text-text-tertiary"
          >
            {action === "disconnecting" ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : isConnectableProvider(provider) ? (
          <div className="flex items-center gap-2">
            {provider === "intercom" ? (
              <>
                <label htmlFor="intercom-region" className="sr-only">
                  Intercom data region
                </label>
                <select
                  id="intercom-region"
                  value={intercomRegion}
                  disabled={controlsDisabled}
                  onChange={(event) =>
                    onIntercomRegionChange(event.target.value as IntercomRegion)
                  }
                  className="h-9 rounded-full border border-border/35 bg-white px-3 text-xs font-medium text-text-secondary outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-text-tertiary"
                >
                  <option value="us">US</option>
                  <option value="eu">EU</option>
                  <option value="au">AU</option>
                </select>
              </>
            ) : null}
            <button
              type="button"
              disabled={controlsDisabled}
              aria-describedby={describedBy}
              onClick={() => onConnect(provider)}
              className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-xs font-medium text-white transition-colors hover:bg-text-secondary disabled:cursor-not-allowed disabled:bg-text-tertiary"
            >
              {action === "authorizing"
                ? "Redirecting…"
                : connection?.status === "pending"
                  ? "Authorization pending"
                  : "Connect"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
