import { NextResponse } from "next/server";

type PilotApplicationRequest = {
  name?: unknown;
  email?: unknown;
  audienceSize?: unknown;
};

function asRequiredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export async function POST(request: Request) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Discord webhook is not configured." },
      { status: 500 },
    );
  }

  let body: PilotApplicationRequest;

  try {
    body = (await request.json()) as PilotApplicationRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const name = asRequiredString(body.name);
  const email = asRequiredString(body.email);
  const audienceSize = asRequiredString(body.audienceSize);

  if (!name || !email || !audienceSize) {
    return NextResponse.json(
      { error: "Name, email, and audience size are required." },
      { status: 400 },
    );
  }

  const discordResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [
        {
          title: "New early pilot application",
          color: 13089535,
          fields: [
            {
              name: "Name",
              value: name,
              inline: true,
            },
            {
              name: "Email",
              value: email,
              inline: true,
            },
            {
              name: "Audience size",
              value: audienceSize,
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!discordResponse.ok) {
    return NextResponse.json(
      { error: "Discord rejected the application notification." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
