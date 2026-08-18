import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";

import type { Auth } from "../../lib/auth.js";
import {
  followUpPromptMaxLength,
  investigationStatuses,
  type InvestigationActor,
} from "./domain.js";
import type { InvestigationService } from "./service.js";

type InvestigationRoutesOptions = {
  auth: Auth;
  service: InvestigationService;
};

const createInvestigationSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  customer: z.string().trim().min(1).max(160),
  report: z.string().trim().min(1).max(30_000),
  ticket: z
    .object({
      provider: z.enum(["manual", "zendesk", "intercom"]),
      externalId: z.string().trim().min(1).max(200).optional(),
      url: z.string().url().optional(),
      customerEmail: z.string().email().optional(),
      occurredAt: z.string().datetime().optional(),
    })
    .optional(),
});

const requestFollowUpSchema = z.object({
  prompt: z.string().trim().min(1).max(followUpPromptMaxLength),
});

type RequestFollowUpBody = z.infer<typeof requestFollowUpSchema>;

async function resolveActor(
  auth: Auth,
  headers: Parameters<typeof fromNodeHeaders>[0],
): Promise<InvestigationActor | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });
  if (!session) return null;
  return {
    userId: session.user.id,
    workspaceId:
      session.session.activeOrganizationId ?? `personal:${session.user.id}`,
  };
}

function unauthorized(reply: FastifyReply) {
  return reply.status(401).send({
    error: { code: "UNAUTHORIZED", message: "Authentication required." },
  });
}

function notFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: {
      code: "INVESTIGATION_NOT_FOUND",
      message: "Investigation not found.",
    },
  });
}

export const investigationRoutes: FastifyPluginAsync<
  InvestigationRoutesOptions
> = async (app, { auth, service }) => {
  app.get("/api/v1/investigations", async (request, reply) => {
    const actor = await resolveActor(auth, request.headers);
    if (!actor) return unauthorized(reply);
    const parsed = z
      .object({ status: z.enum(investigationStatuses).optional() })
      .safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid investigation status.",
        },
      });
    }
    return { investigations: await service.list(actor, parsed.data.status) };
  });

  app.post("/api/v1/investigations", async (request, reply) => {
    const actor = await resolveActor(auth, request.headers);
    if (!actor) return unauthorized(reply);
    const parsed = createInvestigationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INVESTIGATION",
          message: "Customer and ticket report are required.",
        },
      });
    }
    const created = await service.createAndStart(actor, parsed.data);
    return reply.status(201).send({
      case: created.investigation,
      run: { id: created.runId, status: "queued" },
    });
  });

  app.get<{ Params: { caseId: string } }>(
    "/api/v1/investigations/:caseId",
    async (request, reply) => {
      const actor = await resolveActor(auth, request.headers);
      if (!actor) return unauthorized(reply);
      const snapshot = await service.get(actor, request.params.caseId);
      return snapshot ?? notFound(reply);
    },
  );

  app.delete<{ Params: { caseId: string } }>(
    "/api/v1/investigations/:caseId",
    async (request, reply) => {
      const actor = await resolveActor(auth, request.headers);
      if (!actor) return unauthorized(reply);
      const deleted = await service.delete(actor, request.params.caseId);
      if (!deleted) return notFound(reply);
      return reply.status(204).send();
    },
  );

  app.post<{ Params: { caseId: string } }>(
    "/api/v1/investigations/:caseId/runs",
    async (request, reply) => {
      const actor = await resolveActor(auth, request.headers);
      if (!actor) return unauthorized(reply);
      const runId = await service.start(actor, request.params.caseId);
      if (!runId) return notFound(reply);
      return reply.status(202).send({ run: { id: runId, status: "queued" } });
    },
  );

  app.post<{
    Params: { caseId: string };
    Body: RequestFollowUpBody;
  }>("/api/v1/investigations/:caseId/follow-ups", async (request, reply) => {
    const actor = await resolveActor(auth, request.headers);
    if (!actor) return unauthorized(reply);
    const parsed = requestFollowUpSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_FOLLOW_UP",
          message: `A follow-up prompt between 1 and ${followUpPromptMaxLength} characters is required.`,
        },
      });
    }

    const event = await service.requestFollowUp(
      actor,
      request.params.caseId,
      parsed.data,
    );
    if (!event) return notFound(reply);
    return reply.status(202).send({ event });
  });

  app.get<{ Params: { caseId: string }; Querystring: { after?: string } }>(
    "/api/v1/investigations/:caseId/events",
    async (request, reply) => {
      const actor = await resolveActor(auth, request.headers);
      if (!actor) return unauthorized(reply);
      const snapshot = await service.get(actor, request.params.caseId);
      if (!snapshot) return notFound(reply);
      const after = Number.parseInt(request.query.after ?? "0", 10);
      return {
        events: await service.events(
          actor,
          request.params.caseId,
          Number.isFinite(after) ? after : 0,
        ),
      };
    },
  );

  app.get<{ Params: { caseId: string }; Querystring: { after?: string } }>(
    "/api/v1/investigations/:caseId/events/stream",
    async (request, reply) => {
      const actor = await resolveActor(auth, request.headers);
      if (!actor) return unauthorized(reply);
      const snapshot = await service.get(actor, request.params.caseId);
      if (!snapshot) return notFound(reply);

      const headerSequence = request.headers["last-event-id"];
      const requestedSequence =
        (Array.isArray(headerSequence) ? headerSequence[0] : headerSequence) ??
        request.query.after ??
        "0";
      const after = Number.parseInt(requestedSequence, 10);
      const startAfter = Number.isFinite(after) ? after : 0;

      reply.hijack();
      reply.raw.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });

      const writeEvent = (
        event: Awaited<ReturnType<typeof service.events>>[number],
      ) => {
        reply.raw.write(`id: ${event.sequence}\n`);
        reply.raw.write("event: agent-event\n");
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      const replay = await service.events(
        actor,
        request.params.caseId,
        startAfter,
      );
      replay.forEach(writeEvent);
      const unsubscribe = service.subscribe(
        actor,
        request.params.caseId,
        writeEvent,
      );
      const heartbeat = setInterval(
        () => reply.raw.write(": heartbeat\n\n"),
        15_000,
      );
      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      request.raw.once("close", close);
    },
  );
};
