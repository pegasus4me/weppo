import type { FastifyPluginAsync } from "fastify";
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from "prom-client";

import type { AppConfig } from "../config/env.js";

type MetricsPluginOptions = {
  config: AppConfig;
};

export const metricsPlugin: FastifyPluginAsync<MetricsPluginOptions> = async (
  app,
  { config },
) => {
  const registry = new Registry();
  collectDefaultMetrics({
    prefix: "weppo_",
    register: registry,
  });

  const requestCount = new Counter({
    name: "weppo_http_requests_total",
    help: "Total number of HTTP responses.",
    labelNames: ["method", "route", "status_code"] as const,
    registers: [registry],
  });
  const requestDuration = new Histogram({
    name: "weppo_http_request_duration_seconds",
    help: "HTTP request latency in seconds.",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });
  const startedAt = new WeakMap<object, bigint>();

  app.addHook("onRequest", async (request) => {
    startedAt.set(request, process.hrtime.bigint());
  });

  app.addHook("onResponse", async (request, reply) => {
    const start = startedAt.get(request);
    const route = request.routeOptions.url ?? "unmatched";
    const labels = {
      method: request.method,
      route,
      status_code: String(reply.statusCode),
    };

    requestCount.inc(labels);
    if (start !== undefined) {
      const seconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      requestDuration.observe(labels, seconds);
    }
  });

  app.get("/metrics", async (request, reply) => {
    if (config.metricsToken) {
      const authorization = request.headers.authorization;
      if (authorization !== `Bearer ${config.metricsToken}`) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "A valid metrics token is required.",
          },
        });
      }
    }

    reply.header("content-type", registry.contentType);
    return registry.metrics();
  });
};
