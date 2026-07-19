/**
 * Core Living Loop computation — SoSoValue Terminal + SSI drift citations and
 * the resulting proposal/preflight. Extracted so both the `/api/fo/living-loop`
 * route and the Partner "Why" pack (live proposal) share one source of truth.
 */
import type { AppContext } from "../app.js";
import { normalizeSsiSnapshot } from "../sodex/mark-to-market.js";
import { OPENAPI_TO_TOKEN, SSI_INDEX_TOKENS, basescanTokenUrl } from "../ssi/addresses.js";
import { evaluateSsiDrift } from "../ssi/drift.js";

export type LivingLoopCitation = { source: string; endpoint: string; at: string; status: string };

export type LivingLoopResult = {
  citations: LivingLoopCitation[];
  evidence: {
    etf: unknown;
    news: unknown;
    macro: unknown;
    indexSnapshot: ReturnType<typeof normalizeSsiSnapshot> | null;
    indices: unknown;
  };
  proposal: Record<string, unknown>;
  drift: Awaited<ReturnType<typeof evaluateSsiDrift>> | null;
  preflight: { verdict: string; factors: Array<{ id: string; label: string; status: string; detail: string }> };
  liveCount: number;
};

const LOOP_TTL_MS = 45_000;
type LoopCacheEntry = { at: number; foEnabled: boolean; result: LivingLoopResult };
let loopCache: LoopCacheEntry | null = null;
const loopInflight = new Map<string, Promise<LivingLoopResult>>();

/** Drop the shared Living Loop cache (tests / forced refresh). */
export function invalidateLivingLoopCache() {
  loopCache = null;
  loopInflight.clear();
}

export async function computeLivingLoop(
  ctx: AppContext,
  opts: { foEnabled: boolean; foReason?: string },
): Promise<LivingLoopResult> {
  const hit = loopCache;
  if (hit && hit.foEnabled === opts.foEnabled && Date.now() - hit.at < LOOP_TTL_MS) {
    return hit.result;
  }
  const key = opts.foEnabled ? "1" : "0";
  const pending = loopInflight.get(key);
  if (pending) return pending;

  const job = computeLivingLoopFresh(ctx, opts)
    .then((result) => {
      loopCache = { at: Date.now(), foEnabled: opts.foEnabled, result };
      return result;
    })
    .finally(() => {
      loopInflight.delete(key);
    });
  loopInflight.set(key, job);
  return job;
}

async function computeLivingLoopFresh(
  ctx: AppContext,
  opts: { foEnabled: boolean; foReason?: string },
): Promise<LivingLoopResult> {
  const citations: LivingLoopCitation[] = [];
  const at = () => new Date().toISOString();

  const settle = async <T>(
    label: string,
    endpoint: string,
    fn: () => Promise<T>,
  ): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
    try {
      const data = await fn();
      citations.push({ source: label, endpoint, at: at(), status: "LIVE" });
      return { ok: true, data };
    } catch (e) {
      citations.push({ source: label, endpoint, at: at(), status: "UNAVAILABLE" });
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  };

  const [etf, news, macro, indexSnap, indexList] = await Promise.all([
    settle("etf", "/etfs/summary-history", () =>
      ctx.soso.etfSummaryHistory({ symbol: "BTC", country_code: "US", limit: 5 }),
    ),
    settle("feeds", "/news/hot", () => ctx.soso.hotNews({ page: 1, page_size: 5 })),
    settle("macro", "/macro/events", () => ctx.soso.macroEvents({ limit: 5 })),
    settle("index", "/indices/ssimag7/market-snapshot", () => ctx.soso.indexMarketSnapshot("ssimag7")),
    settle("indices", "/indices", () => ctx.soso.listIndices()),
  ]);

  const normalized = indexSnap.ok ? normalizeSsiSnapshot(indexSnap.data, "ssimag7") : null;
  const tokenSym = OPENAPI_TO_TOKEN.ssimag7;
  const tokenAddr = tokenSym ? SSI_INDEX_TOKENS[tokenSym] : null;

  let drift: LivingLoopResult["drift"] = null;
  if (tokenSym && tokenAddr) {
    drift = await evaluateSsiDrift({
      indexId: "ssimag7",
      tokenSymbol: tokenSym,
      tokenAddress: tokenAddr,
      terminalChange24hPct: normalized?.change24h ?? null,
    });
    citations.push({
      source: "ssi_token",
      endpoint: `dexscreener:/tokens/${tokenAddr}`,
      at: at(),
      status: drift.onChain?.status === "LIVE" ? "LIVE" : "UNAVAILABLE",
    });
  }

  const liveCount = citations.filter((c) => c.status === "LIVE").length;
  const proposal = {
    action: drift?.alert ? "SSI_DRIFT_ALLOCATE_OR_REBALANCE" : "REVIEW_SSI_AND_SODEX",
    title: drift?.alert
      ? `ssiMAG7 drift ${drift.driftPct?.toFixed(1)}% — allocate or rebalance`
      : "Hold MAG7 exposure; confirm SoDEX proxy liquidity before size",
    rationale: drift?.alert
      ? String(drift.signal)
      : normalized?.change24h != null && normalized.change24h < -1
        ? "Terminal index 24h soft; prefer confirm-before-execute and policy cap."
        : "Terminal index stable enough for Family Office review — still confirm under policy.",
    indexLevel: normalized?.nav ?? null,
    change24hPct: normalized?.change24h ?? null,
    onChainToken: tokenSym
      ? {
          symbol: tokenSym,
          address: tokenAddr,
          basescan: tokenAddr ? basescanTokenUrl(tokenAddr) : null,
          priceUsd: drift?.tokenPriceUsd ?? null,
          change24hPct: drift?.tokenChange24hPct ?? null,
        }
      : null,
    drift,
    sodexHint: "Trade WSOSO_vUSDC or SSI proxies on SoDEX after Enable Trading + verify aid",
    ssiAllocateUrl: ctx.env.SSI_APP_URL,
    ssiEarnUrl: `${String(ctx.env.SSI_APP_URL).replace(/\/$/, "")}/earn`,
  };

  const maxNotional = Math.min(ctx.env.TRADING_MAX_NOTIONAL_USD, ctx.env.MAINNET_TEST_MAX_NOTIONAL_USD, 1);
  const preflight = {
    verdict: ctx.env.KILL_SWITCH_TRADING ? "BLOCK" : "APPROVE",
    factors: [
      {
        id: "policy_cap",
        label: "WealthPolicy notional cap",
        status: "ok",
        detail: `Max $${maxNotional} mainnet-limited`,
      },
      {
        id: "kill_switch",
        label: "Kill switch",
        status: ctx.env.KILL_SWITCH_TRADING ? "block" : "ok",
        detail: ctx.env.KILL_SWITCH_TRADING ? "Trading halted" : "Clear",
      },
      {
        id: "family_office_skill",
        label: "Family Office Skill",
        status: opts.foEnabled ? "ok" : "block",
        detail: opts.foEnabled ? "Enabled" : opts.foReason ?? "Disabled",
      },
      {
        id: "terminal_feeds",
        label: "SoSoValue Terminal feeds",
        status: liveCount >= 3 ? "ok" : liveCount >= 1 ? "caution" : "block",
        detail: `${liveCount}/${citations.length} LIVE`,
      },
      {
        id: "macro_window",
        label: "Macro feed",
        status: macro.ok ? "ok" : "caution",
        detail: macro.ok ? "Events loaded" : "Macro UNAVAILABLE — proceed with caution",
      },
      {
        id: "ssi_drift",
        label: "SSI Terminal vs token drift",
        status:
          drift == null || drift.action === "UNAVAILABLE" ? "caution" : drift.alert ? "caution" : "ok",
        detail: drift?.signal ?? "On-chain token quote unavailable — dual-source check incomplete",
      },
    ],
  };
  if (preflight.factors.some((f) => f.status === "block")) preflight.verdict = "BLOCK";
  else if (preflight.factors.some((f) => f.status === "caution")) preflight.verdict = "CAUTION";

  return {
    citations,
    evidence: {
      etf: etf.ok ? etf.data : null,
      news: news.ok ? news.data : null,
      macro: macro.ok ? macro.data : null,
      indexSnapshot: normalized,
      indices: indexList.ok ? indexList.data : null,
    },
    proposal,
    drift,
    preflight,
    liveCount,
  };
}
