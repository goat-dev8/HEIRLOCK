import { getKv } from "../redis.js";

/**
 * SoDEX nonce model: 100 highest nonces per signing address;
 * new nonce must be larger than the smallest in that set and unused.
 * Recommended: Unix-ms timestamp, monotonic per address.
 */
const mem = new Map<string, bigint>();

export async function nextSodexNonce(signerAddress: string): Promise<bigint> {
  const key = `heirlock:sodex:nonce:${signerAddress.toLowerCase()}`;
  const now = BigInt(Date.now());
  const kv = getKv();

  if (kv) {
    try {
      const prevRaw = await kv.get(key);
      const prev = prevRaw ? BigInt(prevRaw) : 0n;
      const next = now > prev ? now : prev + 1n;
      await kv.set(key, next.toString(), { ex: 60 * 60 * 24 * 3 });
      return next;
    } catch {
      /* fall through */
    }
  }

  const prev = mem.get(key) ?? 0n;
  const next = now > prev ? now : prev + 1n;
  mem.set(key, next);
  return next;
}
