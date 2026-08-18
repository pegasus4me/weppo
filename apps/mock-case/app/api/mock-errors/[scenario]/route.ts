import * as Sentry from "@sentry/nextjs";

import { findMockScenario } from "@/lib/mock-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ scenario: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  if (process.env.ENABLE_MOCK_CASES !== "true") {
    return Response.json(
      { ok: false, message: "This action is temporarily unavailable." },
      { status: 503 },
    );
  }

  const { scenario: scenarioSlug } = await context.params;
  const scenario = findMockScenario(scenarioSlug);
  if (!scenario) {
    return Response.json(
      { ok: false, message: "This action is no longer available." },
      { status: 404 },
    );
  }

  const error = new Error(scenario.errorMessage);
  error.name = scenario.errorName;

  Sentry.captureException(error, {
    level: "error",
    fingerprint: [scenario.errorName, scenario.endpoint],
    tags: {
      account: "northstar-labs",
      feature: scenario.slug,
      plan: "scale-annual",
      runtime: "nextjs-server",
    },
    contexts: {
      account: {
        id: "northstar-labs",
        name: "Northstar Labs",
        plan: "Scale annual",
        seats: 24,
      },
      operation: {
        endpoint: scenario.endpoint,
        impact: scenario.impact,
      },
    },
    user: {
      id: process.env.INTERCOM_TEST_USER_EXTERNAL_ID ?? "weppo-mock-user-001",
      email:
        process.env.INTERCOM_TEST_USER_EMAIL ??
        "maya.chen+weppo-mock@example.com",
      username: process.env.INTERCOM_TEST_USER_NAME ?? "Maya Chen",
    },
  });

  await Sentry.flush(2_000);

  return Response.json(
    { ok: false, message: scenario.customerError },
    {
      status: 500,
      headers: { "cache-control": "no-store" },
    },
  );
}
