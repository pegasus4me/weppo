import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createPkceChallenge,
  generatePkceVerifier,
  hashOAuthState,
  IntegrationSecretCipher,
} from "../src/modules/integrations/crypto.js";

const encryptionKey = Buffer.alloc(32, 0x42).toString("base64");

function assertSecretRejected(operation: () => unknown, plaintext: string) {
  assert.throws(operation, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, "Unable to decrypt integration secret.");
    assert.equal(error.message.includes(plaintext), false);
    return true;
  });
}

test("IntegrationSecretCipher round-trips an AES-GCM encrypted secret", () => {
  const cipher = new IntegrationSecretCipher(encryptionKey);
  const plaintext = "sentry-access-token-é-🔐";
  const associatedData = "weppo:workspace-1:sentry:access";

  const envelope = cipher.encrypt(plaintext, associatedData);

  assert.equal(cipher.decrypt(envelope, associatedData), plaintext);
  assert.equal(envelope.includes(plaintext), false);
});

test("IntegrationSecretCipher uses a randomized envelope for each encryption", () => {
  const cipher = new IntegrationSecretCipher(encryptionKey);
  const plaintext = "same-secret";
  const associatedData = "weppo:workspace-1:intercom:access";

  const first = cipher.encrypt(plaintext, associatedData);
  const second = cipher.encrypt(plaintext, associatedData);

  assert.notEqual(first, second);
  assert.equal(cipher.decrypt(first, associatedData), plaintext);
  assert.equal(cipher.decrypt(second, associatedData), plaintext);
});

test("IntegrationSecretCipher rejects AAD mismatches and tampering without leaking plaintext", () => {
  const cipher = new IntegrationSecretCipher(encryptionKey);
  const plaintext = "do-not-leak-this-secret";
  const associatedData = "weppo:workspace-1:sentry:refresh";
  const envelope = cipher.encrypt(plaintext, associatedData);

  assertSecretRejected(
    () => cipher.decrypt(envelope, "weppo:workspace-2:sentry:refresh"),
    plaintext,
  );

  const [version, iv, tag, ciphertextValue] = envelope.split(".");
  assert.ok(version && iv && tag && ciphertextValue);
  const ciphertext = Buffer.from(ciphertextValue, "base64url");
  ciphertext[0] = (ciphertext[0] ?? 0) ^ 1;
  const tamperedEnvelope = [
    version,
    iv,
    tag,
    ciphertext.toString("base64url"),
  ].join(".");

  assertSecretRejected(
    () => cipher.decrypt(tamperedEnvelope, associatedData),
    plaintext,
  );
});

test("hashOAuthState is deterministic SHA-256", () => {
  const first = hashOAuthState("abc");
  const second = hashOAuthState("abc");

  assert.deepEqual(first, second);
  assert.equal(first.length, 32);
  assert.equal(
    first.toString("hex"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("generatePkceVerifier returns randomized URL-safe RFC 7636 lengths", () => {
  const verifiers = Array.from({ length: 16 }, () => generatePkceVerifier());

  for (const verifier of verifiers) {
    assert.match(verifier, /^[A-Za-z0-9_-]{43,128}$/);
  }
  assert.equal(new Set(verifiers).size, verifiers.length);
});

test("createPkceChallenge matches the RFC 7636 S256 test vector", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

  assert.equal(
    createPkceChallenge(verifier),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});
