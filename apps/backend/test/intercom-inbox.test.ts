import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import Fastify from "fastify";

import { intercomInboxRoutes } from "../src/modules/intercom-inbox/routes.js";
import type { IntegrationReadClients } from "../src/modules/integrations/ports.js";
import type { IntegrationService } from "../src/modules/integrations/service.js";
import { InMemoryAgentEventSubscription } from "../src/modules/investigations/event-subscription.js";
import { InMemoryInvestigationRepository } from "../src/modules/investigations/in-memory-repository.js";
import type { InvestigationRunner } from "../src/modules/investigations/ports.js";
import { InvestigationService } from "../src/modules/investigations/service.js";

const secret = "intercom-canvas-secret";
const workspaceId = "weppo-workspace-1";
const payload = {
  workspace_id: "intercom-workspace-1",
  component_id: "investigate_with_weppo",
  admin: { id: "admin-1", name: "Support Engineer" },
  conversation: { id: "conversation-42" },
  contact: { name: "Maya Chen", email: "maya@example.com" },
};

const idleRunner: InvestigationRunner = {
  async *run() {
    // Canvas route tests only need to verify creation and idempotency.
  },
};

function signedBody(value: unknown) {
  const body = JSON.stringify(value);
  return {
    body,
    signature: createHmac("sha256", secret).update(body).digest("hex"),
  };
}

test("Intercom Inbox Canvas verifies signatures and creates one investigation per conversation", async () => {
  const repository = new InMemoryInvestigationRepository();
  const investigations = new InvestigationService(
    repository,
    idleRunner,
    new InMemoryAgentEventSubscription(),
  );
  let conversationReads = 0;
  const readClients = {
    intercom: {
      async getConversation() {
        conversationReads += 1;
        return {
          created_at: 1_788_000_000,
          conversation_message: {
            body: "The invoice export keeps failing.",
            created_at: 1_788_000_000,
            author: { name: "Maya Chen", email: "maya@example.com" },
          },
          conversation_parts: { conversation_parts: [] },
        };
      },
    },
    sentry: {},
    notion: {},
  } as unknown as IntegrationReadClients;
  const integrations = {
    async resolveIntercomWorkspace(intercomWorkspaceId: string) {
      return intercomWorkspaceId === payload.workspace_id ? workspaceId : null;
    },
  } as unknown as IntegrationService;
  const app = Fastify();
  await app.register(intercomInboxRoutes, {
    clientSecret: secret,
    integrations,
    readClients,
    investigations,
    webOrigin: "https://weppo.test",
  });

  const unsigned = await app.inject({
    method: "POST",
    url: "/api/v1/intercom/inbox/submit",
    headers: { "content-type": "application/json", "x-body-signature": "bad" },
    payload: JSON.stringify(payload),
  });
  assert.equal(unsigned.statusCode, 401);

  const signed = signedBody(payload);
  const first = await app.inject({
    method: "POST",
    url: "/api/v1/intercom/inbox/submit",
    headers: {
      "content-type": "application/json",
      "x-body-signature": signed.signature,
    },
    payload: signed.body,
  });
  assert.equal(first.statusCode, 200);
  assert.match(first.body, /Investigation started/);

  const second = await app.inject({
    method: "POST",
    url: "/api/v1/intercom/inbox/submit",
    headers: {
      "content-type": "application/json",
      "x-body-signature": signed.signature,
    },
    payload: signed.body,
  });
  assert.equal(second.statusCode, 200);
  assert.match(second.body, /already started/);
  assert.equal(conversationReads, 1);

  const cases = await investigations.list({ userId: "admin-1", workspaceId });
  assert.equal(cases.length, 1);
  assert.equal(cases[0]?.ticket.provider, "intercom");
  assert.equal(cases[0]?.ticket.externalId, "conversation-42");
  assert.equal(cases[0]?.ticket.customerEmail, "maya@example.com");
  assert.match(cases[0]?.ticket.report ?? "", /invoice export keeps failing/i);

  await app.close();
  investigations.close();
});
