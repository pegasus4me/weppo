import { IntegrationFlowError } from "./domain.js";

const PROVIDER_TIMEOUT_MS = 10_000;

export class ProviderHttpError extends IntegrationFlowError {
  constructor(
    readonly statusCode: number,
    readonly endpoint: string,
  ) {
    super(
      "provider_rejected",
      `The integration provider rejected ${endpoint} with HTTP ${statusCode}.`,
    );
    this.name = "ProviderHttpError";
  }
}

export function boundedSignal(upstream?: AbortSignal) {
  const timeout = AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
  return upstream ? AbortSignal.any([upstream, timeout]) : timeout;
}

export async function fetchProviderJson(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  upstream?: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      redirect: "error",
      signal: boundedSignal(upstream),
    });
  } catch (error) {
    if (upstream?.aborted) throw error;
    throw new IntegrationFlowError(
      "provider_rejected",
      "The integration provider could not be reached.",
    );
  }

  if (!response.ok) {
    const endpoint = (() => {
      try {
        const parsed = new URL(url);
        return `${parsed.hostname}${parsed.pathname}`;
      } catch {
        return "provider endpoint";
      }
    })();
    throw new ProviderHttpError(response.status, endpoint);
  }

  try {
    return await response.json();
  } catch {
    throw new IntegrationFlowError(
      "provider_rejected",
      "The integration provider returned an invalid response.",
    );
  }
}

export function safeSentryApiBaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new IntegrationFlowError(
      "provider_rejected",
      "Sentry returned an invalid regional API URL.",
    );
  }

  const allowedHost =
    url.hostname === "sentry.io" || url.hostname.endsWith(".sentry.io");
  const allowedPort = url.port === "" || url.port === "443";
  if (
    url.protocol !== "https:" ||
    !allowedHost ||
    !allowedPort ||
    url.username ||
    url.password
  ) {
    throw new IntegrationFlowError(
      "provider_rejected",
      "Sentry returned an untrusted regional API URL.",
    );
  }

  return url.origin;
}
