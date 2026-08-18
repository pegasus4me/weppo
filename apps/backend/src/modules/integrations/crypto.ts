import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ENVELOPE_VERSION = "v1";

export class IntegrationSecretCipher {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    const key = Buffer.from(base64Key, "base64");
    if (key.length !== 32) {
      throw new Error("Integration encryption key must contain 32 bytes.");
    }
    this.key = key;
  }

  encrypt(value: string, associatedData: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(associatedData, "utf8"));
    const ciphertext = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      ENVELOPE_VERSION,
      iv.toString("base64url"),
      tag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  decrypt(envelope: string, associatedData: string) {
    const [version, ivValue, tagValue, ciphertextValue, extra] =
      envelope.split(".");
    if (
      version !== ENVELOPE_VERSION ||
      !ivValue ||
      !tagValue ||
      !ciphertextValue ||
      extra !== undefined
    ) {
      throw new Error("Invalid encrypted integration secret.");
    }

    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.key,
        Buffer.from(ivValue, "base64url"),
      );
      decipher.setAAD(Buffer.from(associatedData, "utf8"));
      decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertextValue, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new Error("Unable to decrypt integration secret.");
    }
  }
}

export function generateOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function hashOAuthState(state: string) {
  return createHash("sha256").update(state, "utf8").digest();
}

export function generatePkceVerifier() {
  return randomBytes(48).toString("base64url");
}

export function createPkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function secretAssociatedData(
  workspaceId: string,
  provider: string,
  purpose: "access" | "refresh" | "pkce",
) {
  return `weppo:${workspaceId}:${provider}:${purpose}`;
}
