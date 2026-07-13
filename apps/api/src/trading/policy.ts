import type { Env } from "@heirlock/config";
import {
  readOnChainWealthPolicy,
  type OnChainWealthPolicy,
} from "../valuechain/policy-read.js";

export type PolicyDecision =
  | {
      ok: true;
      effectiveCapUsd: number;
      onChain?: OnChainWealthPolicy;
    }
  | {
      ok: false;
      reason: string;
      effectiveCapUsd?: number;
      onChain?: OnChainWealthPolicy;
    };

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

/**
 * Apply on-chain WealthPolicy.mode() (+ optional maxNotionalUsd) on top of env policy.
 * Guardian / Heir always block new risk-taking relays.
 * On-chain notional cap applies to mainnet only — testnet uses TESTNET_TEST_MAX_NOTIONAL_USD
 * (SoDEX testnet has its own minNotional/maxNotional per symbol; guide_sodex_order.md §2).
 */
export function applyOnChainContinuityGate(
  decision: PolicyDecision,
  onChain: OnChainWealthPolicy,
  notionalUsd?: number,
  opts?: { applyOnChainNotionalCap?: boolean },
): PolicyDecision {
  if (!decision.ok) {
    return { ...decision, onChain };
  }

  if (onChain.source === "unavailable") {
    return {
      ok: false,
      reason: "on_chain_wealth_policy_unavailable",
      effectiveCapUsd: decision.effectiveCapUsd,
      onChain,
    };
  }

  if (onChain.mode === 1) {
    return {
      ok: false,
      reason: "on_chain_mode_guardian_blocks_new_orders",
      effectiveCapUsd: decision.effectiveCapUsd,
      onChain,
    };
  }
  if (onChain.mode === 2) {
    return {
      ok: false,
      reason: "on_chain_mode_heir_blocks_execution",
      effectiveCapUsd: decision.effectiveCapUsd,
      onChain,
    };
  }

  let effectiveCapUsd = decision.effectiveCapUsd;
  const applyNotional = opts?.applyOnChainNotionalCap !== false;
  if (
    applyNotional &&
    onChain.maxNotionalUsd != null &&
    Number.isFinite(onChain.maxNotionalUsd)
  ) {
    effectiveCapUsd = Math.min(effectiveCapUsd, onChain.maxNotionalUsd);
  }

  if (notionalUsd != null && notionalUsd > effectiveCapUsd) {
    return {
      ok: false,
      reason: applyNotional
        ? `notional_exceeds_on_chain_cap_${effectiveCapUsd}`
        : `notional_exceeds_cap_${effectiveCapUsd}`,
      effectiveCapUsd,
      onChain,
    };
  }

  return { ok: true, effectiveCapUsd, onChain };
}

/** Env policy + live ValueChain WealthPolicy.mode() read before relay/prepare. */
export async function evaluateTradePolicyWithChain(
  env: Env,
  input: {
    wallet: string;
    notionalUsd?: number;
    environment?: TradeEnvironment;
  },
): Promise<PolicyDecision> {
  const base = evaluateTradePolicy(env, input);
  const network = input.environment ?? "mainnet";
  const onChain = await readOnChainWealthPolicy(env, network);
  // Mainnet: mode + on-chain $1-class notional. Testnet: mode only; notional from env.
  return applyOnChainContinuityGate(base, onChain, input.notionalUsd, {
    applyOnChainNotionalCap: network === "mainnet",
  });
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
