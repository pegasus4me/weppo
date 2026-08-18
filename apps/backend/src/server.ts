import "dotenv/config";

import { buildApp } from "./app.js";
import { loadConfig } from "./config/env.js";

async function start() {
  const config = loadConfig();
  const app = await buildApp({ config });

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, "Shutting down");
    await app.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({
    host: config.host,
    port: config.port,
  });
}

start().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Backend failed to start"}\n`,
  );
  process.exit(1);
});
