"use client";

import { useEffect } from "react";

export type IntercomWidgetRegion = "us" | "eu" | "au";

const sdkRegion = {
  us: "us",
  eu: "eu",
  au: "ap",
} as const;

type QueuedIntercom = ((...args: unknown[]) => void) & {
  c?: (args: unknown[]) => void;
  q?: unknown[][];
};

type MessengerWindow = Window & {
  Intercom?: QueuedIntercom;
  intercomSettings?: Record<string, unknown>;
};

export function IntercomWidget({
  appId,
  region,
  user,
  userJwt,
}: {
  appId: string;
  region: IntercomWidgetRegion;
  user: { id: string; name: string; email: string };
  userJwt?: string | null;
}) {
  useEffect(() => {
    const settings = {
      api_base:
        sdkRegion[region] === "us"
          ? "https://api-iam.intercom.io"
          : sdkRegion[region] === "ap"
            ? "https://api-iam.au.intercom.io"
            : "https://api-iam.eu.intercom.io",
      app_id: appId,
      ...(userJwt === null
        ? {}
        : userJwt
        ? { intercom_user_jwt: userJwt }
        : {
            user_id: user.id,
            name: user.name,
            email: user.email,
            created_at: 1735689600,
            company: {
              company_id: "northstar-labs",
              name: "Northstar Labs",
            },
          }),
    };

    const messengerWindow = window as MessengerWindow;
    const existingIntercom = messengerWindow.Intercom;
    if (typeof existingIntercom === "function") {
      existingIntercom("boot", settings);
      return;
    }

    messengerWindow.intercomSettings = settings;
    const queue = ((...args: unknown[]) => queue.c?.(args)) as QueuedIntercom;
    queue.q = [];
    queue.c = (args) => queue.q?.push(args);
    messengerWindow.Intercom = queue;
    queue("boot", settings);

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://widget.intercom.io/widget/${appId}`;
    document.head.appendChild(script);
  }, [appId, region, user.email, user.id, user.name, userJwt]);

  return null;
}
