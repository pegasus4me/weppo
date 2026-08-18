import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the temporary HTTPS tunnel used to test browser integrations locally.
  // Next.js otherwise blocks client-side development requests from this origin.
  allowedDevOrigins: ["moisture-tribal-indicating-leone.trycloudflare.com"],
  poweredByHeader: false,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
