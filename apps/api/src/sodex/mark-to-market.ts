/**
 * Mark SoDEX balances / symbols to USD using official spot tickers (`lastPx`).
 * Stables = $1. WSOSO aliases SOSO. Never fabricate missing prices.
 */

export type PriceMap = Map<string, number>;

const STABLES = new Set([
  "VUSDC",
  "USDC",
  "VUSDT",
  "USDT",
  "USD",
  "VUSD",
]);

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function unwrapArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  const r = asRecord(v);
  for (const k of ["data", "list", "items", "result", "rows", "symbols", "tickers", "balances"]) {
    if (Array.isArray(r[k])) return r[k] as unknown[];
  }
  if (r.data && typeof r.data === "object") {
    const nested = asRecord(r.data);
    // SoDEX balances: { code, data: { balances: [...] } } — data is an object, not an array
    for (const k of ["balances", "list", "items", "result", "rows", "symbols", "tickers"]) {
      if (Array.isArray(nested[k])) return nested[k] as unknown[];
    }
  }
  return [];
}

export function buildSpotPriceMap(tickersRaw: unknown): PriceMap {
  const map: PriceMap = new Map();
  for (const row of unwrapArray(tickersRaw)) {
    const r = asRecord(row);
    const symbol = String(r.symbol ?? r.name ?? r.pair ?? "").trim();
    if (!symbol) continue;
    const last = Number(r.lastPx ?? r.lastPrice ?? r.price ?? r.markPx ?? r.close);
    if (!Number.isFinite(last) || last <= 0) continue;

    const upper = symbol.toUpperCase();
    map.set(upper, last);

    const base = upper.split("_")[0] ?? upper;
    if (!map.has(base)) map.set(base, last);

    // Strip leading V for aliases (vBTC → BTC)
    if (base.startsWith("V") && base.length > 1) {
      const bare = base.slice(1);
      if (!map.has(bare)) map.set(bare, last);
    }
    // WSOSO ↔ SOSO
    if (base === "WSOSO") {
      map.set("SOSO", last);
      map.set("WSOSO", last);
    }
    if (base === "SOSO") {
      map.set("WSOSO", last);
    }
  }
  return map;
}

export function usdPriceForAsset(asset: string, prices: PriceMap): number | undefined {
  const a = asset.trim().toUpperCase();
  if (!a) return undefined;
  if (STABLES.has(a)) return 1;

  const candidates = [
    a,
    a.startsWith("V") ? a.slice(1) : `V${a}`,
    a === "SOSO" ? "WSOSO" : a === "WSOSO" ? "SOSO" : null,
    `${a}_VUSDC`,
    `${a}_USDC`,
    a.startsWith("V") ? `${a.slice(1)}_VUSDC` : `V${a}_VUSDC`,
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    const px = prices.get(c);
    if (px != null && Number.isFinite(px) && px > 0) return px;
  }
  return undefined;
}

export function enrichBalancesWithUsd(balancesRaw: unknown, prices: PriceMap) {
  const rows = unwrapArray(balancesRaw);
  let totalUsd = 0;
  let priced = 0;
  const balances = rows.map((row) => {
    const r = asRecord(row);
    const asset = String(r.coin ?? r.asset ?? r.symbol ?? r.coinName ?? "UNKNOWN");
    const locked = Number(r.locked ?? r.freeze ?? r.frozen ?? 0);
    const totalRaw = r.total ?? r.balance;
    const freeRaw = r.available ?? r.free ?? r.avail;
    const free =
      freeRaw != null
        ? Number(freeRaw)
        : totalRaw != null
          ? Number(totalRaw) - locked
          : 0;
    const total = totalRaw != null ? Number(totalRaw) : free + locked;
    const price = usdPriceForAsset(asset, prices);
    const usdValue = price != null && Number.isFinite(total) ? total * price : undefined;
    if (usdValue != null) {
      totalUsd += usdValue;
      priced += 1;
    }
    return {
      ...r,
      asset,
      coin: asset,
      free,
      available: free,
      locked,
      total,
      priceUsd: price ?? null,
      usdValue: usdValue ?? null,
    };
  });
  return {
    balances,
    totals: {
      usd: priced > 0 ? totalUsd : null,
      assets: balances.length,
      pricedAssets: priced,
      note:
        priced === 0
          ? "USD marks unavailable — SoDEX tickers missing for held assets"
          : priced < balances.length
            ? "Some assets lack a SoDEX lastPx mark"
            : undefined,
    },
  };
}

export function mergeSymbolsWithTickers(symbolsRaw: unknown, tickersRaw: unknown) {
  const prices = buildSpotPriceMap(tickersRaw);
  return unwrapArray(symbolsRaw).map((row) => {
    const r = asRecord(row);
    const symbol = String(r.symbol ?? r.name ?? r.displayName ?? r.pair ?? "");
    const upper = symbol.toUpperCase();
    const base = upper.split("_")[0] ?? upper;
    const lastPx =
      prices.get(upper) ??
      prices.get(base) ??
      (typeof r.lastPx === "number" || typeof r.lastPx === "string" ? Number(r.lastPx) : undefined);
    const price = lastPx != null && Number.isFinite(lastPx) ? lastPx : undefined;
    return {
      ...r,
      symbol,
      price: price ?? null,
      lastPx: price ?? null,
      lastPrice: price ?? null,
    };
  });
}

export function normalizeSsiSnapshot(raw: unknown, indexId: string) {
  const data = asRecord(Array.isArray(raw) ? {} : unwrapObject(raw));
  const price = num(data.price ?? data.nav ?? data.NAV ?? data.indexNav ?? data.last_price ?? data.close);
  const changeRaw = num(
    data["24h_change_pct"] ??
      data.change_pct_24h ??
      data.change24h ??
      data.changePct24h ??
      data.pctChange24h,
  );
  // Official SoSoValue returns fractional change (e.g. -0.0016 = -0.16%)
  const change24hPct =
    changeRaw == null ? null : Math.abs(changeRaw) <= 1 ? changeRaw * 100 : changeRaw;
  const aum = num(data.aum ?? data.AUM ?? data.tvl ?? data.total_value_locked ?? data.market_cap);
  return {
    indexId,
    nav: price,
    price,
    aum: aum ?? null,
    aumAvailable: aum != null,
    change24h: change24hPct,
    change24hPct,
    roi7d: pctMaybe(data["7day_roi"] ?? data.roi_7d),
    roi1m: pctMaybe(data["1month_roi"] ?? data.roi_1m),
    roi3m: pctMaybe(data["3month_roi"] ?? data.roi_3m),
    roi1y: pctMaybe(data["1year_roi"] ?? data.roi_1y),
    ytd: pctMaybe(data.ytd),
    raw: data,
    source: "sosovalue",
    note:
      aum == null
        ? "AUM/TVL is not always present on SoSoValue index market-snapshot"
        : undefined,
  };
}

function unwrapObject(v: unknown): Record<string, unknown> {
  const r = asRecord(v);
  if (r.data && typeof r.data === "object" && !Array.isArray(r.data)) return asRecord(r.data);
  return r;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pctMaybe(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  return Math.abs(n) <= 1 ? n * 100 : n;
}
