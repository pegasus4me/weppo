"use client";

import { useCallback, useEffect, useState } from "react";

import {
  authorizeIntercom,
  authorizeNotion,
  authorizeSentry,
  disconnectIntegration,
  loadIntegrations,
  notifyIntegrationsChanged,
} from "../data/integration-api.client";
import {
  integrationGroups,
  type ConnectableIntegrationProvider,
  type IntegrationConnection,
  type IntercomRegion,
} from "../model/integration.types";
import { IntegrationCard, type IntegrationAction } from "./integration-card";

type ConnectionMap = Partial<
  Record<ConnectableIntegrationProvider, IntegrationConnection>
>;

type ActionMap = Partial<
  Record<ConnectableIntegrationProvider, IntegrationAction>
>;

type ErrorMap = Partial<Record<ConnectableIntegrationProvider, string | null>>;

type CallbackNotice = {
  kind: "success" | "error";
  message: string;
};

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

function providerLabel(value: string | null) {
  switch (value?.trim().toLowerCase()) {
    case "intercom":
      return "Intercom";
    case "sentry":
      return "Sentry";
    case "notion":
      return "Notion";
    default:
      return "Integration";
  }
}

function callbackErrorDetail(reason: string) {
  switch (reason.trim().toLowerCase().replaceAll("_", "-")) {
    case "access-denied":
    case "authorization-denied":
    case "oauth-denied":
    case "user-denied":
      return "Authorization was cancelled or denied.";
    case "invalid-state":
    case "state-mismatch":
    case "expired-state":
      return "The authorization session expired. Try connecting again.";
    case "not-configured":
    case "configuration-error":
    case "missing-configuration":
      return "This integration is not configured yet.";
    case "missing-code":
    case "invalid-code":
    case "token-exchange-failed":
    case "oauth-failed":
    case "callback-failed":
    default:
      return "Authorization could not be completed. Try connecting again.";
  }
}

function isConnectableProvider(
  provider: (typeof integrationGroups)[number]["integrations"][number]["provider"],
): provider is ConnectableIntegrationProvider {
  return (
    provider === "intercom" || provider === "sentry" || provider === "notion"
  );
}

export function IntegrationsSettings() {
  const [connections, setConnections] = useState<ConnectionMap>({});
  const [actions, setActions] = useState<ActionMap>({});
  const [errors, setErrors] = useState<ErrorMap>({});
  const [intercomRegion, setIntercomRegion] = useState<IntercomRegion>("us");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [callbackNotice, setCallbackNotice] = useState<CallbackNotice | null>(
    null,
  );

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const integrations = await loadIntegrations(signal);
      if (signal?.aborted) return;
      const next: ConnectionMap = {};
      integrations.forEach((integration) => {
        if (
          integration.provider === "intercom" ||
          integration.provider === "sentry" ||
          integration.provider === "notion"
        ) {
          next[integration.provider] = integration;
        }
      });
      setConnections(next);
    } catch (reason) {
      if (signal?.aborted) return;
      setLoadError(
        errorMessage(reason, "Integration status could not be loaded."),
      );
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedProvider = params.get("connected");
    const callbackError = params.get("integration_error");
    if (!connectedProvider && !callbackError) return;

    if (callbackError) {
      const provider = providerLabel(params.get("provider"));
      setCallbackNotice({
        kind: "error",
        message: `${provider} was not connected. ${callbackErrorDetail(callbackError)}`,
      });
    } else {
      setCallbackNotice({
        kind: "success",
        message: `${providerLabel(connectedProvider)} connected successfully.`,
      });
    }

    params.delete("connected");
    params.delete("integration_error");
    params.delete("provider");
    const remainingSearch = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${remainingSearch ? `?${remainingSearch}` : ""}${window.location.hash}`,
    );
  }, []);

  async function handleConnect(provider: ConnectableIntegrationProvider) {
    setActions((current) => ({ ...current, [provider]: "authorizing" }));
    setErrors((current) => ({ ...current, [provider]: null }));

    try {
      const authorizationUrl =
        provider === "intercom"
          ? await authorizeIntercom(intercomRegion)
          : provider === "sentry"
            ? await authorizeSentry()
            : await authorizeNotion();
      window.location.assign(authorizationUrl);
    } catch (reason) {
      setErrors((current) => ({
        ...current,
        [provider]: errorMessage(
          reason,
          `${providerLabel(provider)} authorization could not be started.`,
        ),
      }));
      setActions((current) => ({ ...current, [provider]: null }));
    }
  }

  async function handleDisconnect(provider: ConnectableIntegrationProvider) {
    setActions((current) => ({ ...current, [provider]: "disconnecting" }));
    setErrors((current) => ({ ...current, [provider]: null }));

    try {
      await disconnectIntegration(provider);
      setConnections((current) => {
        const connection = current[provider];
        if (!connection) return current;
        return {
          ...current,
          [provider]: {
            ...connection,
            connected: false,
            status: "disconnected",
            accountLabel: null,
            accountDomain: null,
            scopes: [],
            updatedAt: new Date().toISOString(),
          },
        };
      });
      notifyIntegrationsChanged();
    } catch (reason) {
      setErrors((current) => ({
        ...current,
        [provider]: errorMessage(
          reason,
          `${providerLabel(provider)} could not be disconnected.`,
        ),
      }));
    } finally {
      setActions((current) => ({ ...current, [provider]: null }));
    }
  }

  return (
    <main className="min-h-full px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-text-tertiary">Workspace</p>
            <h1 className="mt-1 text-[30px] font-medium leading-tight text-foreground">
              Integrations
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
              Give Weppo controlled, read-only access to the systems used during
              an investigation.
            </p>
          </div>

          {loadError ? (
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex h-9 w-fit items-center rounded-full border border-border/35 px-4 text-xs font-medium text-text-secondary transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              Retry
            </button>
          ) : null}
        </div>

        {callbackNotice ? (
          <p
            role={callbackNotice.kind === "error" ? "alert" : "status"}
            className={`mt-5 rounded-md border px-4 py-3 text-sm text-text-secondary ${
              callbackNotice.kind === "success"
                ? "border-primary/70 bg-primary/15"
                : "border-border/25 bg-background"
            }`}
          >
            {callbackNotice.message}
          </p>
        ) : null}

        {loadError ? (
          <p
            role="alert"
            className="mt-5 rounded-md border border-border/25 bg-background px-4 py-3 text-sm text-text-secondary"
          >
            {loadError} Existing connections may be out of date.
          </p>
        ) : null}

        <div className="mt-9 divide-y divide-border/20 border-y border-border/20">
          {integrationGroups.map((group) => (
            <section
              key={group.name}
              className="grid gap-6 py-7 md:grid-cols-[minmax(190px,0.7fr)_minmax(360px,1.3fr)] md:items-start"
              aria-labelledby={`${group.name.toLowerCase()}-integrations-heading`}
            >
              <div>
                <h2
                  id={`${group.name.toLowerCase()}-integrations-heading`}
                  className="text-sm font-medium text-foreground"
                >
                  {group.name}
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-text-tertiary">
                  {group.description}
                </p>
              </div>

              <div className="space-y-3">
                {group.integrations.map((definition) => {
                  const provider = definition.provider;
                  const connectable = isConnectableProvider(provider);
                  return (
                    <IntegrationCard
                      key={provider}
                      definition={definition}
                      connection={
                        connectable ? (connections[provider] ?? null) : null
                      }
                      isLoading={connectable && isLoading}
                      action={connectable ? (actions[provider] ?? null) : null}
                      error={connectable ? (errors[provider] ?? null) : null}
                      intercomRegion={intercomRegion}
                      onIntercomRegionChange={setIntercomRegion}
                      onConnect={(provider) => void handleConnect(provider)}
                      onDisconnect={(provider) =>
                        void handleDisconnect(provider)
                      }
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
