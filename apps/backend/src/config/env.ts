import { z } from "zod";

const rawEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  GOOGLE_CLIENT_ID: z.string().min(1).optional().or(z.literal("")),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional().or(z.literal("")),
  WEB_ORIGINS: z.string().default("http://localhost:3000"),
  METRICS_TOKEN: z.string().min(16).optional().or(z.literal("")),
  OPENAI_API_KEY: z.string().min(1).optional().or(z.literal("")),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.6-terra"),
  INTEGRATION_ENCRYPTION_KEY: z.string().min(1).optional().or(z.literal("")),
  INTEGRATION_CALLBACK_BASE_URL: z.string().url().optional().or(z.literal("")),
  INTERCOM_CLIENT_ID: z.string().min(1).optional().or(z.literal("")),
  INTERCOM_CLIENT_SECRET: z.string().min(1).optional().or(z.literal("")),
  SENTRY_CLIENT_ID: z.string().min(1).optional().or(z.literal("")),
  SENTRY_CLIENT_SECRET: z.string().min(1).optional().or(z.literal("")),
  NOTION_CLIENT_ID: z.string().min(1).optional().or(z.literal("")),
  NOTION_CLIENT_SECRET: z.string().min(1).optional().or(z.literal("")),
});

export type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type IntegrationOAuthConfig = {
  encryptionKey: string;
  intercom?: OAuthProviderConfig;
  sentry?: OAuthProviderConfig;
  notion?: OAuthProviderConfig;
};

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  databaseUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  googleOAuth?: {
    clientId: string;
    clientSecret: string;
  };
  webOrigins: string[];
  metricsToken?: string;
  openAI?: {
    apiKey: string;
    model: string;
  };
  integrations?: IntegrationOAuthConfig;
};

function optionalCredentialPair(
  clientId: string | undefined,
  clientSecret: string | undefined,
  provider: string,
) {
  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error(
      `Invalid environment configuration: ${provider}_CLIENT_ID and ${provider}_CLIENT_SECRET must be provided together`,
    );
  }
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

function isAes256Key(value: string) {
  try {
    const decoded = Buffer.from(value, "base64");
    return decoded.length === 32 && decoded.toString("base64") === value;
  } catch {
    return false;
  }
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const result = rawEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");
    throw new Error(`Invalid environment configuration: ${fields}`);
  }

  const webOrigins = result.data.WEB_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);

  if (webOrigins.length === 0) {
    throw new Error("Invalid environment configuration: WEB_ORIGINS");
  }

  const googleClientId = result.data.GOOGLE_CLIENT_ID || undefined;
  const googleClientSecret = result.data.GOOGLE_CLIENT_SECRET || undefined;

  if (Boolean(googleClientId) !== Boolean(googleClientSecret)) {
    throw new Error(
      "Invalid environment configuration: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together",
    );
  }

  if (result.data.NODE_ENV === "production" && !result.data.METRICS_TOKEN) {
    throw new Error(
      "Invalid environment configuration: METRICS_TOKEN is required in production",
    );
  }

  const intercom = optionalCredentialPair(
    result.data.INTERCOM_CLIENT_ID || undefined,
    result.data.INTERCOM_CLIENT_SECRET || undefined,
    "INTERCOM",
  );
  const sentry = optionalCredentialPair(
    result.data.SENTRY_CLIENT_ID || undefined,
    result.data.SENTRY_CLIENT_SECRET || undefined,
    "SENTRY",
  );
  const notion = optionalCredentialPair(
    result.data.NOTION_CLIENT_ID || undefined,
    result.data.NOTION_CLIENT_SECRET || undefined,
    "NOTION",
  );
  const integrationEncryptionKey =
    result.data.INTEGRATION_ENCRYPTION_KEY || undefined;

  if (integrationEncryptionKey && !isAes256Key(integrationEncryptionKey)) {
    throw new Error(
      "Invalid environment configuration: INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  }
  if ((intercom || sentry || notion) && !integrationEncryptionKey) {
    throw new Error(
      "Invalid environment configuration: INTEGRATION_ENCRYPTION_KEY is required when an integration provider is configured",
    );
  }

  const backendOrigin = new URL(result.data.BETTER_AUTH_URL).origin;
  const integrationCallbackOrigin = result.data.INTEGRATION_CALLBACK_BASE_URL
    ? new URL(result.data.INTEGRATION_CALLBACK_BASE_URL).origin
    : backendOrigin;

  if (intercom && new URL(integrationCallbackOrigin).protocol !== "https:") {
    throw new Error(
      "Invalid environment configuration: INTEGRATION_CALLBACK_BASE_URL must use HTTPS when Intercom is configured",
    );
  }

  return {
    nodeEnv: result.data.NODE_ENV,
    host: result.data.HOST,
    port: result.data.PORT,
    logLevel: result.data.LOG_LEVEL,
    databaseUrl: result.data.DATABASE_URL,
    betterAuthSecret: result.data.BETTER_AUTH_SECRET,
    betterAuthUrl: backendOrigin,
    googleOAuth:
      googleClientId && googleClientSecret
        ? {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }
        : undefined,
    webOrigins,
    metricsToken: result.data.METRICS_TOKEN || undefined,
    openAI: result.data.OPENAI_API_KEY
      ? {
          apiKey: result.data.OPENAI_API_KEY,
          model: result.data.OPENAI_MODEL,
        }
      : undefined,
    integrations: integrationEncryptionKey
      ? {
          encryptionKey: integrationEncryptionKey,
          intercom: intercom
            ? {
                ...intercom,
                redirectUri: `${integrationCallbackOrigin}/api/v1/integrations/intercom/callback`,
              }
            : undefined,
          sentry: sentry
            ? {
                ...sentry,
                redirectUri: `${integrationCallbackOrigin}/api/v1/integrations/sentry/callback`,
              }
            : undefined,
          notion: notion
            ? {
                ...notion,
                redirectUri: `${integrationCallbackOrigin}/api/v1/integrations/notion/callback`,
              }
            : undefined,
        }
      : undefined,
  };
}
