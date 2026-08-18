import type {
  ConnectableIntegrationProvider,
  IntegrationConnection,
  IntegrationConnectionStatus,
  IntegrationProvider,
  IntercomRegion,
} from "../model/integration.types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const integrationsChangedEvent = "weppo:integrations-changed";

export function notifyIntegrationsChanged() {
  window.dispatchEvent(new Event(integrationsChangedEvent));
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstBoolean(...values: unknown[]): boolean | null {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
  }
  return null;
}

const supportedProviders = new Set<IntegrationProvider>([
  "intercom",
  "sentry",
  "notion",
  "zendesk",
  "datadog",
  "linear",
  "jira",
]);

function normalizeProvider(value: unknown): IntegrationProvider | null {
  if (typeof value !== "string") return null;
  const provider = value.trim().toLowerCase().replaceAll("_", "-");
  return supportedProviders.has(provider as IntegrationProvider)
    ? (provider as IntegrationProvider)
    : null;
}

function normalizeStatus(
  value: unknown,
  connected: boolean,
): IntegrationConnectionStatus {
  if (connected) return "connected";
  if (typeof value !== "string") return "disconnected";

  switch (value.trim().toLowerCase().replaceAll("_", "-")) {
    case "connected":
    case "active":
    case "authorized":
      return "connected";
    case "pending":
    case "connecting":
    case "authorizing":
      return "pending";
    case "error":
    case "failed":
    case "expired":
      return "error";
    case "disconnected":
    case "inactive":
    case "not-connected":
      return "disconnected";
    default:
      return "unknown";
  }
}

function normalizeScopes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .filter((scope): scope is string => typeof scope === "string")
          .map((scope) => scope.trim())
          .filter(Boolean),
      ),
    ];
  }
  if (typeof value !== "string" || !value.trim()) return [];

  const trimmed = value.trim();
  const parts =
    trimmed.includes(",") || trimmed.includes(";")
      ? trimmed.split(/[,;]/)
      : trimmed.split(/\s+/).every((part) => /^[a-z-]+:[a-z-]+$/i.test(part))
        ? trimmed.split(/\s+/)
        : [trimmed];

  return [...new Set(parts.map((scope) => scope.trim()).filter(Boolean))];
}

function extractProviderRows(payload: unknown, depth = 0): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload) || depth > 2) return [];
  if (
    normalizeProvider(
      payload.provider ?? payload.providerId ?? payload.provider_id,
    )
  ) {
    return [payload];
  }

  for (const key of ["integrations", "providers", "items", "data"]) {
    const nested = payload[key];
    const rows = extractProviderRows(nested, depth + 1);
    if (rows.length) return rows;
  }
  return [];
}

function normalizeConnection(value: unknown): IntegrationConnection | null {
  if (!isRecord(value)) return null;
  const account = isRecord(value.account) ? value.account : {};
  const provider = normalizeProvider(
    value.provider ?? value.providerId ?? value.provider_id ?? value.name,
  );
  if (!provider) return null;

  const statusValue =
    value.status ?? value.connectionStatus ?? value.connection_status;
  const statusSuggestsConnection =
    typeof statusValue === "string" &&
    ["connected", "active", "authorized"].includes(statusValue.toLowerCase());
  const connected =
    firstBoolean(value.connected, value.isConnected, value.is_connected) ??
    statusSuggestsConnection;

  return {
    provider,
    configured:
      firstBoolean(value.configured, value.isConfigured, value.is_configured) ??
      true,
    connected,
    status: normalizeStatus(statusValue, connected),
    accountLabel: firstString(
      value.accountLabel,
      value.account_label,
      value.displayName,
      value.display_name,
      account.label,
      account.name,
    ),
    accountDomain: firstString(
      value.accountDomain,
      value.account_domain,
      value.domain,
      account.domain,
      account.url,
    ),
    scopes: normalizeScopes(
      value.scopes ??
        value.grantedScopes ??
        value.granted_scopes ??
        value.permissions ??
        account.scopes,
    ),
    updatedAt: firstString(
      value.updatedAt,
      value.updated_at,
      value.connectedAt,
      value.connected_at,
      account.updatedAt,
      account.updated_at,
    ),
  };
}

async function responseError(response: Response): Promise<Error> {
  const payload = (await response.json().catch(() => null)) as unknown;
  const body = isRecord(payload) ? payload : {};
  const nestedError = isRecord(body.error) ? body.error : {};
  const message = firstString(
    nestedError.message,
    body.message,
    response.statusText,
  );
  return new Error(message ?? "Weppo could not complete the request.");
}

async function parseJson(response: Response): Promise<unknown> {
  if (!response.ok) throw await responseError(response);
  return response.json().catch(() => null);
}

function extractAuthorizationUrl(payload: unknown, depth = 0): string | null {
  if (!isRecord(payload) || depth > 2) return null;
  const direct = firstString(
    payload.authorizationUrl,
    payload.authorization_url,
    payload.authorizeUrl,
    payload.authorize_url,
  );
  if (direct) return direct;
  return extractAuthorizationUrl(payload.data, depth + 1);
}

const authorizationHosts: Record<
  ConnectableIntegrationProvider,
  Set<string>
> = {
  intercom: new Set([
    "app.intercom.com",
    "app.eu.intercom.com",
    "app.au.intercom.com",
  ]),
  sentry: new Set(["sentry.io"]),
  notion: new Set(["api.notion.com"]),
};

function assertSafeAuthorizationUrl(
  value: string | null,
  provider: ConnectableIntegrationProvider,
): string {
  if (!value)
    throw new Error("The provider did not return an authorization URL.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The provider returned an invalid authorization URL.");
  }
  if (
    url.protocol !== "https:" ||
    !authorizationHosts[provider].has(url.hostname)
  ) {
    throw new Error("The provider returned an unsupported authorization URL.");
  }
  return url.toString();
}

export async function loadIntegrations(signal?: AbortSignal) {
  const response = await fetch(`${apiUrl}/api/v1/integrations`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  const payload = await parseJson(response);
  return extractProviderRows(payload)
    .map(normalizeConnection)
    .filter(
      (connection): connection is IntegrationConnection => connection !== null,
    );
}

export async function authorizeIntercom(region: IntercomRegion) {
  const response = await fetch(
    `${apiUrl}/api/v1/integrations/intercom/authorize`,
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ region }),
    },
  );
  const payload = await parseJson(response);
  return assertSafeAuthorizationUrl(
    extractAuthorizationUrl(payload),
    "intercom",
  );
}

export async function authorizeSentry() {
  const response = await fetch(
    `${apiUrl}/api/v1/integrations/sentry/authorize`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  const payload = await parseJson(response);
  return assertSafeAuthorizationUrl(extractAuthorizationUrl(payload), "sentry");
}

export async function authorizeNotion() {
  const response = await fetch(
    `${apiUrl}/api/v1/integrations/notion/authorize`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  const payload = await parseJson(response);
  return assertSafeAuthorizationUrl(extractAuthorizationUrl(payload), "notion");
}

export async function disconnectIntegration(
  provider: ConnectableIntegrationProvider,
) {
  const response = await fetch(
    `${apiUrl}/api/v1/integrations/${encodeURIComponent(provider)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  if (!response.ok) throw await responseError(response);
}
