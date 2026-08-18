import pg from "pg";

import type { AppConfig } from "../config/env.js";

const { Pool } = pg;

export function createDatabase(config: AppConfig): pg.Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 30_000,
    max: 10,
    ssl:
      config.nodeEnv === "production"
        ? {
            rejectUnauthorized: true,
          }
        : undefined,
  });
}
