import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import type pg from "pg";

import type { AppConfig } from "../config/env.js";

export function createAuth(config: AppConfig, database: pg.Pool) {
  return betterAuth({
    appName: "Weppo",
    baseURL: config.betterAuthUrl,
    database,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    socialProviders: config.googleOAuth
      ? {
          google: {
            clientId: config.googleOAuth.clientId,
            clientSecret: config.googleOAuth.clientSecret,
            prompt: "select_account",
          },
        }
      : undefined,
    secret: config.betterAuthSecret,
    trustedOrigins: config.webOrigins,
    plugins: [
      organization({
        requireEmailVerificationOnInvitation: true,
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
