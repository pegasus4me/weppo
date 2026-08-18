import assert from "node:assert/strict";
import { test } from "node:test";

import type { IntegrationReadClients } from "../src/modules/integrations/ports.js";
import type { InvestigationCase } from "../src/modules/investigations/domain.js";
import { IntercomInvestigationRunner } from "../src/modules/investigations/intercom-runner.js";

test("Intercom runner searches Sentry by customer identity and conversation time", async () => {
  let searchInput: unknown;
  const clients = {
    sentry: {
      async searchErrorEvents(_workspaceId: string, input: unknown) {
        searchInput = input;
        return [
          {
            organizationSlug: "northstar",
            data: [
              {
                id: "event-1",
                title: "InvoiceExportTimeoutError",
                project: "northstar-web",
                timestamp: "2026-08-10T10:00:00.000Z",
              },
            ],
          },
        ];
      },
    },
  } as unknown as IntegrationReadClients;
  const investigation = {
    id: "case-1",
    workspaceId: "workspace-1",
    title: "Invoice export failure",
    status: "investigating",
    ticket: {
      provider: "intercom",
      externalId: "conversation-42",
      report: "Maya: The invoice export keeps failing.",
      customerEmail: "maya@example.com",
      occurredAt: "2026-08-10T10:02:00.000Z",
    },
    reconstructed: {
      customer: "Maya Chen",
      environment: null,
      impact: null,
      summary: "Invoice export failure",
      evidence: [],
      hypotheses: [],
      branches: [],
      knowledgeRetrieval: [],
      missingInformation: [],
      engineeringDraft: null,
    },
    createdBy: "intercom-admin:1",
    createdAt: "2026-08-10T10:02:00.000Z",
    updatedAt: "2026-08-10T10:02:00.000Z",
  } satisfies InvestigationCase;
  const steps = [];
  for await (const step of new IntercomInvestigationRunner(clients).run(
    investigation,
    new AbortController().signal,
  )) {
    steps.push(step);
  }

  assert.deepEqual(searchInput, {
    query: 'user.email:"maya@example.com"',
    start: "2026-08-10T09:32:00.000Z",
    end: "2026-08-10T10:12:00.000Z",
    limit: 20,
  });
  assert.ok(steps.some((step) => step.event.type === "finding.added"));
  const evidence = steps.find((step) => step.event.evidence)?.event.evidence;
  assert.equal(evidence?.details?.find((detail) => detail.label === "Sentry event")?.value, "event-1");
  assert.match(evidence?.summary ?? "", /workflow correlation/);
  assert.doesNotMatch(evidence?.summary ?? "", /directly matches/);
  assert.equal(steps.at(-1)?.patch?.status, "ready-for-review");
});

test("Intercom runner excludes unrelated customer errors and inspects matching issue evidence", async () => {
  const inspected: string[] = [];
  const clients = {
    sentry: {
      async searchErrorEvents() {
        return [
          {
            organizationSlug: "northstar",
            data: [
              {
                id: "invoice-event",
                issue: "invoice-issue",
                title: "InvoiceExportTimeoutError",
                message: "Invoice export query exceeded the 30 second timeout",
                project: "northstar-web",
                timestamp: "2026-08-10T10:00:00.000Z",
              },
              {
                id: "subscription-event",
                issue: "subscription-issue",
                title: "SubscriptionVersionConflictError",
                message: "Expected account version 184 but received version 181",
                project: "northstar-web",
                timestamp: "2026-08-10T10:01:00.000Z",
              },
            ],
          },
        ];
      },
      async getIssue(_workspaceId: string, _organization: string, issueId: string) {
        inspected.push(`issue:${issueId}`);
        return { id: issueId, title: "Invoice export timeout" };
      },
      async getIssueEvent(
        _workspaceId: string,
        _organization: string,
        issueId: string,
        eventId?: string,
      ) {
        inspected.push(`event:${issueId}:${eventId}`);
        return { exception: { values: [{ value: "Timed out after 30 seconds" }] } };
      },
    },
    notion: {
      async searchPages(_workspaceId: string, query?: string) {
        return {
          results: [
            {
              id: "runbook-1",
              url: "https://notion.so/invoice-export-runbook",
              properties: {
                Name: {
                  type: "title",
                  title: [{ plain_text: `${query} runbook` }],
                },
              },
            },
          ],
        };
      },
      async getPageMarkdown() {
        return {
          markdown:
            "# Export investigation\nLocate the pipeline stage before selecting a root-cause hypothesis.",
        };
      },
    },
  } as unknown as IntegrationReadClients;
  const investigation = {
    id: "case-2",
    workspaceId: "workspace-1",
    title: "Invoice export failure",
    status: "investigating",
    ticket: {
      provider: "intercom",
      report: "The July invoice CSV export fails.",
      customerEmail: "maya@example.com",
      occurredAt: "2026-08-10T10:02:00.000Z",
    },
    reconstructed: {
      customer: "Maya Chen",
      environment: null,
      impact: null,
      summary: "Invoice export failure",
      evidence: [],
      hypotheses: [],
      branches: [],
      knowledgeRetrieval: [],
      missingInformation: [],
      engineeringDraft: null,
    },
    createdBy: "intercom-admin:1",
    createdAt: "2026-08-10T10:02:00.000Z",
    updatedAt: "2026-08-10T10:02:00.000Z",
  } satisfies InvestigationCase;
  const steps = [];
  for await (const step of new IntercomInvestigationRunner(clients).run(
    investigation,
    new AbortController().signal,
  )) {
    steps.push(step);
  }

  assert.deepEqual(inspected, [
    "issue:invoice-issue",
    "event:invoice-issue:invoice-event",
  ]);
  assert.ok(steps.some((step) => step.event.title === "Searching internal knowledge"));
  assert.ok(steps.some((step) => step.event.title === "Timeline reconstructed"));
  assert.ok(
    steps.some(
      (step) => step.event.evidence?.source === "Notion",
    ),
  );
  assert.equal(steps.at(-1)?.patch?.hypotheses?.length, 1);
  const branch = steps.at(-1)?.patch?.branches?.[0];
  assert.equal(branch?.id, "invoice-export");
  assert.equal(branch?.status, "blocked");
  assert.equal(
    branch?.nextStep?.source,
    "Invoice export job and request trace",
  );
  assert.match(branch?.conclusion ?? "", /does not identify/);
  assert.equal(branch?.evidenceIds.length, 2);
  const sentryEvidence = steps.find((step) => step.event.evidence?.source.startsWith("Sentry"))?.event.evidence;
  assert.equal(
    sentryEvidence?.sourceUrl,
    "https://northstar.sentry.io/issues/invoice-issue/",
  );
});

test("Intercom runner reads a shared Notion page once and keeps it out of an unrelated branch", async () => {
  let markdownReads = 0;
  const clients = {
    sentry: {
      async searchErrorEvents() {
        return [{
          organizationSlug: "northstar",
          data: [
            {
              id: "webhook-event",
              issue: "webhook-issue",
              title: "WebhookDeliveryExhaustedError",
              message: "Webhook delivery failed after 8 attempts with HTTP 401",
              timestamp: "2026-08-10T10:00:00.000Z",
            },
            {
              id: "invoice-event",
              issue: "invoice-issue",
              title: "InvoiceExportTimeoutError",
              message: "Invoice export query exceeded the 30 second timeout",
              timestamp: "2026-08-10T10:01:00.000Z",
            },
            {
              id: "webhook-event-duplicate",
              issue: "webhook-issue",
              title: "WebhookDeliveryExhaustedError",
              message: "Webhook delivery failed after 8 attempts with HTTP 401",
              timestamp: "2026-08-10T10:02:00.000Z",
            },
          ],
        }];
      },
      async getIssue(_workspaceId: string, _organization: string, id: string) {
        return { id };
      },
      async getIssueEvent(_workspaceId: string, _organization: string, issueId: string) {
        return issueId === "webhook-issue"
          ? { exception: { values: [{ value: "HTTP 401" }] } }
          : { exception: { values: [{ value: "Timed out after 30 seconds" }] } };
      },
    },
    notion: {
      async searchPages() {
        return {
          results: [{
            id: "delivery-guide",
            url: "https://notion.so/delivery-guide",
            properties: {
              Name: {
                type: "title",
                title: [{ plain_text: "Delivery pipeline investigation guide" }],
              },
            },
          }],
        };
      },
      async getPageMarkdown() {
        markdownReads += 1;
        return {
          markdown: "# Delivery pipeline\nUse this guide when a customer reports a webhook delivery failure. Compare endpoint authentication and retries.",
        };
      },
    },
  } as unknown as IntegrationReadClients;
  const investigation = {
    id: "case-3",
    workspaceId: "workspace-1",
    title: "Webhook retry and invoice export failure",
    status: "investigating",
    ticket: {
      provider: "intercom",
      report: "Retrying webhook deliveries fails and the July invoice CSV export fails.",
      customerEmail: "maya@example.com",
      occurredAt: "2026-08-10T10:02:00.000Z",
    },
    reconstructed: {
      customer: "Maya Chen",
      environment: null,
      impact: null,
      summary: "Webhook retry and invoice export failure",
      evidence: [],
      hypotheses: [],
      branches: [],
      knowledgeRetrieval: [],
      missingInformation: [],
      engineeringDraft: null,
    },
    createdBy: "intercom-admin:1",
    createdAt: "2026-08-10T10:02:00.000Z",
    updatedAt: "2026-08-10T10:02:00.000Z",
  } satisfies InvestigationCase;

  const steps = [];
  for await (const step of new IntercomInvestigationRunner(clients).run(
    investigation,
    new AbortController().signal,
  )) {
    steps.push(step);
  }

  assert.equal(markdownReads, 1);
  assert.ok(steps.some((step) => step.event.title === "Selecting branch evidence"));
  const branches = steps.at(-1)?.patch?.branches ?? [];
  const webhook = branches.find((branch) => branch.id === "webhook-retry");
  const invoice = branches.find((branch) => branch.id === "invoice-export");
  assert.equal(webhook?.evidenceIds.length, 2);
  assert.equal(invoice?.evidenceIds.length, 1);
  assert.match(
    invoice?.limitations.join(" ") ?? "",
    /No relevant readable Notion guidance/,
  );
  const notionEvidence = steps.find((step) => step.event.evidence?.source === "Notion")?.event.evidence;
  assert.equal(
    notionEvidence?.details?.find((detail) => detail.label === "Matched branches")?.value,
    "webhook-retry",
  );
  assert.equal(
    steps.at(-1)?.patch?.knowledgeRetrieval?.find(
      (step) => step.id === "targeted-reading",
    )?.status,
    "completed",
  );
});

test("Intercom runner does not add an invoice error to a webhook-only ticket", async () => {
  const clients = {
    sentry: {
      async searchErrorEvents() {
        return [{
          organizationSlug: "northstar",
          data: [
            {
              id: "webhook-event",
              issue: "webhook-issue",
              title: "WebhookDeliveryExhaustedError",
              message: "Webhook delivery failed after 8 attempts with HTTP 401",
              timestamp: "2026-08-10T10:00:00.000Z",
            },
            {
              id: "invoice-event",
              issue: "invoice-issue",
              title: "InvoiceExportTimeoutError",
              message: "Invoice export query exceeded the 30 second timeout",
              timestamp: "2026-08-10T10:01:00.000Z",
            },
          ],
        }];
      },
      async getIssue(_workspaceId: string, _organization: string, id: string) {
        return { id };
      },
      async getIssueEvent() {
        return { exception: { values: [{ value: "HTTP 401" }] } };
      },
    },
  } as unknown as IntegrationReadClients;
  const investigation = {
    id: "case-4",
    workspaceId: "workspace-1",
    title: "Webhook retry failure",
    status: "investigating",
    ticket: {
      provider: "intercom",
      report: "Retrying failed webhook deliveries returns an unexpected error.",
      customerEmail: "maya@example.com",
      occurredAt: "2026-08-10T10:02:00.000Z",
    },
    reconstructed: {
      customer: "Maya Chen",
      environment: null,
      impact: null,
      summary: "Webhook retry failure",
      evidence: [],
      hypotheses: [],
      branches: [],
      knowledgeRetrieval: [],
      missingInformation: [],
      engineeringDraft: null,
    },
    createdBy: "intercom-admin:1",
    createdAt: "2026-08-10T10:02:00.000Z",
    updatedAt: "2026-08-10T10:02:00.000Z",
  } satisfies InvestigationCase;

  const steps = [];
  for await (const step of new IntercomInvestigationRunner(clients).run(
    investigation,
    new AbortController().signal,
  )) {
    steps.push(step);
  }

  const branches = steps.at(-1)?.patch?.branches ?? [];
  assert.deepEqual(branches.map((branch) => branch.id), ["webhook-retry"]);
  assert.equal(
    steps.some((step) => step.event.title.includes("InvoiceExportTimeoutError")),
    false,
  );
  const triage = steps.find((step) => step.event.title === "Triaging Sentry candidates");
  assert.equal(
    triage?.event.details?.find((detail) => detail.label === "Ticket-scoped workflows")?.value,
    "failed webhook retry",
  );
});

test("Intercom runner uses planner-defined scope for an unfamiliar complex ticket", async () => {
  const clients = {
    sentry: {
      async searchErrorEvents() {
        return [{
          organizationSlug: "northstar",
          data: [
            {
              id: "partner-auth-event",
              issue: "partner-auth-issue",
              title: "PartnerEndpointAuthorizationError",
              message: "Outbound delivery attempt received an authorization response with HTTP 401",
              timestamp: "2026-08-10T10:00:00.000Z",
            },
            {
              id: "invoice-event",
              issue: "invoice-issue",
              title: "InvoiceExportTimeoutError",
              message: "Invoice export query exceeded the 30 second timeout",
              timestamp: "2026-08-10T10:01:00.000Z",
            },
          ],
        }];
      },
      async getIssue(_workspaceId: string, _organization: string, id: string) {
        return { id };
      },
      async getIssueEvent() {
        return { exception: { values: [{ value: "HTTP 401" }] } };
      },
    },
  } as unknown as IntegrationReadClients;
  const investigation = {
    id: "case-5",
    workspaceId: "workspace-1",
    title: "Partner feed stopped after credential rotation",
    status: "investigating",
    ticket: {
      provider: "intercom",
      report: "Our downstream partner has stopped receiving the nightly fulfillment feed after we rotated credentials.",
      customerEmail: "maya@example.com",
      occurredAt: "2026-08-10T10:02:00.000Z",
    },
    reconstructed: {
      customer: "Maya Chen",
      environment: null,
      impact: null,
      summary: "Partner feed failure",
      ticketScope: {
        problems: [{
          id: "partner-fulfillment-feed",
          label: "partner fulfillment feed stopped after credential rotation",
          productArea: "Partner fulfillment delivery",
          action: "Deliver the nightly fulfillment feed",
          expectedBehavior: "The partner receives the nightly feed.",
          observedBehavior: "The partner no longer receives the feed after credential rotation.",
          searchSignals: ["partner endpoint", "outbound delivery", "authorization response", "HTTP 401"],
          identifiers: [],
          ticketEvidence: ["Partner stopped receiving the nightly fulfillment feed after credential rotation."],
          confidence: "high",
        }],
        ambiguities: ["The ticket does not name the destination endpoint."],
      },
      evidence: [],
      hypotheses: [],
      branches: [],
      knowledgeRetrieval: [],
      missingInformation: [],
      engineeringDraft: null,
    },
    createdBy: "intercom-admin:1",
    createdAt: "2026-08-10T10:02:00.000Z",
    updatedAt: "2026-08-10T10:02:00.000Z",
  } satisfies InvestigationCase;

  const steps = [];
  for await (const step of new IntercomInvestigationRunner(clients).run(
    investigation,
    new AbortController().signal,
  )) {
    steps.push(step);
  }

  assert.deepEqual(
    steps.at(-1)?.patch?.branches?.map((branch) => branch.id),
    ["partner-fulfillment-feed"],
  );
  assert.ok(
    steps.some((step) => step.event.title.includes("PartnerEndpointAuthorizationError")),
  );
  assert.equal(
    steps.some((step) => step.event.title.includes("InvoiceExportTimeoutError")),
    false,
  );
});

test("Intercom runner keeps every ticket-scoped problem when only one has Sentry evidence", async () => {
  const clients = {
    sentry: {
      async searchErrorEvents() {
        return [{
          organizationSlug: "northstar",
          data: [{
            id: "invoice-event",
            issue: "invoice-issue",
            title: "InvoiceExportTimeoutError",
            message: "Invoice export query exceeded the 30 second timeout",
            timestamp: "2026-08-10T10:01:00.000Z",
          }],
        }];
      },
      async getIssue(_workspaceId: string, _organization: string, id: string) {
        return { id };
      },
      async getIssueEvent() {
        return { exception: { values: [{ value: "Timed out after 30 seconds" }] } };
      },
    },
  } as unknown as IntegrationReadClients;
  const investigation = {
    id: "case-6",
    workspaceId: "workspace-1",
    title: "Webhook retry and invoice export failure",
    status: "investigating",
    ticket: {
      provider: "intercom",
      report: "Webhook retry and invoice export both fail.",
      customerEmail: "maya@example.com",
      occurredAt: "2026-08-10T10:02:00.000Z",
    },
    reconstructed: {
      customer: "Maya Chen",
      environment: null,
      impact: null,
      summary: "Two reported failures",
      ticketScope: {
        problems: [
          {
            id: "webhook-retry",
            label: "failed webhook retry",
            productArea: "Webhook delivery",
            action: "Retry the failed webhook delivery",
            expectedBehavior: "The delivery is retried.",
            observedBehavior: "The retry fails.",
            searchSignals: ["webhook delivery", "retry", "HTTP 401"],
            identifiers: [],
            ticketEvidence: ["Webhook retry fails."],
            confidence: "high",
          },
          {
            id: "invoice-export",
            label: "July invoice CSV export fails",
            productArea: "Invoice export",
            action: "Export the July invoice CSV",
            expectedBehavior: "The CSV downloads.",
            observedBehavior: "The export fails.",
            searchSignals: ["invoice export", "CSV", "timeout"],
            identifiers: [],
            ticketEvidence: ["July invoice CSV export fails."],
            confidence: "high",
          },
        ],
        ambiguities: [],
      },
      evidence: [],
      hypotheses: [],
      branches: [],
      knowledgeRetrieval: [],
      missingInformation: [],
      engineeringDraft: null,
    },
    createdBy: "intercom-admin:1",
    createdAt: "2026-08-10T10:02:00.000Z",
    updatedAt: "2026-08-10T10:02:00.000Z",
  } satisfies InvestigationCase;

  const steps = [];
  for await (const step of new IntercomInvestigationRunner(clients).run(
    investigation,
    new AbortController().signal,
  )) {
    steps.push(step);
  }

  const branches = steps.at(-1)?.patch?.branches ?? [];
  assert.deepEqual(branches.map((branch) => branch.id), ["webhook-retry", "invoice-export"]);
  assert.equal(branches[0]?.status, "needs-input");
  assert.match(branches[0]?.conclusion ?? "", /No Sentry error event/);
  assert.equal(branches[1]?.status, "blocked");
  assert.equal(steps.at(-1)?.patch?.hypotheses?.length, 1);
});
