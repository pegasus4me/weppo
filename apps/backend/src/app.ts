import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import type pg from "pg";

import type { AppConfig } from "./config/env.js";
import { createAuth, type Auth } from "./lib/auth.js";
import { createDatabase } from "./lib/database.js";
import { authRoutes } from "./modules/auth/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { intercomInboxRoutes } from "./modules/intercom-inbox/routes.js";
import {
  createIntegrationModule,
  type IntegrationModule,
} from "./modules/integrations/index.js";
import { integrationRoutes } from "./modules/integrations/routes.js";
import {
  createInvestigationModule,
  type InvestigationModule,
} from "./modules/investigations/index.js";
import { investigationRoutes } from "./modules/investigations/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { metricsPlugin } from "./plugins/metrics.js";

export type BuildAppOptions = {
  config: AppConfig;
  database?: pg.Pool;
  auth?: Auth;
  investigations?: InvestigationModule;
  integrations?: IntegrationModule;
  logger?: FastifyServerOptions["logger"];
};

export async function buildApp(
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const { config, logger } = options;
  const ownsDatabase = options.database === undefined;
  const database = options.database ?? createDatabase(config);
  const auth = options.auth ?? createAuth(config, database);
  const integrations =
    options.integrations ??
    createIntegrationModule({
      database,
      config: config.integrations,
    });
  const ownsInvestigations = options.investigations === undefined;
  const investigations =
    options.investigations ??
    createInvestigationModule({
      openAI: config.openAI,
      readClients: integrations.readClients,
    });
  const app = Fastify({
    logger:
      logger ??
      ({
        level: config.logLevel,
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.query.code",
            "req.query.state",
            "res.headers.set-cookie",
          ],
          censor: "[REDACTED]",
        },
      } as FastifyServerOptions["logger"]),
    requestIdHeader: "x-request-id",
    trustProxy: config.nodeEnv === "production",
  });

  await app.register(cors, {
    origin: config.webOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-request-id"],
    maxAge: 86_400,
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
  });
  await app.register(metricsPlugin, { config });
  await app.register(healthRoutes, { database });
  await app.register(authRoutes, { auth, config });
  await app.register(userRoutes, { auth });
  await app.register(integrationRoutes, {
    auth,
    service: integrations.service,
    webOrigin: config.webOrigins[0]!,
  });
  await app.register(investigationRoutes, {
    auth,
    service: investigations.service,
  });
  if (config.integrations?.intercom) {
    await app.register(intercomInboxRoutes, {
      clientSecret: config.integrations.intercom.clientSecret,
      integrations: integrations.service,
      readClients: integrations.readClients,
      investigations: investigations.service,
      webOrigin: config.webOrigins[0]!,
    });
  }

  app.get("/api/v1", async () => ({
    service: "weppo-backend",
    version: "v1",
    status: "ok",
  }));

  app.setNotFoundHandler(async (_request, reply) =>
    reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
      },
    }),
  );

  app.setErrorHandler(async (error, request, reply) => {
    const requestError =
      error instanceof Error ? error : new Error("Unknown request error");
    const errorWithStatus = requestError as Error & { statusCode?: number };

    request.log.error({ err: requestError }, "Request failed");
    const statusCode =
      typeof errorWithStatus.statusCode === "number" &&
      errorWithStatus.statusCode < 500
        ? errorWithStatus.statusCode
        : 500;

    return reply.status(statusCode).send({
      error: {
        code: statusCode === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
        message:
          statusCode === 500
            ? "An unexpected error occurred."
            : requestError.message,
        requestId: request.id,
      },
    });
  });

  app.addHook("onClose", async () => {
    if (ownsInvestigations) investigations.close();
    if (ownsDatabase) await database.end();
  });

  return app;
}
