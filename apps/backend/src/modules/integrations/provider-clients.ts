import { z } from "zod";

import type { OAuthProviderConfig } from "../../config/env.js";
import {
  IntegrationFlowError,
  intercomExpectedPermissions,
  intercomRegions,
  notionReadPermissions,
  sentryScopes,
  type IntercomRegion,
  type ProviderToken,
} from "./domain.js";
import type {
  IntercomOAuthClient,
  NotionOAuthClient,
  SentryOAuthClient,
} from "./ports.js";
import {
  boundedSignal,
  fetchProviderJson,
  ProviderHttpError,
  safeSentryApiBaseUrl,
} from "./provider-http.js";
import { INTERCOM_API_VERSION } from "./intercom-config.js";

const INTERCOM_TOKEN_URL = "https://api.intercom.io/auth/eagle/token";
const SENTRY_AUTHORIZE_URL = "https://sentry.io/oauth/authorize/";
const SENTRY_TOKEN_URL = "https://sentry.io/oauth/token/";
const SENTRY_ORGANIZATIONS_URL = "https://sentry.io/api/0/organizations/";
const NOTION_AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize";
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";
const NOTION_REVOKE_URL = "https://api.notion.com/v1/oauth/revoke";
const NOTION_SELF_URL = "https://api.notion.com/v1/users/me";

export const NOTION_API_VERSION = "2026-03-11";

export const intercomHosts: Record<
  IntercomRegion,
  { authorization: string; api: string }
> = {
  us: {
    authorization: "https://app.intercom.com/oauth",
    api: "https://api.intercom.io",
  },
  eu: {
    authorization: "https://app.eu.intercom.com/oauth",
    api: "https://api.eu.intercom.io",
  },
  au: {
    authorization: "https://app.au.intercom.com/oauth",
    api: "https://api.au.intercom.io",
  },
};

const intercomTokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1).default("Bearer"),
});

const intercomMeSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable().optional(),
  app: z
    .object({
      id_code: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      region: z.string().nullable().optional(),
    })
    .optional(),
});

const sentryTokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).nullable().optional(),
  token_type: z.string().min(1).default("Bearer"),
  scope: z.union([z.string(), z.array(z.string())]).optional(),
  expires_in: z.coerce.number().positive().optional(),
  expires_at: z.union([z.string(), z.number()]).optional(),
});

const sentryOrganizationsSchema = z.array(
  z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
    links: z
      .object({
        regionUrl: z.string().url().optional(),
      })
      .optional(),
  }),
);

const notionTokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).nullable().optional(),
  token_type: z.string().min(1).default("bearer"),
  expires_in: z.coerce.number().positive().optional(),
});

const notionBotSchema = z.object({
  object: z.literal("user"),
  id: z.string().uuid(),
  avatar_url: z.string().url().nullable().optional(),
  type: z.literal("bot"),
  bot: z.object({
    workspace_name: z.string().min(1).nullable().optional(),
    workspace_id: z.string().uuid(),
  }),
});

function invalidProviderResponse(): never {
  throw new IntegrationFlowError(
    "provider_rejected",
    "The integration provider returned an invalid response.",
  );
}

function tokenExpiry(
  expiresAt: string | number | undefined,
  expiresIn: number | undefined,
) {
  if (expiresAt !== undefined) {
    const numeric =
      typeof expiresAt === "number" ? expiresAt : Number(expiresAt);
    const date = Number.isFinite(numeric)
      ? new Date(numeric * 1_000)
      : new Date(String(expiresAt));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return expiresIn ? new Date(Date.now() + expiresIn * 1_000) : null;
}

function normalizeScopes(value: string | string[] | undefined) {
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(/[\s,]+/))
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function requireBearer(tokenType: string) {
  if (tokenType.toLowerCase() !== "bearer") {
    throw new IntegrationFlowError(
      "invalid_grant",
      "The provider did not issue a supported bearer credential.",
    );
  }
}

function basicAuthorization(config: OAuthProviderConfig) {
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
}

export class IntercomProviderClient implements IntercomOAuthClient {
  constructor(
    private readonly config: OAuthProviderConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  authorizationUrl(state: string, region: IntercomRegion) {
    const url = new URL(intercomHosts[region].authorization);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    return url.toString();
  }

  async exchangeCode(code: string, signal?: AbortSignal) {
    const body = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
    const raw = await fetchProviderJson(
      this.fetcher,
      INTERCOM_TOKEN_URL,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      },
      signal,
    );
    const parsed = intercomTokenSchema.safeParse(raw);
    if (!parsed.success) return invalidProviderResponse();
    requireBearer(parsed.data.token_type);
    return {
      accessToken: parsed.data.access_token,
      refreshToken: null,
      tokenType: parsed.data.token_type,
      grantedScopes: [...intercomExpectedPermissions],
      expiresAt: null,
    } satisfies ProviderToken;
  }

  async validateAccount(
    accessToken: string,
    region: IntercomRegion,
    signal?: AbortSignal,
  ) {
    const candidates = [
      region,
      ...intercomRegions.filter((candidate) => candidate !== region),
    ];
    let lastUnauthorized: ProviderHttpError | null = null;

    for (const candidate of candidates) {
      try {
        const raw = await fetchProviderJson(
          this.fetcher,
          `${intercomHosts[candidate].api}/me`,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "intercom-version": INTERCOM_API_VERSION,
            },
          },
          signal,
        );
        const parsed = intercomMeSchema.safeParse(raw);
        if (!parsed.success) return invalidProviderResponse();

        const reportedRegion = parsed.data.app?.region?.toLowerCase();
        if (
          reportedRegion &&
          !intercomRegions.includes(reportedRegion as IntercomRegion)
        ) {
          throw new IntegrationFlowError(
            "provider_rejected",
            "Intercom returned an unsupported workspace region.",
          );
        }

        const actualRegion =
          (reportedRegion as IntercomRegion | undefined) ?? candidate;

        return {
          provider: "intercom" as const,
          region: actualRegion,
          admin: {
            id: parsed.data.id,
            name: parsed.data.name ?? null,
          },
          workspace: {
            id: parsed.data.app?.id_code ?? null,
            name: parsed.data.app?.name ?? null,
          },
        };
      } catch (error) {
        if (error instanceof ProviderHttpError && error.statusCode === 401) {
          lastUnauthorized = error;
          continue;
        }
        throw error;
      }
    }

    if (lastUnauthorized) {
      let lastConversationError: ProviderHttpError = lastUnauthorized;

      for (const candidate of candidates) {
        try {
          await fetchProviderJson(
            this.fetcher,
            `${intercomHosts[candidate].api}/conversations?per_page=1`,
            {
              method: "GET",
              headers: {
                authorization: `Bearer ${accessToken}`,
                "intercom-version": INTERCOM_API_VERSION,
              },
            },
            signal,
          );

          return {
            provider: "intercom" as const,
            region: candidate,
            admin: { id: null, name: null },
            workspace: { id: null, name: null },
          };
        } catch (error) {
          if (error instanceof ProviderHttpError) {
            lastConversationError = error;
            continue;
          }
          throw error;
        }
      }

      throw lastConversationError;
    }
    throw new IntegrationFlowError(
      "provider_rejected",
      "Intercom account validation failed.",
    );
  }

  async uninstall(
    accessToken: string,
    region: IntercomRegion,
    signal?: AbortSignal,
  ) {
    let response: Response;
    try {
      response = await this.fetcher(
        `${intercomHosts[region].api}/auth/uninstall`,
        {
          method: "POST",
          redirect: "error",
          signal: boundedSignal(signal),
          headers: {
            authorization: `Bearer ${accessToken}`,
            "intercom-version": INTERCOM_API_VERSION,
          },
        },
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new IntegrationFlowError(
        "provider_rejected",
        "Intercom could not revoke the connection.",
      );
    }
    if (response.ok || response.status === 401) return;
    throw new IntegrationFlowError(
      "provider_rejected",
      "Intercom could not revoke the connection.",
    );
  }
}

export class SentryProviderClient implements SentryOAuthClient {
  constructor(
    private readonly config: OAuthProviderConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  authorizationUrl(state: string, codeChallenge: string) {
    const url = new URL(SENTRY_AUTHORIZE_URL);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", sentryScopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier: string, signal?: AbortSignal) {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: this.config.redirectUri,
    });
    const raw = await fetchProviderJson(
      this.fetcher,
      SENTRY_TOKEN_URL,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      },
      signal,
    );
    const parsed = sentryTokenSchema.safeParse(raw);
    if (!parsed.success) return invalidProviderResponse();
    requireBearer(parsed.data.token_type);
    const grantedScopes = normalizeScopes(parsed.data.scope);
    if (
      grantedScopes.length !== sentryScopes.length ||
      sentryScopes.some((scope) => !grantedScopes.includes(scope))
    ) {
      throw new IntegrationFlowError(
        "invalid_grant",
        "Sentry did not grant the required read-only scopes.",
      );
    }

    return {
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token ?? null,
      tokenType: parsed.data.token_type,
      grantedScopes,
      expiresAt: tokenExpiry(parsed.data.expires_at, parsed.data.expires_in),
    } satisfies ProviderToken;
  }

  async validateAccount(accessToken: string, signal?: AbortSignal) {
    const raw = await fetchProviderJson(
      this.fetcher,
      SENTRY_ORGANIZATIONS_URL,
      {
        method: "GET",
        headers: { authorization: `Bearer ${accessToken}` },
      },
      signal,
    );
    const parsed = sentryOrganizationsSchema.safeParse(raw);
    if (!parsed.success || parsed.data.length === 0) {
      return invalidProviderResponse();
    }

    return {
      provider: "sentry" as const,
      organizations: parsed.data.slice(0, 100).map((organization) => ({
        id: organization.id,
        slug: organization.slug,
        name: organization.name,
        apiBaseUrl: safeSentryApiBaseUrl(
          organization.links?.regionUrl ?? "https://sentry.io",
        ),
      })),
    };
  }
}

export class NotionProviderClient implements NotionOAuthClient {
  constructor(
    private readonly config: OAuthProviderConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  authorizationUrl(state: string) {
    const url = new URL(NOTION_AUTHORIZE_URL);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("owner", "user");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCode(code: string, signal?: AbortSignal) {
    const raw = await fetchProviderJson(
      this.fetcher,
      NOTION_TOKEN_URL,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: basicAuthorization(this.config),
          "content-type": "application/json",
          "notion-version": NOTION_API_VERSION,
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.config.redirectUri,
        }),
      },
      signal,
    );
    const parsed = notionTokenSchema.safeParse(raw);
    if (!parsed.success) return invalidProviderResponse();
    requireBearer(parsed.data.token_type);
    return {
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token ?? null,
      tokenType: parsed.data.token_type,
      grantedScopes: [...notionReadPermissions],
      expiresAt: tokenExpiry(undefined, parsed.data.expires_in),
    } satisfies ProviderToken;
  }

  async validateAccount(accessToken: string, signal?: AbortSignal) {
    const raw = await fetchProviderJson(
      this.fetcher,
      NOTION_SELF_URL,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "notion-version": NOTION_API_VERSION,
        },
      },
      signal,
    );
    const parsed = notionBotSchema.safeParse(raw);
    if (!parsed.success) return invalidProviderResponse();
    return {
      provider: "notion" as const,
      botId: parsed.data.id,
      workspace: {
        id: parsed.data.bot.workspace_id,
        name: parsed.data.bot.workspace_name ?? null,
        icon: parsed.data.avatar_url ?? null,
      },
    };
  }

  async revoke(accessToken: string, signal?: AbortSignal) {
    await fetchProviderJson(
      this.fetcher,
      NOTION_REVOKE_URL,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: basicAuthorization(this.config),
          "content-type": "application/json",
          "notion-version": NOTION_API_VERSION,
        },
        body: JSON.stringify({ token: accessToken }),
      },
      signal,
    );
  }
}
