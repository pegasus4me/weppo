import { createServer, request } from "node:http";

const host = "127.0.0.1";
const port = 4040;
const backendOrigin = "http://127.0.0.1:4000";
const callbackPaths = new Set([
  "/api/v1/integrations/intercom/callback",
  "/api/v1/integrations/sentry/callback",
  "/api/v1/integrations/notion/callback",
]);
const canvasPaths = new Set([
  "/api/v1/intercom/inbox/initialize",
  "/api/v1/intercom/inbox/submit",
]);

const server = createServer((incomingRequest, outgoingResponse) => {
  const requestUrl = new URL(
    incomingRequest.url ?? "/",
    `http://${incomingRequest.headers.host ?? host}`,
  );

  if (
    incomingRequest.method === "GET" &&
    requestUrl.pathname === "/health/live"
  ) {
    outgoingResponse.writeHead(200, { "content-type": "application/json" });
    outgoingResponse.end(JSON.stringify({ status: "ok" }));
    return;
  }

  const isOAuthCallback =
    incomingRequest.method === "GET" && callbackPaths.has(requestUrl.pathname);
  const isCanvasRequest =
    incomingRequest.method === "POST" && canvasPaths.has(requestUrl.pathname);

  if (!isOAuthCallback && !isCanvasRequest) {
    outgoingResponse.writeHead(404, { "content-type": "application/json" });
    outgoingResponse.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  const upstreamRequest = request(
    `${backendOrigin}${requestUrl.pathname}${requestUrl.search}`,
    {
      method: incomingRequest.method,
      headers: {
        accept: incomingRequest.headers.accept ?? "*/*",
        ...(isCanvasRequest
          ? {
              "content-type":
                incomingRequest.headers["content-type"] ?? "application/json",
              "content-length":
                incomingRequest.headers["content-length"] ?? "0",
              "x-body-signature":
                incomingRequest.headers["x-body-signature"] ?? "",
            }
          : {}),
        "user-agent": incomingRequest.headers["user-agent"] ?? "",
      },
    },
    (upstreamResponse) => {
      const responseHeaders: Record<string, string | string[]> = {};

      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (value !== undefined && name !== "transfer-encoding") {
          responseHeaders[name] = value;
        }
      }

      outgoingResponse.writeHead(
        upstreamResponse.statusCode ?? 502,
        responseHeaders,
      );
      upstreamResponse.pipe(outgoingResponse);
    },
  );

  upstreamRequest.on("error", () => {
    if (!outgoingResponse.headersSent) {
      outgoingResponse.writeHead(502, { "content-type": "application/json" });
    }
    outgoingResponse.end(JSON.stringify({ error: "backend_unavailable" }));
  });

  if (isCanvasRequest) {
    incomingRequest.pipe(upstreamRequest);
  } else {
    upstreamRequest.end();
  }
});

server.on("clientError", (_error, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

server.listen(port, host, () => {
  process.stdout.write(
    `Integration OAuth callback proxy listening on http://${host}:${port}\n`,
  );
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
