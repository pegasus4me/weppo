import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginAsync } from "fastify";

import type { AppConfig } from "../../config/env.js";
import type { Auth } from "../../lib/auth.js";

type AuthRoutesOptions = {
  auth: Auth;
  config: AppConfig;
};

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  { auth, config },
) => {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      const url = new URL(request.url, config.betterAuthUrl);
      const headers = fromNodeHeaders(request.headers);
      headers.delete("connection");
      headers.delete("content-length");
      headers.delete("transfer-encoding");
      const authRequest = new Request(url, {
        method: request.method,
        headers,
        ...(request.body === undefined
          ? {}
          : { body: JSON.stringify(request.body) }),
      });

      const response = await auth.handler(authRequest);

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") {
          reply.header(key, value);
        }
      });

      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) {
        reply.header("set-cookie", cookies);
      }

      const body = response.body ? await response.text() : null;
      return reply.send(body);
    },
  });
};
