"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="fatal-error">
          <p className="kicker dark">Unexpected mock failure</p>
          <h1>The test page crashed.</h1>
          <p>The exception was sent to Sentry. Reload the page to continue.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
