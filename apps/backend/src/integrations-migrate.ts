import "dotenv/config";

import { readFile } from "node:fs/promises";

import { loadConfig } from "./config/env.js";
import { createDatabase } from "./lib/database.js";

async function migrate() {
  const config = loadConfig();
  const database = createDatabase(config);
  const schema = await readFile(
    new URL("../database/integrations-schema.sql", import.meta.url),
    "utf8",
  );

  try {
    await database.query(schema);
  } finally {
    await database.end();
  }
}

migrate().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Integration migration failed"}\n`,
  );
  process.exit(1);
});
