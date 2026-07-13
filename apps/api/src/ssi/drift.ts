/**
 * SSI dual-source drift — Terminal index 24h vs on-chain token 24h.
 * Absolute NAV vs token USD are different units; drift is change divergence.
 */

export const SSI_DRIFT_THRESHOLD_PCT = 2;

export type OnChainTokenQuote = {
  symbol: string;
  address: string;
  priceUsd: number | null;
  change24hPct: number | null;
  pairUrl: string | null;
  source: "dexscreener";
  status: "LIVE" | "UNAVAILABLE";
};

export type SsiDrift = {
  indexId: string;
  terminalChange24hPct: number | null;
  tokenChange24hPct: number | null;
  tokenPriceUsd: number | null;
  driftPct: number | null;
  thresholdPct: number;
  alert: boolean;
  signal: string | null;
  action: "ALLOCATE_OR_REBALANCE" | "MONITOR" | "UNAVAILABLE";
  onChain: OnChainTokenQuote | null;
};

export function computeDriftPct(
  terminalChange24hPct: number | null | undefined,
  tokenChange24hPct: number | null | undefined,
): number | null {
  if (
    terminalChange24hPct == null ||
    tokenChange24hPct == null ||
    !Number.isFinite(terminalChange24hPct) ||
    !Number.isFinite(tokenChange24hPct)
  ) {
    return null;
  }
  return Math.abs(terminalChange24hPct - tokenChange24hPct);
}

export function buildDriftSignal(input: {
  indexId: string;
  tokenSymbol: string;
  terminalChange24hPct: number | null;
  tokenChange24hPct: number | null;
  tokenPriceUsd: number | null;
  thresholdPct?: number;
  onChain?: OnChainTokenQuote | null;
}): SsiDrift {
  const thresholdPct = input.thresholdPct ?? SSI_DRIFT_THRESHOLD_PCT;
  const driftPct = computeDriftPct(input.terminalChange24hPct, input.tokenChange24hPct);
  const alert = driftPct != null && driftPct >= thresholdPct;

  let action: SsiDrift["action"] = "UNAVAILABLE";
  let signal: string | null = null;

  if (driftPct == null) {
    action = "UNAVAILABLE";
    signal = null;
  } else if (alert) {
    action = "ALLOCATE_OR_REBALANCE";
    signal = `Index level vs ${input.tokenSymbol} token diverged ${driftPct.toFixed(1)}% (24h) — consider allocate/rebalance`;
  } else {
    action = "MONITOR";
    signal = `Terminal vs ${input.tokenSymbol} token 24h aligned within ${thresholdPct}% (drift ${driftPct.toFixed(1)}%)`;
  }

  return {
    indexId: input.indexId,
    terminalChange24hPct: input.terminalChange24hPct,
    tokenChange24hPct: input.tokenChange24hPct,
    tokenPriceUsd: input.tokenPriceUsd,
    driftPct,
    thresholdPct,
    alert,
    signal,
    action,
    onChain: input.onChain ?? null,
  };
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Fetch Base ERC-20 USD quote + 24h change from DexScreener (public). */
export async function fetchOnChainTokenQuote(opts: {
  symbol: string;
  address: string;
  fetchImpl?: typeof fetch;
}): Promise<OnChainTokenQuote> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const address = opts.address.trim();
  const base: OnChainTokenQuote = {
    symbol: opts.symbol,
    address,
    priceUsd: null,
    change24hPct: null,
    pairUrl: null,
    source: "dexscreener",
    status: "UNAVAILABLE",
  };

  try {
    const res = await fetchImpl(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return base;
    const body = asRecord(await res.json());
    const pairs = Array.isArray(body.pairs) ? body.pairs : [];
    if (pairs.length === 0) return base;

    // Prefer highest liquidity USD among Base pairs, else any pair.
    const ranked = pairs
      .map((p) => {
        const r = asRecord(p);
        const liq = asRecord(r.liquidity);
        const pc = asRecord(r.priceChange);
        const liquidityUsd = Number(liq.usd ?? 0);
        const priceUsd = Number(r.priceUsd);
        const change24hPct = Number(pc.h24);
        return {
          chainId: String(r.chainId ?? ""),
          liquidityUsd: Number.isFinite(liquidityUsd) ? liquidityUsd : 0,
          priceUsd: Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : null,
          change24hPct: Number.isFinite(change24hPct) ? change24hPct : null,
          url: typeof r.url === "string" ? r.url : null,
        };
      })
      .sort((a, b) => {
        const aBase = a.chainId === "base" || a.chainId === "8453" ? 1 : 0;
        const bBase = b.chainId === "base" || b.chainId === "8453" ? 1 : 0;
        if (aBase !== bBase) return bBase - aBase;
        return b.liquidityUsd - a.liquidityUsd;
      });

    const best = ranked[0];
    if (!best || best.priceUsd == null) return base;

    return {
      ...base,
      priceUsd: best.priceUsd,
      change24hPct: best.change24hPct,
      pairUrl: best.url,
      status: "LIVE",
    };
  } catch {
    return base;
  }
}

export async function evaluateSsiDrift(opts: {
  indexId: string;
  tokenSymbol: string;
  tokenAddress: string;
  terminalChange24hPct: number | null;
  thresholdPct?: number;
  fetchImpl?: typeof fetch;
}): Promise<SsiDrift> {
  const onChain = await fetchOnChainTokenQuote({
    symbol: opts.tokenSymbol,
    address: opts.tokenAddress,
    fetchImpl: opts.fetchImpl,
  });

  return buildDriftSignal({
    indexId: opts.indexId,
    tokenSymbol: opts.tokenSymbol,
    terminalChange24hPct: opts.terminalChange24hPct,
    tokenChange24hPct: onChain.change24hPct,
    tokenPriceUsd: onChain.priceUsd,
    thresholdPct: opts.thresholdPct,
    onChain,
  });
}
