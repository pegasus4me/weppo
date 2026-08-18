import assert from "node:assert/strict";
import { test } from "node:test";

import { loadConfig } from "../src/config/env.js";

const baseEnvironment = {
  DATABASE_URL: "postgresql://weppo:weppo@localhost:5433/weppo",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:4000",
  WEB_ORIGINS: "http://localhost:3000,https://app.weppo.test/path",
};

test("loadConfig normalizes allowed browser origins", () => {
  const config = loadConfig(baseEnvironment);

  assert.deepEqual(config.webOrigins, [
    "http://localhost:3000",
    "https://app.weppo.test",
  ]);
});

test("loadConfig requires protected metrics in production", () => {
  assert.throws(
    () =>
      loadConfig({
        ...baseEnvironment,
        NODE_ENV: "production",
      }),
    /METRICS_TOKEN is required in production/,
  );
});

test("loadConfig accepts complete Google OAuth credentials", () => {
  const config = loadConfig({
    ...baseEnvironment,
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
  });

  assert.deepEqual(config.googleOAuth, {
    clientId: "google-client-id",
    clientSecret: "google-client-secret",
  });
});

test("loadConfig rejects partial Google OAuth credentials", () => {
  assert.throws(
    () =>
      loadConfig({
        ...baseEnvironment,
        GOOGLE_CLIENT_ID: "google-client-id",
      }),
    /GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together/,
  );
});

test("loadConfig enables GPT-5.6 Terra when an OpenAI key is configured", () => {
  const config = loadConfig({
    ...baseEnvironment,
    OPENAI_API_KEY: "test-openai-key",
  });

  assert.deepEqual(config.openAI, {
    apiKey: "test-openai-key",
    model: "gpt-5.6-terra",
  });
});

test("loadConfig allows an explicit OpenAI model override", () => {
  const config = loadConfig({
    ...baseEnvironment,
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-5.6-sol",
  });

  assert.equal(config.openAI?.model, "gpt-5.6-sol");
});

test("loadConfig builds HTTPS integration callback URLs", () => {
  const encryptionKey = Buffer.alloc(32, 7).toString("base64");
  const config = loadConfig({
    ...baseEnvironment,
    INTEGRATION_ENCRYPTION_KEY: encryptionKey,
    INTEGRATION_CALLBACK_BASE_URL: "https://oauth.weppo.test/some/path",
    INTERCOM_CLIENT_ID: "intercom-client-id",
    INTERCOM_CLIENT_SECRET: "intercom-client-secret",
    SENTRY_CLIENT_ID: "sentry-client-id",
    SENTRY_CLIENT_SECRET: "sentry-client-secret",
    NOTION_CLIENT_ID: "notion-client-id",
    NOTION_CLIENT_SECRET: "notion-client-secret",
  });

  assert.equal(config.integrations?.encryptionKey, encryptionKey);
  assert.equal(
    config.integrations?.intercom?.redirectUri,
    "https://oauth.weppo.test/api/v1/integrations/intercom/callback",
  );
  assert.equal(
    config.integrations?.sentry?.redirectUri,
    "https://oauth.weppo.test/api/v1/integrations/sentry/callback",
  );
  assert.equal(
    config.integrations?.notion?.redirectUri,
    "https://oauth.weppo.test/api/v1/integrations/notion/callback",
  );
});

test("loadConfig requires complete provider credentials and encryption", () => {
  assert.throws(
    () =>
      loadConfig({
        ...baseEnvironment,
        INTERCOM_CLIENT_ID: "intercom-client-id",
      }),
    /INTERCOM_CLIENT_ID and INTERCOM_CLIENT_SECRET/,
  );
  assert.throws(
    () =>
      loadConfig({
        ...baseEnvironment,
        SENTRY_CLIENT_ID: "sentry-client-id",
        SENTRY_CLIENT_SECRET: "sentry-client-secret",
      }),
    /INTEGRATION_ENCRYPTION_KEY is required/,
  );
  assert.throws(
    () =>
      loadConfig({
        ...baseEnvironment,
        NOTION_CLIENT_ID: "notion-client-id",
      }),
    /NOTION_CLIENT_ID and NOTION_CLIENT_SECRET/,
  );
});

test("loadConfig rejects non-canonical encryption keys", () => {
  assert.throws(
    () =>
      loadConfig({
        ...baseEnvironment,
        INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(31).toString("base64"),
      }),
    /base64-encoded 32-byte key/,
  );
  assert.throws(
    () =>
      loadConfig({
        ...baseEnvironment,
        INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64url"),
      }),
    /base64-encoded 32-byte key/,
  );
});

test("loadConfig requires HTTPS callbacks for Intercom", () => {
  assert.throws(
    () =>
      loadConfig({
        ...baseEnvironment,
        INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
        INTERCOM_CLIENT_ID: "intercom-client-id",
        INTERCOM_CLIENT_SECRET: "intercom-client-secret",
        INTEGRATION_CALLBACK_BASE_URL: "http://localhost:4000",
      }),
    /INTEGRATION_CALLBACK_BASE_URL must use HTTPS/,
  );
});
