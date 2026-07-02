import { randomBytes } from "node:crypto";

type NonceRecord = { nonce: string; expiresAt: number };

/** In-memory nonce store. Swap to Redis in production hardening. */
const nonces = new Map<string, NonceRecord>();

const TTL_MS = 10 * 60 * 1000;

export function issueNonce(address: string): string {
  const key = address.toLowerCase();
  const nonce = randomBytes(16).toString("hex");
  nonces.set(key, { nonce, expiresAt: Date.now() + TTL_MS });
  return nonce;
}

export function consumeNonce(address: string, nonce: string): boolean {
  const key = address.toLowerCase();
  const rec = nonces.get(key);
  if (!rec) return false;
  if (rec.expiresAt < Date.now()) {
    nonces.delete(key);
    return false;
  }
  if (rec.nonce !== nonce) return false;
  nonces.delete(key);
  return true;
}
