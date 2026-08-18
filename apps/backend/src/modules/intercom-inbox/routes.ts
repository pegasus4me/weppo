import { createHmac, timingSafeEqual } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import type { IntegrationReadClients } from "../integrations/ports.js";
import type { IntegrationService } from "../integrations/service.js";
import type {
  InvestigationActor,
  TicketReference,
} from "../investigations/domain.js";
import type { InvestigationService } from "../investigations/service.js";

type IntercomInboxRoutesOptions = {
  clientSecret: string;
  integrations: IntegrationService;
  readClients: IntegrationReadClients;
  investigations: InvestigationService;
  webOrigin: string;
};

const canvasRequestSchema = z
  .object({
    workspace_id: z.string().trim().min(1).max(200).optional(),
    // Older Canvas payloads call this value app_id. Keep the signed payload
    // permissive at the boundary, then require one canonical identifier below.
    app_id: z.string().trim().min(1).max(200).optional(),
    component_id: z.string().trim().max(200).optional(),
    admin: z
      .object({
        id: z.union([z.string(), z.number()]).transform(String),
        name: z.string().optional(),
        email: z.string().optional(),
      })
      .passthrough(),
    conversation: z
      .object({
        id: z.union([z.string(), z.number()]).transform(String).optional(),
        conversation_id: z
          .union([z.string(), z.number()])
          .transform(String)
          .optional(),
      })
      .passthrough(),
    current_canvas: z.record(z.string(), z.unknown()).optional(),
    ticket: z
      .object({
        id: z.union([z.string(), z.number()]).transform(String).optional(),
        ticket_id: z
          .union([z.string(), z.number()])
          .transform(String)
          .optional(),
        ticket_attributes: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
    contact: z.record(z.string(), z.unknown()).optional(),
    customer: z.record(z.string(), z.unknown()).optional(),
    stored_data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

type CanvasPayload = z.infer<typeof canvasRequestSchema>;
type JsonRecord = Record<string, unknown>;
type CanvasVerification = {
  payload: CanvasPayload | null;
  signaturePresent: boolean;
  signatureMatches: boolean;
  payloadValid: boolean;
};

const canvasAuditFile = resolve(process.cwd(), "../../.hermes/intercom-canvas-audit.jsonl");

function auditCanvas(event: Record<string, unknown>) {
  if (process.env.WEPPO_DEBUG_INTERCOM_PAYLOAD !== "true") return;
  // Intentionally omit the customer, ticket body, request headers, and tokens.
  void appendFile(
    canvasAuditFile,
    `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`,
  ).catch(() => undefined);
}

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function plainText(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isoTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1_000).toISOString();
  }
  const text = stringValue(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function contactDetails(payload: CanvasPayload) {
  const contact = payload.contact ?? payload.customer ?? {};
  const name = stringValue(contact.name) ?? "Intercom customer";
  const email = stringValue(contact.email) ?? undefined;
  return { name, email };
}

function conversationId(payload: CanvasPayload) {
  return (
    payload.conversation.id ?? payload.conversation.conversation_id ?? null
  );
}

function canvasWorkspaceId(payload: CanvasPayload) {
  return payload.workspace_id ?? payload.app_id ?? null;
}

function canvasStoredData(payload: CanvasPayload) {
  const direct = payload.stored_data;
  if (direct) return direct;
  const currentCanvas = record(payload.current_canvas);
  return (
    record(currentCanvas?.stored_data) ??
    record(record(currentCanvas?.canvas)?.stored_data) ??
    undefined
  );
}

function ticketId(payload: CanvasPayload) {
  return payload.ticket?.id ?? payload.ticket?.ticket_id ?? null;
}

function conversationReport(value: unknown) {
  const response = record(value) ?? {};
  // API adapters may return the Conversation directly or wrap it in
  // `{ conversation }` / `{ data }`; normalize before reading its messages.
  const conversation =
    record(response.conversation) ?? record(response.data) ?? response;
  // Intercom's current Conversation API places the initial customer message
  // under `source`; `conversation_message` is retained for older payloads.
  const rootMessage =
    record(conversation.source) ?? record(conversation.conversation_message);
  const partsContainer = record(conversation.conversation_parts);
  const parts = Array.isArray(partsContainer?.conversation_parts)
    ? partsContainer.conversation_parts
    : [];
  const messages = [rootMessage, ...parts.map(record)].filter(
    (part): part is JsonRecord => Boolean(part),
  );
  const lines = messages.flatMap((message) => {
    const body = plainText(message.body);
    if (!body) return [];
    const author = record(message.author);
    const authorLabel =
      stringValue(author?.name) ?? stringValue(author?.email) ?? "Customer";
    const occurredAt = isoTimestamp(message.created_at);
    return [`${occurredAt ? `[${occurredAt}] ` : ""}${authorLabel}: ${body}`];
  });
  const fallback =
    plainText(rootMessage?.body) ?? "No message body was available.";
  return {
    report: (lines.length > 0 ? lines.join("\n\n") : fallback).slice(0, 30_000),
    title: undefined,
    occurredAt:
      isoTimestamp(rootMessage?.created_at) ??
      isoTimestamp(conversation.created_at) ??
      undefined,
  };
}

function ticketReport(value: unknown) {
  const response = record(value) ?? {};
  const ticket = record(response.ticket) ?? record(response.data) ?? response;
  const attributes = record(ticket.ticket_attributes) ?? {};
  const title =
    plainText(attributes._default_title_) ??
    plainText(attributes.default_title) ??
    plainText(ticket.title);
  const description =
    plainText(attributes._default_description_) ??
    plainText(attributes.default_description) ??
    plainText(ticket.description);
  return {
    report:
      (description ?? title ?? "No ticket description was available."
      ).slice(0, 30_000),
    title: title ?? undefined,
    occurredAt:
      isoTimestamp(ticket.updated_at) ?? isoTimestamp(ticket.created_at) ?? undefined,
  };
}

function intercomTicketContext(value: unknown) {
  const response = record(value) ?? {};
  const ticket = record(response.ticket) ?? record(response.data) ?? response;
  const attributes = record(ticket.ticket_attributes) ?? {};
  const contacts = record(ticket.contacts);
  const ticketContacts = Array.isArray(contacts?.contacts)
    ? contacts.contacts.map(record).filter((contact): contact is JsonRecord => Boolean(contact))
    : [];
  const contactIds = ticketContacts
    .map((contact) => stringValue(contact.id))
    .filter((id): id is string => Boolean(id));
  const contactExternalIds = ticketContacts
    .map((contact) => stringValue(contact.external_id))
    .filter((id): id is string => Boolean(id));
  const attributeValues = Object.fromEntries(
    Object.entries(attributes).flatMap(([key, value]) => {
      const text = stringValue(value);
      return text ? [[key, text]] : [];
    }),
  );
  const ticketState = record(ticket.ticket_state);
  const ticketType = record(ticket.ticket_type);
  return {
    ticketId: stringValue(ticket.id) ?? undefined,
    inboxTicketId: stringValue(ticket.ticket_id) ?? undefined,
    ticketState: stringValue(ticketState?.category) ?? undefined,
    ticketType: stringValue(ticketType?.name) ?? undefined,
    companyId: stringValue(ticket.company_id) ?? undefined,
    channel: stringValue(ticket.channel) ?? undefined,
    contactIds,
    contactExternalIds,
    attributes: attributeValues,
  };
}

function intercomContactContext(value: unknown) {
  const response = record(value) ?? {};
  const contact = record(response.contact) ?? record(response.data) ?? response;
  const companies = record(contact.companies);
  const companyIds = Array.isArray(companies?.data)
    ? companies.data
        .map(record)
        .map((company) => stringValue(company?.id))
        .filter((id): id is string => Boolean(id))
    : [];
  const customAttributes = Object.fromEntries(
    Object.entries(record(contact.custom_attributes) ?? {}).flatMap(([key, value]) => {
      const text = stringValue(value);
      return text ? [[key, text]] : [];
    }),
  );
  const activity = Object.fromEntries(
    [
      "created_at",
      "updated_at",
      "signed_up_at",
      "last_seen_at",
      "last_replied_at",
      "last_contacted_at",
    ].flatMap((key) => {
      const timestamp = isoTimestamp(contact[key]);
      return timestamp ? [[key, timestamp]] : [];
    }),
  );
  const location = record(contact.location);
  const locationLabel = [
    stringValue(location?.city),
    stringValue(location?.region),
    stringValue(location?.country),
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");
  return {
    id: stringValue(contact.id) ?? undefined,
    externalId: stringValue(contact.external_id) ?? undefined,
    email: stringValue(contact.email) ?? undefined,
    phone: stringValue(contact.phone) ?? undefined,
    name: stringValue(contact.name) ?? undefined,
    role: stringValue(contact.role) ?? undefined,
    workspaceId: stringValue(contact.workspace_id) ?? undefined,
    companyIds,
    browser: stringValue(contact.browser) ?? undefined,
    browserVersion: stringValue(contact.browser_version) ?? undefined,
    os: stringValue(contact.os) ?? undefined,
    language: stringValue(contact.browser_language) ?? undefined,
    location: locationLabel || undefined,
    customAttributes,
    activity,
  };
}

function canvas(components: JsonRecord[], storedData?: JsonRecord) {
  return {
    canvas: {
      content: { components },
      ...(storedData ? { stored_data: storedData } : {}),
    },
  };
}

function initialCanvas(connected: boolean) {
  if (!connected) {
    return canvas([
      {
        type: "text",
        id: "weppo-title",
        text: "Weppo",
        style: "header",
        align: "left",
      },
      {
        type: "text",
        id: "weppo-disconnected",
        text: "Connect this Intercom workspace in Weppo before starting an investigation.",
        style: "muted",
        align: "left",
      },
    ]);
  }
  return canvas([
    {
      type: "text",
      id: "weppo-title",
      text: "Weppo",
      style: "header",
      align: "left",
    },
    {
      type: "text",
      id: "weppo-description",
      text: "Investigate this customer issue using the conversation and connected telemetry.",
      align: "left",
    },
    {
      type: "button",
      id: "investigate_with_weppo",
      label: "Investigate with Weppo",
      style: "secondary",
      action: { type: "submit" },
    },
  ], { view: "initial" });
}

function startedCanvas(caseId: string, webOrigin: string, existing: boolean) {
  const components: JsonRecord[] = [
    {
      type: "text",
      id: "weppo-title",
      text: existing
        ? "Investigation already started"
        : "Investigation started",
      style: "header",
      align: "left",
    },
    {
      type: "text",
      id: "weppo-status",
      text: `Weppo is analyzing this conversation. Case ${caseId.slice(0, 8)} is available for review.`,
      align: "left",
    },
  ];
  if (new URL(webOrigin).protocol === "https:") {
    components.push({
      type: "button",
      id: "open_in_weppo",
      label: "Open in Weppo",
      style: "link",
      action: {
        type: "url",
        url: `${webOrigin}/dashboard/investigations/${encodeURIComponent(caseId)}`,
      },
    });
  }
  if (existing) {
    components.push({
      type: "button",
      id: "rerun_with_weppo",
      label: "Re-run investigation",
      style: "secondary",
      action: { type: "submit" },
    });
  }
  return canvas(components, { case_id: caseId, view: "started" });
}

function actorFor(
  payload: CanvasPayload,
  workspaceId: string,
): InvestigationActor {
  return {
    workspaceId,
    userId: `intercom-admin:${payload.admin.id}`,
  };
}

export const intercomInboxRoutes: FastifyPluginAsync<
  IntercomInboxRoutesOptions
> = async (
  app,
  { clientSecret, integrations, readClients, investigations, webOrigin },
) => {
  const bodySignatures = new WeakMap<FastifyRequest["raw"], string>();

  app.addHook("preParsing", (request, _reply, payload, done) => {
    const hmac = createHmac("sha256", clientSecret);
    payload.on("data", (chunk: Buffer | string) => hmac.update(chunk));
    payload.once("end", () =>
      bodySignatures.set(request.raw, hmac.digest("hex")),
    );
    done(null, payload);
  });

  function verifiedPayload(request: FastifyRequest): CanvasVerification {
    const supplied = request.headers["x-body-signature"];
    const expected = bodySignatures.get(request.raw);
    const signaturePresent = typeof supplied === "string" && supplied.length > 0;
    if (!signaturePresent || !expected) {
      return {
        payload: null,
        signaturePresent,
        signatureMatches: false,
        payloadValid: false,
      };
    }
    const suppliedBuffer = Buffer.from(supplied, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    const signaturesDiffer =
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer);
    if (signaturesDiffer) {
      return {
        payload: null,
        signaturePresent,
        signatureMatches: false,
        payloadValid: false,
      };
    }
    const parsed = canvasRequestSchema.safeParse(request.body);
    return {
      payload: parsed.success ? parsed.data : null,
      signaturePresent,
      signatureMatches: true,
      payloadValid: parsed.success,
    };
  }

  app.post("/api/v1/intercom/inbox/initialize", async (request, reply) => {
    const verification = verifiedPayload(request);
    request.log.info(
      {
        signaturePresent: verification.signaturePresent,
        signatureMatches: verification.signatureMatches,
        payloadValid: verification.payloadValid,
      },
      "Intercom Canvas initialize verification",
    );
    auditCanvas({
      route: "initialize",
      signaturePresent: verification.signaturePresent,
      signatureMatches: verification.signatureMatches,
      payloadValid: verification.payloadValid,
    });
    const { payload } = verification;
    if (!payload)
      return reply.status(401).send({ error: "Invalid signature." });
    const canvasWorkspace = canvasWorkspaceId(payload);
    if (!canvasWorkspace)
      return reply.status(400).send({ error: "Intercom workspace ID is required." });
    const workspaceId = await integrations.resolveIntercomWorkspace(canvasWorkspace);
    return initialCanvas(Boolean(workspaceId));
  });

  app.post("/api/v1/intercom/inbox/submit", async (request, reply) => {
    const verification = verifiedPayload(request);
    request.log.info(
      {
        signaturePresent: verification.signaturePresent,
        signatureMatches: verification.signatureMatches,
        payloadValid: verification.payloadValid,
      },
      "Intercom Canvas submit verification",
    );
    auditCanvas({
      route: "submit",
      signaturePresent: verification.signaturePresent,
      signatureMatches: verification.signatureMatches,
      payloadValid: verification.payloadValid,
    });
    const { payload } = verification;
    if (!payload)
      return reply.status(401).send({ error: "Invalid signature." });
    const canvasWorkspace = canvasWorkspaceId(payload);
    if (!canvasWorkspace)
      return reply.status(400).send({ error: "Intercom workspace ID is required." });
    const workspaceId = await integrations.resolveIntercomWorkspace(canvasWorkspace);
    if (!workspaceId) return initialCanvas(false);
    const storedCaseId = stringValue(canvasStoredData(payload)?.case_id);
    const isRerunRequest =
      payload.component_id === "rerun_with_weppo" ||
      (!payload.component_id && Boolean(storedCaseId));
    // Canvas submit payloads differ between Intercom conversation details and
    // Help Desk: some releases replace the button id with an internal value.
    // This card only contains one non-rerun submit action, so an unknown submit
    // must mean “start investigation”, not silently redraw the initial card.
    const isInvestigationRequest = !isRerunRequest;
    request.log.info(
      {
        componentId: payload.component_id ?? null,
        storedCaseId: storedCaseId ?? null,
        action: isRerunRequest ? "rerun" : isInvestigationRequest ? "start" : "unknown",
      },
      "Intercom Canvas submit action",
    );
    auditCanvas({
      route: "submit",
      stage: "action-classified",
      componentId: payload.component_id ?? null,
      action: isRerunRequest ? "rerun" : isInvestigationRequest ? "start" : "unknown",
    });
    if (!isInvestigationRequest && !isRerunRequest) {
      return initialCanvas(true);
    }

    const ticketIdentifier = ticketId(payload);
    const externalId = ticketIdentifier ?? conversationId(payload);
    if (!externalId) {
      return reply.status(400).send({ error: "Conversation or ticket ID is required." });
    }
    const actor = actorFor(payload, workspaceId);
    const existing = await investigations.findByExternalTicket(
      actor,
      "intercom",
      externalId,
    );
    if (existing && !isRerunRequest) return startedCanvas(existing.id, webOrigin, true);

    let source: unknown = null;
    let sourceReadError: string | null = null;
    try {
      source = ticketIdentifier
        ? await readClients.intercom.getTicket(workspaceId, ticketIdentifier)
        : await readClients.intercom.getConversation(workspaceId, externalId);
    } catch (reason) {
      sourceReadError =
        reason instanceof Error
          ? reason.message
          : "Intercom ticket retrieval failed.";
      request.log.error(
        { ticketIdentifier: ticketIdentifier ?? null, externalId, sourceReadError },
        "Intercom ticket retrieval failed after Canvas submit",
      );
      auditCanvas({ route: "submit", stage: "ticket-read-failed" });
    }
    if (process.env.WEPPO_DEBUG_INTERCOM_PAYLOAD === "true") {
      request.log.info(
        { intercomObject: source },
        "Intercom object retrieved for investigation debug",
      );
    }
    let customer = contactDetails(payload);
    let normalized = ticketIdentifier
      ? ticketReport(source)
      : conversationReport(source);
    if (sourceReadError) {
      normalized = {
        title: "Intercom investigation started",
        report:
          "Weppo created this investigation from an Intercom Canvas action, but could not retrieve the full ticket record. Reconnect the Intercom read-only integration, then re-run this case to enrich the evidence.",
        occurredAt: undefined,
      };
    }
    let intercomContext: TicketReference["intercom"] = ticketIdentifier
      ? intercomTicketContext(source)
      : undefined;
    // Help Desk can expose a ticket identifier through the Canvas conversation
    // field. If the conversation payload has no message body, try that ID as a
    // ticket and use its default description when available.
    if (!sourceReadError && !ticketIdentifier && normalized.report === "No message body was available.") {
      try {
        const ticket = await readClients.intercom.getTicket(workspaceId, externalId);
        const fromTicket = ticketReport(ticket);
        if (fromTicket.report !== "No ticket description was available.") {
          normalized = fromTicket;
          intercomContext = intercomTicketContext(ticket);
        }
      } catch {
        // The ID is a normal conversation rather than a Help Desk ticket.
      }
    }
    if (intercomContext?.contactIds[0]) {
      try {
        const contact = await readClients.intercom.getContact(
          workspaceId,
          intercomContext.contactIds[0],
        );
        const persona = intercomContactContext(contact);
        if (process.env.WEPPO_DEBUG_INTERCOM_PAYLOAD === "true") {
          request.log.info(
            { intercomContactObject: contact },
            "Intercom contact retrieved for investigation debug",
          );
        }
        intercomContext = {
          ...intercomContext,
          contact: persona,
          contactExternalIds: [
            ...new Set(
              [
                ...intercomContext.contactExternalIds,
                ...(persona.externalId ? [persona.externalId] : []),
              ].filter(Boolean),
            ),
          ],
        };
        customer = {
          name: persona.name ?? customer.name,
          email: persona.email ?? customer.email,
        };
      } catch {
        // Continue with the ticket context when the Contact API is unavailable.
      }
    }
    const input = {
      title: `Intercom: ${(normalized.title ?? normalized.report).slice(0, 100)}`,
      customer: customer.name,
      report: normalized.report,
      ticket: {
        provider: "intercom" as const,
        externalId,
        customerEmail: customer.email,
        occurredAt: normalized.occurredAt,
        intercom: intercomContext,
      },
    };
    if (existing) {
      const rerun = await investigations.refreshAndStart(actor, existing.id, input);
      if (!rerun) return reply.status(404).send({ error: "Case not found." });
      auditCanvas({ route: "submit", stage: "case-rerun-created" });
      return startedCanvas(rerun.investigation.id, webOrigin, true);
    }
    const created = await investigations.createAndStart(actor, input);
    auditCanvas({ route: "submit", stage: "case-created" });
    return startedCanvas(created.investigation.id, webOrigin, false);
  });
};
