import { getFavicon } from "@hyperjumptech/favicon-fetcher";
import { EStrategies } from "@hyperjumptech/favicon-fetcher/dist/get-favicon";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

function isValidPublicDomain(value: string) {
  if (value.length > 253 || !value.includes(".")) return false;
  if (!/^[a-z0-9.-]+$/i.test(value)) return false;
  return value.split(".").every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      !label.startsWith("-") &&
      !label.endsWith("-"),
  );
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")?.trim().toLowerCase();

  if (!domain || !isValidPublicDomain(domain)) {
    return new Response("Invalid company domain", { status: 400 });
  }

  try {
    const favicon = await getFavicon(`https://${domain}`, {
      strategies: [EStrategies.google],
      output: "buffer",
    });

    if (!Buffer.isBuffer(favicon) || favicon.length === 0) {
      return new Response("Company logo not found", { status: 404 });
    }

    return new Response(new Uint8Array(favicon), {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Company logo not found", { status: 404 });
  }
}
