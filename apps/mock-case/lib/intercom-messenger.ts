import { createHmac } from "node:crypto";

type IntercomUser = {
  id: string;
  name: string;
  email: string;
};

const toBase64Url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

/**
 * Creates the short-lived server-side JWT required by Intercom Messenger
 * Security. The Messenger secret must never be exposed to the browser.
 */
export function createIntercomUserJwt(
  secret: string,
  user: IntercomUser,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url({ alg: "HS256", typ: "JWT" });
  const payload = toBase64Url({
    user_id: user.id,
    email: user.email,
    iat: now,
    exp: now + 60 * 60,
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(unsignedToken)
    .digest("base64url");

  return `${unsignedToken}.${signature}`;
}
