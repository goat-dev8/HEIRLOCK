import type { Env } from "@heirlock/config";

export type PolicyDecision =
  | { ok: true; effectiveCapUsd: number }
  | { ok: false; reason: string; effectiveCapUsd?: number };

export type TradeEnvironment = "mainnet" | "testnet";

/**
 * Effective notional cap:
 * - mainnet: min(TRADING_MAX_NOTIONAL_USD, MAINNET_TEST_MAX_NOTIONAL_USD) and NEVER > 1
 * - testnet: TESTNET_TEST_MAX_NOTIONAL_USD (large OK for integration tests)
 */
export function effectiveNotionalCapUsd(
  env: Env,
  environment: TradeEnvironment = "mainnet",
): number {
  if (environment === "testnet") {
    return env.TESTNET_TEST_MAX_NOTIONAL_USD;
  }
  const hard = Math.min(env.MAINNET_TEST_MAX_NOTIONAL_USD, 1);
  return Math.min(env.TRADING_MAX_NOTIONAL_USD, hard);
}

export function evaluateTradePolicy(
  env: Env,
  input: {
    wallet: string;
    notionalUsd?: number;
    environment?: TradeEnvironment;
  },
): PolicyDecision {
  const environment = input.environment ?? "mainnet";
  const effectiveCapUsd = effectiveNotionalCapUsd(env, environment);

  if (!env.TRADING_ENABLED) {
    return { ok: false, reason: "TRADING_ENABLED=false", effectiveCapUsd };
  }
  if (env.KILL_SWITCH_TRADING) {
    return { ok: false, reason: "KILL_SWITCH_TRADING=true", effectiveCapUsd };
  }

  const allow = env.TRADING_ALLOWLIST.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const wallet = input.wallet.toLowerCase();
  if (allow.length && !allow.includes(wallet)) {
    return { ok: false, reason: "wallet_not_allowlisted", effectiveCapUsd };
  }

  if (input.notionalUsd != null && input.notionalUsd > effectiveCapUsd) {
    return {
      ok: false,
      reason: `notional_exceeds_cap_${effectiveCapUsd}`,
      effectiveCapUsd,
    };
  }

  // Extra hard stop: refuse any mainnet notional above 1 USDC even if misconfigured
  if (
    environment === "mainnet" &&
    input.notionalUsd != null &&
    input.notionalUsd > 1
  ) {
    return {
      ok: false,
      reason: "mainnet_hard_cap_1_usdc",
      effectiveCapUsd: 1,
    };
  }

  return { ok: true, effectiveCapUsd };
}

/** Best-effort notional extraction from heterogeneous SoDEX order bodies. */
export function extractNotionalUsd(body: unknown): number | undefined {
  if (!body || typeof body !== "object") return undefined;
  const o = body as Record<string, unknown>;
  const candidates = [
    o.notionalUsd,
    o.notional,
    o.quoteQty,
    o.quantityUsd,
    o.funds,
    (o.order as Record<string, unknown> | undefined)?.notional,
    (o.order as Record<string, unknown> | undefined)?.quoteQty,
    (o.order as Record<string, unknown> | undefined)?.funds,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

/** Resolve local test wallet credentials — NEVER for multi-user production. */
export function localTestWallet(env: Env): {
  privateKey?: string;
  address?: string;
  accountId?: string;
} {
  return {
    privateKey: env.SODEX_TEST_PRIVATE_KEY ?? env.SODEX_PRIVATE_KEY,
    address: env.SODEX_TEST_ADDRESS ?? env.SODEX_ADDRESS,
    accountId: env.SODEX_TEST_ACCOUNT_ID ?? env.SODEX_ACCOUNT_ID,
  };
}
