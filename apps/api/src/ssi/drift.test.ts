import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDriftSignal,
  computeDriftPct,
  fetchOnChainTokenQuote,
  SSI_DRIFT_THRESHOLD_PCT,
} from "./drift.js";

test("computeDriftPct absolute difference", () => {
  assert.equal(computeDriftPct(1.2, -2.0), 3.2);
  assert.equal(computeDriftPct(null, 1), null);
  assert.equal(computeDriftPct(1, undefined), null);
});

test("buildDriftSignal alerts at threshold", () => {
  const alert = buildDriftSignal({
    indexId: "ssimag7",
    tokenSymbol: "MAG7.ssi",
    terminalChange24hPct: 1.2,
    tokenChange24hPct: -2.0,
    tokenPriceUsd: 0.42,
  });
  assert.equal(alert.driftPct, 3.2);
  assert.equal(alert.alert, true);
  assert.equal(alert.action, "ALLOCATE_OR_REBALANCE");
  assert.match(String(alert.signal), /diverged 3\.2%/);
  assert.equal(alert.thresholdPct, SSI_DRIFT_THRESHOLD_PCT);

  const calm = buildDriftSignal({
    indexId: "ssimag7",
    tokenSymbol: "MAG7.ssi",
    terminalChange24hPct: 0.4,
    tokenChange24hPct: 0.5,
    tokenPriceUsd: 0.42,
  });
  assert.equal(calm.alert, false);
  assert.equal(calm.action, "MONITOR");
});

test("fetchOnChainTokenQuote parses DexScreener payload", async () => {
  const quote = await fetchOnChainTokenQuote({
    symbol: "MAG7.ssi",
    address: "0xabc",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          pairs: [
            {
              chainId: "base",
              priceUsd: "0.41",
              priceChange: { h24: -1.5 },
              liquidity: { usd: 100000 },
              url: "https://dexscreener.com/base/0xpair",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });
  assert.equal(quote.status, "LIVE");
  assert.equal(quote.priceUsd, 0.41);
  assert.equal(quote.change24hPct, -1.5);
  assert.equal(quote.pairUrl, "https://dexscreener.com/base/0xpair");
});
