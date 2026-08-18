import assert from "node:assert/strict";
import { test } from "node:test";

import {
  IntegrationSecretCipher,
  secretAssociatedData,
} from "../src/modules/integrations/crypto.js";
import type {
  ConsumedOAuthSession,
  IntegrationConnectionSummary,
  IntegrationProvider,
  StoredIntegrationConnection,
} from "../src/modules/integrations/domain.js";
import type { IntegrationRepository } from "../src/modules/integrations/ports.js";
import { createIntegrationReadClients } from "../src/modules/integrations/read-clients.js";

const workspaceId = "workspace-1";
const cipher = new IntegrationSecretCipher(
  Buffer.alloc(32, 4).toString("base64"),
);

class StaticRepository implements IntegrationRepository {
  constructor(readonly connection: StoredIntegrationConnection) {}

  async createOAuthSession() {}
  async consumeOAuthSession(): Promise<ConsumedOAuthSession | null> {
    return null;
  }
  async listConnections(): Promise<IntegrationConnectionSummary[]> {
    return [];
  }
  async getConnection(
    requestedWorkspaceId: string,
    provider: IntegrationProvider,
  ) {
    return requestedWorkspaceId === this.connection.workspaceId &&
      provider === this.connection.provider
      ? structuredClone(this.connection)
      : null;
  }
  async findWorkspaceIdByIntercomWorkspaceId() {
    return null;
  }
  async upsertConnection() {
    throw new Error("Not implemented in this test repository.");
  }
  async deleteConnection() {
    return false;
  }
}

function connection(
  provider: "intercom" | "sentry" | "notion",
  account: StoredIntegrationConnection["account"],
  expiresAt: Date | null = null,
): StoredIntegrationConnection {
  return {
    id: "connection-private-id",
    workspaceId,
    provider,
    encryptedAccessToken: cipher.encrypt(
      `${provider}-access-secret`,
      secretAssociatedData(workspaceId, provider, "access"),
    ),
    encryptedRefreshToken: null,
    tokenType: "Bearer",
    grantedScopes: [],
    account,
    expiresAt,
    connectedBy: "user-1",
    connectedAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

test("Intercom read client uses a fixed regional GET with normalized plaintext", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const fetcher = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    requestUrl = String(input);
    requestInit = init;
    return Response.json({ id: "conversation-result" });
  }) as typeof fetch;
  const repository = new StaticRepository(
    connection("intercom", {
      provider: "intercom",
      region: "eu",
      admin: { id: "admin", name: null },
      workspace: { id: "workspace", name: "Acme" },
    }),
  );
  const clients = createIntegrationReadClients(repository, cipher, fetcher);

  await clients.intercom.getConversation(workspaceId, "conversation/42?");

  assert.equal(
    requestUrl,
    "https://api.eu.intercom.io/conversations/conversation%2F42%3F?display_as=plaintext",
  );
  assert.equal(requestInit?.method, "GET");
  assert.deepEqual(requestInit?.headers, {
    authorization: "Bearer intercom-access-secret",
    "intercom-version": "2.15",
  });
});

test("Sentry read clients enforce connected org and encode every path segment", async () => {
  const requests: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    requests.push(String(input));
    return Response.json({ ok: true });
  }) as typeof fetch;
  const repository = new StaticRepository(
    connection("sentry", {
      provider: "sentry",
      organizations: [
        {
          id: "org-id",
          slug: "acme/eu",
          name: "Acme EU",
          apiBaseUrl: "https://de.sentry.io",
        },
      ],
    }),
  );
  const clients = createIntegrationReadClients(repository, cipher, fetcher);

  await clients.sentry.getIssue(workspaceId, "acme/eu", "issue/123");
  await clients.sentry.getIssueEvent(workspaceId, "acme/eu", "issue/123");

  assert.deepEqual(requests, [
    "https://de.sentry.io/api/0/organizations/acme%2Feu/issues/issue%2F123/",
    "https://de.sentry.io/api/0/organizations/acme%2Feu/issues/issue%2F123/events/latest/",
  ]);
  await assert.rejects(
    clients.sentry.getIssue(workspaceId, "another-org", "123"),
    /not connected/i,
  );
});

test("Sentry error search is bounded by identity, time, fields, and result limit", async () => {
  let requestUrl = "";
  const fetcher = (async (input: string | URL | Request) => {
    requestUrl = String(input);
    return Response.json({ data: [{ id: "event-1" }], meta: {} });
  }) as typeof fetch;
  const repository = new StaticRepository(
    connection("sentry", {
      provider: "sentry",
      organizations: [
        {
          id: "org-id",
          slug: "northstar",
          name: "Northstar",
          apiBaseUrl: "https://sentry.io",
        },
      ],
    }),
  );
  const clients = createIntegrationReadClients(repository, cipher, fetcher);

  const result = await clients.sentry.searchErrorEvents(workspaceId, {
    query: 'user.email:"maya@example.com"',
    start: "2026-08-10T09:30:00.000Z",
    end: "2026-08-10T10:10:00.000Z",
    limit: 20,
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/0/organizations/northstar/events/");
  assert.equal(url.searchParams.get("dataset"), "errors");
  assert.equal(url.searchParams.get("query"), 'user.email:"maya@example.com"');
  assert.equal(url.searchParams.get("start"), "2026-08-10T09:30:00.000Z");
  assert.equal(url.searchParams.get("end"), "2026-08-10T10:10:00.000Z");
  assert.equal(url.searchParams.get("per_page"), "20");
  assert.deepEqual(url.searchParams.getAll("field"), [
    "id",
    "project",
    "timestamp",
    "title",
    "message",
    "issue",
  ]);
  assert.deepEqual(result, [
    { organizationSlug: "northstar", data: [{ id: "event-1" }] },
  ]);
});

test("Sentry read client rejects stored untrusted hosts before sending a token", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls += 1;
    return Response.json({});
  }) as typeof fetch;
  const repository = new StaticRepository(
    connection("sentry", {
      provider: "sentry",
      organizations: [
        {
          id: "org-id",
          slug: "acme",
          name: "Acme",
          apiBaseUrl: "https://sentry.io.attacker.example",
        },
      ],
    }),
  );
  const clients = createIntegrationReadClients(repository, cipher, fetcher);

  await assert.rejects(
    clients.sentry.getIssue(workspaceId, "acme", "123"),
    /untrusted regional API URL/i,
  );
  assert.equal(calls, 0);
});

test("expired Sentry credentials require reauthorization without an API call", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls += 1;
    return Response.json({});
  }) as typeof fetch;
  const repository = new StaticRepository(
    connection(
      "sentry",
      {
        provider: "sentry",
        organizations: [
          {
            id: "org-id",
            slug: "acme",
            name: "Acme",
            apiBaseUrl: "https://sentry.io",
          },
        ],
      },
      new Date("2020-01-01T00:00:00.000Z"),
    ),
  );
  const clients = createIntegrationReadClients(repository, cipher, fetcher);

  await assert.rejects(
    clients.sentry.getIssue(workspaceId, "acme", "123"),
    /expired.*authorized again/i,
  );
  assert.equal(calls, 0);
});

test("Notion read client searches shared pages and retrieves Markdown from fixed endpoints", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    requests.push({ url: String(input), init });
    return Response.json({ object: "list", results: [] });
  }) as typeof fetch;
  const repository = new StaticRepository(
    connection("notion", {
      provider: "notion",
      botId: "bot-id",
      workspace: {
        id: "workspace-id",
        name: "Acme knowledge",
        icon: null,
      },
    }),
  );
  const clients = createIntegrationReadClients(repository, cipher, fetcher);

  await clients.notion.searchPages(workspaceId, "oauth failure");
  await clients.notion.getPageMarkdown(workspaceId, "page/id?");

  assert.equal(requests[0]?.url, "https://api.notion.com/v1/search");
  assert.equal(requests[0]?.init?.method, "POST");
  assert.equal(
    new Headers(requests[0]?.init?.headers).get("authorization"),
    "Bearer notion-access-secret",
  );
  assert.equal(
    new Headers(requests[0]?.init?.headers).get("notion-version"),
    "2026-03-11",
  );
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
    page_size: 100,
    filter: { property: "object", value: "page" },
    sort: { direction: "descending", timestamp: "last_edited_time" },
    query: "oauth failure",
  });
  assert.equal(
    requests[1]?.url,
    "https://api.notion.com/v1/pages/page%2Fid%3F/markdown",
  );
  assert.equal(requests[1]?.init?.method, "GET");
  assert.equal(requests.length, 2);
});
