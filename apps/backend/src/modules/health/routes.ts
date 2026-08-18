import type { FastifyPluginAsync } from "fastify";
import type pg from "pg";

type HealthRoutesOptions = {
  database: pg.Pool;
};

export const healthRoutes: FastifyPluginAsync<HealthRoutesOptions> = async (
  app,
  { database },
) => {
  app.get("/health/live", async () => ({
    status: "ok",
    service: "weppo-backend",
  }));

  app.get("/health/ready", async (_request, reply) => {
    try {
      await database.query("select 1");
      return {
        status: "ready",
        checks: {
          database: "up",
        },
      };
    } catch {
      return reply.status(503).send({
        status: "not_ready",
        checks: {
          database: "down",
        },
      });
    }
  });
};
