import assert from "node:assert/strict";
import { test } from "node:test";

import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config/env.js";

const testConfig: AppConfig = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 4000,
  logLevel: "silent",
  databaseUrl: "postgresql://weppo:weppo@127.0.0.1:5433/weppo_test",
  betterAuthSecret: "test-secret-that-is-at-least-32-characters-long",
  betterAuthUrl: "http://localhost:4000",
  webOrigins: ["http://localhost:3000"],
};

test("GET /health/live reports the service as alive", async () => {
  const app = await buildApp({
    config: testConfig,
    logger: false,
  });

  const response = await app.inject({
    method: "GET",
    url: "/health/live",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: "ok",
    service: "weppo-backend",
  });

  await app.close();
});

test("unknown routes use the public error contract", async () => {
  const app = await buildApp({
    config: testConfig,
    logger: false,
  });

  const response = await app.inject({
    method: "GET",
    url: "/does-not-exist",
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
    },
  });

  await app.close();
});
