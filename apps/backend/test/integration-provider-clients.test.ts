import assert from "node:assert/strict";
import { test } from "node:test";

import type { OAuthProviderConfig } from "../src/config/env.js";
import {
  IntegrationFlowError,
  intercomExpectedPermissions,
  notionReadPermissions,
  sentryScopes,
} from "../src/modules/integrations/domain.js";
import {
  IntercomProviderClient,
  NotionProviderClient,
  SentryProviderClient,
} from "../src/modules/integrations/provider-clients.js";

type FetchCall = {
  url: string;
  init: RequestInit;
};

const intercomConfig: OAuthProviderConfig = {
  clientId: "fake-intercom-client-id",
  clientSecret: "fake-intercom-client-secret",
  redirectUri:
    "https://backend.weppo.test/api/v1/integrations/intercom/callback",
};

const sentryConfig: OAuthProviderConfig = {
  clientId: "fake-sentry-client-id",
  clientSecret: "fake-sentry-client-secret",
  redirectUri: "https://backend.weppo.test/api/v1/integrations/sentry/callback",
};

const notionConfig: OAuthProviderConfig = {
  clientId: "fake-notion-client-id",
  clientSecret: "fake-notion-client-secret",
  redirectUri: "https://backend.weppo.test/api/v1/integrations/notion/callback",
};

function inputUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function fakeJsonFetch(...responses: unknown[]) {
  const calls: FetchCall[] = [];
  const fetcher: typeof fetch = async (input, init = {}) => {
    const responseIndex = calls.length;
    calls.push({ url: inputUrl(input), init });
    assert.ok(
      responseIndex < responses.length,
      `Unexpected fetch call to ${inputUrl(input)}`,
    );
    return new Response(JSON.stringify(responses[responseIndex]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { calls, fetcher };
}

function assertFixedRequest(
  call: FetchCall | undefined,
  expectedUrl: string,
  expectedMethod: "GET" | "POST",
) {
  assert.ok(call);
  assert.equal(call.url, expectedUrl);
  assert.equal(call.init.method, expectedMethod);
  assert.equal(call.init.redirect, "error");
}

function formBody(call: FetchCall | undefined) {
  assert.ok(call);
  assert.ok(call.init.body instanceof URLSearchParams);
  return Object.fromEntries(call.init.body.entries());
}

function jsonBody(call: FetchCall | undefined) {
  assert.ok(call);
  assert.equal(typeof call.init.body, "string");
  return JSON.parse(call.init.body) as unknown;
}

function searchParameters(url: URL) {
  return Object.fromEntries(url.searchParams.entries());
}

test("Intercom authorization URLs use only the selected regional host and documented parameters", () => {
  const client = new IntercomProviderClient(intercomConfig, (() => {
    throw new Error("Authorization URL construction must not call fetch.");
  }) as typeof fetch);
  const regions = {
    us: "https://app.intercom.com",
    eu: "https://app.eu.intercom.com",
    au: "https://app.au.intercom.com",
  } as const;

  for (const [region, expectedOrigin] of Object.entries(regions)) {
    const url = new URL(
      client.authorizationUrl("oauth-state", region as keyof typeof regions),
    );

    assert.equal(url.origin, expectedOrigin);
    assert.equal(url.pathname, "/oauth");
    assert.equal([...url.searchParams].length, 3);
    assert.deepEqual(searchParameters(url), {
      client_id: intercomConfig.clientId,
      state: "oauth-state",
      redirect_uri: intercomConfig.redirectUri,
    });
  }
});

test("Intercom exchanges a form code and validates the regional account through GET /me", async () => {
  const { calls, fetcher } = fakeJsonFetch(
    {
      access_token: "fake-intercom-access-token",
      token_type: "Bearer",
    },
    {
      id: "admin-1",
      name: "Ada Admin",
      app: {
        id_code: "workspace-1",
        name: "Acme Support",
        region: "EU",
      },
    },
  );
  const client = new IntercomProviderClient(intercomConfig, fetcher);

  const token = await client.exchangeCode("fake-authorization-code");
  const account = await client.validateAccount(token.accessToken, "eu");

  assertFixedRequest(
    calls[0],
    "https://api.intercom.io/auth/eagle/token",
    "POST",
  );
  assert.equal(
    new Headers(calls[0]?.init.headers).get("content-type"),
    "application/x-www-form-urlencoded",
  );
  assert.deepEqual(formBody(calls[0]), {
    code: "fake-authorization-code",
    client_id: intercomConfig.clientId,
    client_secret: intercomConfig.clientSecret,
  });
  assert.deepEqual(token, {
    accessToken: "fake-intercom-access-token",
    refreshToken: null,
    tokenType: "Bearer",
    grantedScopes: [...intercomExpectedPermissions],
    expiresAt: null,
  });

  assertFixedRequest(calls[1], "https://api.eu.intercom.io/me", "GET");
  const accountHeaders = new Headers(calls[1]?.init.headers);
  assert.equal(
    accountHeaders.get("authorization"),
    "Bearer fake-intercom-access-token",
  );
  assert.equal(accountHeaders.get("intercom-version"), "2.15");
  assert.equal(calls[1]?.init.body, undefined);
  assert.deepEqual(account, {
    provider: "intercom",
    region: "eu",
    admin: { id: "admin-1", name: "Ada Admin" },
    workspace: { id: "workspace-1", name: "Acme Support" },
  });
  assert.equal(calls.length, 2);
});

test("Intercom trusts the workspace region reported by /me", async () => {
  const { calls, fetcher } = fakeJsonFetch({
    id: "admin-1",
    app: { id_code: "workspace-1", region: "US" },
  });
  const client = new IntercomProviderClient(intercomConfig, fetcher);

  const account = await client.validateAccount("fake-access-token", "au");

  assertFixedRequest(calls[0], "https://api.au.intercom.io/me", "GET");
  assert.equal(
    new Headers(calls[0]?.init.headers).get("intercom-version"),
    "2.15",
  );
  assert.equal(account.region, "us");
  assert.equal(calls.length, 1);
});

test("Intercom retries only fixed regional /me endpoints after a 401", async () => {
  const calls: FetchCall[] = [];
  const fetcher: typeof fetch = async (input, init = {}) => {
    calls.push({ url: inputUrl(input), init });
    if (calls.length === 1) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        id: "admin-1",
        name: "Ada Admin",
        app: {
          id_code: "workspace-1",
          name: "Acme Support",
          region: "EU",
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  const client = new IntercomProviderClient(intercomConfig, fetcher);

  const account = await client.validateAccount("fake-access-token", "us");

  assertFixedRequest(calls[0], "https://api.intercom.io/me", "GET");
  assertFixedRequest(calls[1], "https://api.eu.intercom.io/me", "GET");
  assert.equal(account.region, "eu");
  assert.equal(calls.length, 2);
});

test("Intercom validates through read-only conversations when /me is unavailable", async () => {
  const calls: FetchCall[] = [];
  const fetcher: typeof fetch = async (input, init = {}) => {
    calls.push({ url: inputUrl(input), init });
    if (calls.length <= 3) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ type: "conversation.list", pages: {} }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  };
  const client = new IntercomProviderClient(intercomConfig, fetcher);

  const account = await client.validateAccount("fake-access-token", "us");

  assertFixedRequest(calls[0], "https://api.intercom.io/me", "GET");
  assertFixedRequest(calls[1], "https://api.eu.intercom.io/me", "GET");
  assertFixedRequest(calls[2], "https://api.au.intercom.io/me", "GET");
  assertFixedRequest(
    calls[3],
    "https://api.intercom.io/conversations?per_page=1",
    "GET",
  );
  assert.deepEqual(account, {
    provider: "intercom",
    region: "us",
    admin: { id: null, name: null },
    workspace: { id: null, name: null },
  });
  assert.equal(calls.length, 4);
});

test("Sentry authorization uses the fixed host, exact read scopes, and S256 PKCE", () => {
  const client = new SentryProviderClient(sentryConfig, (() => {
    throw new Error("Authorization URL construction must not call fetch.");
  }) as typeof fetch);

  const url = new URL(
    client.authorizationUrl("oauth-state", "fake-pkce-challenge"),
  );

  assert.equal(url.origin, "https://sentry.io");
  assert.equal(url.pathname, "/oauth/authorize/");
  assert.equal([...url.searchParams].length, 7);
  assert.deepEqual(searchParameters(url), {
    client_id: sentryConfig.clientId,
    redirect_uri: sentryConfig.redirectUri,
    response_type: "code",
    scope: "org:read project:read event:read",
    state: "oauth-state",
    code_challenge: "fake-pkce-challenge",
    code_challenge_method: "S256",
  });
});

test("Sentry exchanges the code and verifier only at the fixed token endpoint", async () => {
  const { calls, fetcher } = fakeJsonFetch({
    access_token: "fake-sentry-access-token",
    refresh_token: "fake-sentry-refresh-token",
    token_type: "bearer",
    scope: sentryScopes.join(" "),
    expires_at: "2030-01-02T03:04:05.000Z",
  });
  const client = new SentryProviderClient(sentryConfig, fetcher);

  const token = await client.exchangeCode(
    "fake-authorization-code",
    "fake-pkce-verifier",
  );

  assertFixedRequest(calls[0], "https://sentry.io/oauth/token/", "POST");
  assert.equal(
    new Headers(calls[0]?.init.headers).get("content-type"),
    "application/x-www-form-urlencoded",
  );
  assert.deepEqual(formBody(calls[0]), {
    client_id: sentryConfig.clientId,
    client_secret: sentryConfig.clientSecret,
    grant_type: "authorization_code",
    code: "fake-authorization-code",
    code_verifier: "fake-pkce-verifier",
    redirect_uri: sentryConfig.redirectUri,
  });
  assert.deepEqual(token, {
    accessToken: "fake-sentry-access-token",
    refreshToken: "fake-sentry-refresh-token",
    tokenType: "bearer",
    grantedScopes: [...sentryScopes],
    expiresAt: new Date("2030-01-02T03:04:05.000Z"),
  });
  assert.equal(calls.length, 1);
});

test("Sentry rejects token responses without exactly the required scopes", async () => {
  for (const grantedScope of [
    "org:read project:read",
    "org:read project:read event:read team:read",
  ]) {
    const { calls, fetcher } = fakeJsonFetch({
      access_token: "fake-sentry-access-token",
      token_type: "bearer",
      scope: grantedScope,
    });
    const client = new SentryProviderClient(sentryConfig, fetcher);

    await assert.rejects(
      () => client.exchangeCode("fake-code", "fake-verifier"),
      (error: unknown) => {
        assert.ok(error instanceof IntegrationFlowError);
        assert.equal(error.reason, "invalid_grant");
        assert.equal(
          error.message,
          "Sentry did not grant the required read-only scopes.",
        );
        return true;
      },
    );
    assertFixedRequest(calls[0], "https://sentry.io/oauth/token/", "POST");
    assert.equal(calls.length, 1);
  }
});

test("Sentry validates organizations through the fixed endpoint and normalizes trusted region URLs", async () => {
  const { calls, fetcher } = fakeJsonFetch([
    {
      id: "organization-1",
      slug: "acme",
      name: "Acme",
      links: { regionUrl: "https://us.sentry.io/api/0/" },
    },
  ]);
  const client = new SentryProviderClient(sentryConfig, fetcher);

  const account = await client.validateAccount("fake-sentry-access-token");

  assertFixedRequest(calls[0], "https://sentry.io/api/0/organizations/", "GET");
  assert.equal(
    new Headers(calls[0]?.init.headers).get("authorization"),
    "Bearer fake-sentry-access-token",
  );
  assert.equal(calls[0]?.init.body, undefined);
  assert.deepEqual(account, {
    provider: "sentry",
    organizations: [
      {
        id: "organization-1",
        slug: "acme",
        name: "Acme",
        apiBaseUrl: "https://us.sentry.io",
      },
    ],
  });
  assert.equal(calls.length, 1);
});

test("Sentry rejects an organization response containing an untrusted region URL", async () => {
  const { calls, fetcher } = fakeJsonFetch([
    {
      id: "organization-1",
      slug: "acme",
      name: "Acme",
      links: { regionUrl: "https://us.sentry.io.attacker.example/api/0/" },
    },
  ]);
  const client = new SentryProviderClient(sentryConfig, fetcher);

  await assert.rejects(
    () => client.validateAccount("fake-sentry-access-token"),
    (error: unknown) => {
      assert.ok(error instanceof IntegrationFlowError);
      assert.equal(error.reason, "provider_rejected");
      assert.equal(
        error.message,
        "Sentry returned an untrusted regional API URL.",
      );
      return true;
    },
  );
  assertFixedRequest(calls[0], "https://sentry.io/api/0/organizations/", "GET");
  assert.equal(calls.length, 1);
});

test("Notion authorization uses the fixed OAuth host and CSRF state", () => {
  const client = new NotionProviderClient(notionConfig, (() => {
    throw new Error("Authorization URL construction must not call fetch.");
  }) as typeof fetch);

  const url = new URL(client.authorizationUrl("oauth-state"));

  assert.equal(url.origin, "https://api.notion.com");
  assert.equal(url.pathname, "/v1/oauth/authorize");
  assert.deepEqual(searchParameters(url), {
    client_id: notionConfig.clientId,
    redirect_uri: notionConfig.redirectUri,
    response_type: "code",
    owner: "user",
    state: "oauth-state",
  });
});

test("Notion exchanges credentials only at fixed endpoints and validates the workspace bot", async () => {
  const { calls, fetcher } = fakeJsonFetch(
    {
      access_token: "fake-notion-access-token",
      refresh_token: "fake-notion-refresh-token",
      token_type: "bearer",
    },
    {
      object: "user",
      id: "3c90c3cc-0d44-4b50-8888-d1ef79372b75",
      avatar_url: "https://images.example.test/notion.png",
      type: "bot",
      bot: {
        workspace_name: "Acme knowledge",
        workspace_id: "b55c9c91-384d-452b-81db-d1ef79372b75",
      },
    },
    { request_id: "3c90c3cc-0d44-4b50-8888-d1ef79372b75" },
  );
  const client = new NotionProviderClient(notionConfig, fetcher);

  const token = await client.exchangeCode("fake-notion-code");
  assertFixedRequest(calls[0], "https://api.notion.com/v1/oauth/token", "POST");
  const tokenHeaders = new Headers(calls[0]?.init.headers);
  assert.equal(
    tokenHeaders.get("authorization"),
    `Basic ${Buffer.from(`${notionConfig.clientId}:${notionConfig.clientSecret}`).toString("base64")}`,
  );
  assert.equal(tokenHeaders.get("notion-version"), "2026-03-11");
  assert.deepEqual(jsonBody(calls[0]), {
    grant_type: "authorization_code",
    code: "fake-notion-code",
    redirect_uri: notionConfig.redirectUri,
  });
  assert.deepEqual(token, {
    accessToken: "fake-notion-access-token",
    refreshToken: "fake-notion-refresh-token",
    tokenType: "bearer",
    grantedScopes: [...notionReadPermissions],
    expiresAt: null,
  });

  const account = await client.validateAccount(token.accessToken);
  assertFixedRequest(calls[1], "https://api.notion.com/v1/users/me", "GET");
  assert.equal(
    new Headers(calls[1]?.init.headers).get("authorization"),
    "Bearer fake-notion-access-token",
  );
  assert.deepEqual(account, {
    provider: "notion",
    botId: "3c90c3cc-0d44-4b50-8888-d1ef79372b75",
    workspace: {
      id: "b55c9c91-384d-452b-81db-d1ef79372b75",
      name: "Acme knowledge",
      icon: "https://images.example.test/notion.png",
    },
  });

  await client.revoke(token.accessToken);
  assertFixedRequest(
    calls[2],
    "https://api.notion.com/v1/oauth/revoke",
    "POST",
  );
  assert.deepEqual(jsonBody(calls[2]), { token: "fake-notion-access-token" });
  assert.equal(calls.length, 3);
});
