import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginAsync } from "fastify";

import type { Auth } from "../../lib/auth.js";

type UserRoutesOptions = {
  auth: Auth;
};

export const userRoutes: FastifyPluginAsync<UserRoutesOptions> = async (
  app,
  { auth },
) => {
  app.get("/api/v1/users/me", async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      return reply.status(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      });
    }

    return {
      user: session.user,
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
        activeOrganizationId: session.session.activeOrganizationId ?? null,
      },
    };
  });
};
