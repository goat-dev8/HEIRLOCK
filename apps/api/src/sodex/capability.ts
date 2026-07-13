/**
 * SoDEX signed capability cache (guide_sodex_order.md §15–17).
 * REST status=TRADING is necessary, not sufficient — UI must gate on this store.
 */
import { getKv } from "../redis.js";

export type CapKind = "LIMIT_IOC" | "LIMIT_GTC" | "MARKET_IOC";

export type CapRecord = {
  symbol: string;
  environment: "mainnet" | "testnet";
  kind: CapKind;
  state: "MATCHER_OK" | "FILL_OK" | "CANCEL_ONLY" | "UNVERIFIED" | "FAIL";
  reason?: string;
  updatedAt: string;
  source: "live" | "probe" | "negative";
};

const mem = new Map<string, { rec: CapRecord; exp: number }>();

function key(environment: string, symbol: string, kind: CapKind) {
  return `sodex:cap:${environment}:${symbol.toUpperCase()}:${kind}`;
}

function ttlSeconds(rec: CapRecord): number {
  if (rec.state === "CANCEL_ONLY" || rec.state === "FAIL") return 15 * 60;
  if (rec.source === "probe") return 6 * 60 * 60;
  return 5 * 60;
}

export async function setCapability(rec: CapRecord): Promise<void> {
  const k = key(rec.environment, rec.symbol, rec.kind);
  const payload = JSON.stringify(rec);
  const ex = ttlSeconds(rec);
  mem.set(k, { rec, exp: Date.now() + ex * 1000 });
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.set(k, payload, { ex });
  } catch {
    /* memory fallback already set */
  }
}

export async function getCapability(opts: {
  environment: "mainnet" | "testnet";
  symbol: string;
  kind?: CapKind;
}): Promise<CapRecord | null> {
  const kind = opts.kind ?? "LIMIT_IOC";
  const k = key(opts.environment, opts.symbol, kind);
  const local = mem.get(k);
  if (local && local.exp > Date.now()) return local.rec;
  if (local) mem.delete(k);

  const kv = getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(k);
    if (!raw) return null;
    const rec = JSON.parse(raw) as CapRecord;
    mem.set(k, { rec, exp: Date.now() + ttlSeconds(rec) * 1000 });
    return rec;
  } catch {
    return null;
  }
}

export async function recordLiveMatcherOk(opts: {
  environment: "mainnet" | "testnet";
  symbol: string;
  filled?: boolean;
}): Promise<void> {
  await setCapability({
    symbol: opts.symbol.toUpperCase(),
    environment: opts.environment,
    kind: "LIMIT_IOC",
    state: opts.filled ? "FILL_OK" : "MATCHER_OK",
    updatedAt: new Date().toISOString(),
    source: "live",
  });
}

export async function recordCancelOnly(opts: {
  environment: "mainnet" | "testnet";
  symbol: string;
  reason: string;
}): Promise<void> {
  await setCapability({
    symbol: opts.symbol.toUpperCase(),
    environment: opts.environment,
    kind: "LIMIT_IOC",
    state: "CANCEL_ONLY",
    reason: opts.reason,
    updatedAt: new Date().toISOString(),
    source: "negative",
  });
}

export function isCancelOnlyError(message: string): boolean {
  return /cancel.?only/i.test(message);
}

/** True when cached evidence says the market can accept new orders. */
export function isBuyable(cap: CapRecord | null): boolean {
  if (!cap) return false;
  return cap.state === "MATCHER_OK" || cap.state === "FILL_OK";
}
