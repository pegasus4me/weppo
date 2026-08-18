import { fromNodeHeaders } from "better-auth/node";
import type {
  FastifyBaseLogger,
  FastifyPluginAsync,
  FastifyReply,
} from "fastify";
import { z } from "zod";

import type { Auth } from "../../lib/auth.js";
import {
  IntegrationFlowError,
  integrationProviders,
  intercomRegions,
  type IntegrationActor,
  type IntegrationProvider,
} from "./domain.js";
import type { IntegrationService } from "./service.js";

type IntegrationRoutesOptions = {
  auth: Auth;
  service: IntegrationService;
  webOrigin: string;
};

const callbackSchema = z
  .object({
    state: z.string().min(20).max(1_000),
    code: z.string().min(1).max(8_000).optional(),
    error: z.string().min(1).max(200).optional(),
  })
  .refine((value) => Boolean(value.code) !== Boolean(value.error));

async function resolveActor(
  auth: Auth,
  headers: Parameters<typeof fromNodeHeaders>[0],
): Promise<IntegrationActor | null> {
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

function integrationError(reply: FastifyReply, error: IntegrationFlowError) {
  const statusCode =
    error.reason === "not_configured"
      ? 503
      : error.reason === "provider_rejected" || error.reason === "invalid_grant"
        ? 502
        : 400;
  return reply.status(statusCode).send({
    error: {
      code:
        error.reason === "not_configured"
          ? "INTEGRATION_NOT_CONFIGURED"
          : "OAUTH_CALLBACK_FAILED",
      reason: error.reason,
      message: error.message,
    },
  });
}

function callbackRedirect(
  reply: FastifyReply,
  webOrigin: string,
  provider: "intercom" | "sentry" | "notion",
  reason?: string,
) {
  const url = new URL("/dashboard/integrations", webOrigin);
  if (reason) {
    url.searchParams.set("integration_error", reason);
    url.searchParams.set("provider", provider);
  } else {
    url.searchParams.set("connected", provider);
  }
  return reply.status(303).header("location", url.toString()).send();
}

async function callback(
  provider: "intercom" | "sentry" | "notion",
  service: IntegrationService,
  query: unknown,
  signal: AbortSignal | undefined,
  reply: FastifyReply,
  webOrigin: string,
  logger: FastifyBaseLogger,
) {
  const parsed = callbackSchema.safeParse(query);
  if (!parsed.success) {
    return callbackRedirect(reply, webOrigin, provider, "invalid_state");
  }
  try {
    if (provider === "intercom") {
      await service.completeIntercom({ ...parsed.data, signal });
    } else if (provider === "sentry") {
      await service.completeSentry({ ...parsed.data, signal });
    } else {
      await service.completeNotion({ ...parsed.data, signal });
    }
    return callbackRedirect(reply, webOrigin, provider);
  } catch (error) {
    if (error instanceof IntegrationFlowError) {
      logger.warn(
        {
          provider,
          reason: error.reason,
          errorMessage: error.message,
        },
        "OAuth callback could not complete",
      );
      return callbackRedirect(reply, webOrigin, provider, error.reason);
    }
    logger.error({ provider }, "OAuth callback failed unexpectedly");
    return callbackRedirect(reply, webOrigin, provider, "provider_rejected");
  }
}

export const integrationRoutes: FastifyPluginAsync<
  IntegrationRoutesOptions
> = async (app, { auth, service, webOrigin }) => {
  app.get("/api/v1/integrations", async (request, reply) => {
    const actor = await resolveActor(auth, request.headers);
    if (!actor) return unauthorized(reply);
    return { integrations: await service.list(actor) };
  });

  app.post<{ Body: { region: "us" | "eu" | "au" } }>(
    "/api/v1/integrations/intercom/authorize",
    async (request, reply) => {
      const actor = await resolveActor(auth, request.headers);
      if (!actor) return unauthorized(reply);
      const parsed = z
        .object({ region: z.enum(intercomRegions) })
        .strict()
        .safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "INVALID_INTERCOM_REGION",
            message: "Intercom region must be us, eu, or au.",
          },
        });
      }
      try {
        return reply
          .status(201)
          .send(await service.authorizeIntercom(actor, parsed.data.region));
      } catch (error) {
        if (error instanceof IntegrationFlowError) {
          return integrationError(reply, error);
        }
        throw error;
      }
    },
  );

  app.get(
    "/api/v1/integrations/intercom/callback",
    { logLevel: "silent" },
    async (request, reply) =>
      callback(
        "intercom",
        service,
        request.query,
        undefined,
        reply,
        webOrigin,
        app.log,
      ),
  );

  app.post("/api/v1/integrations/notion/authorize", async (request, reply) => {
    const actor = await resolveActor(auth, request.headers);
    if (!actor) return unauthorized(reply);
    try {
      return reply.status(201).send(await service.authorizeNotion(actor));
    } catch (error) {
      if (error instanceof IntegrationFlowError) {
        return integrationError(reply, error);
      }
      throw error;
    }
  });

  app.get(
    "/api/v1/integrations/notion/callback",
    { logLevel: "silent" },
    async (request, reply) =>
      callback(
        "notion",
        service,
        request.query,
        undefined,
        reply,
        webOrigin,
        app.log,
      ),
  );

  app.post("/api/v1/integrations/sentry/authorize", async (request, reply) => {
    const actor = await resolveActor(auth, request.headers);
    if (!actor) return unauthorized(reply);
    try {
      return reply.status(201).send(await service.authorizeSentry(actor));
    } catch (error) {
      if (error instanceof IntegrationFlowError) {
        return integrationError(reply, error);
      }
      throw error;
    }
  });

  app.get(
    "/api/v1/integrations/sentry/callback",
    { logLevel: "silent" },
    async (request, reply) =>
      callback(
        "sentry",
        service,
        request.query,
        undefined,
        reply,
        webOrigin,
        app.log,
      ),
  );

  app.delete<{ Params: { provider: string } }>(
    "/api/v1/integrations/:provider",
    async (request, reply) => {
      const actor = await resolveActor(auth, request.headers);
      if (!actor) return unauthorized(reply);
      const provider = z
        .enum(integrationProviders)
        .safeParse(request.params.provider);
      if (!provider.success) {
        return reply.status(400).send({
          error: {
            code: "INVALID_INTEGRATION_PROVIDER",
            message:
              "Integration provider must be intercom, sentry, or notion.",
          },
        });
      }
      try {
        await service.delete(actor, provider.data as IntegrationProvider);
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof IntegrationFlowError) {
          return integrationError(reply, error);
        }
        throw error;
      }
    },
  );
};
