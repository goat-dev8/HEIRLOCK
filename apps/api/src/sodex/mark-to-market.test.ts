import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSpotPriceMap,
  enrichBalancesWithUsd,
  mergeSymbolsWithTickers,
  normalizeSsiSnapshot,
  usdPriceForAsset,
} from "./mark-to-market.js";

describe("mark-to-market", () => {
  it("maps lastPx tickers and aliases WSOSO", () => {
    const prices = buildSpotPriceMap({
      data: [
        { symbol: "WSOSO_vUSDC", lastPx: "0.42" },
        { symbol: "vETH_vUSDC", lastPx: "3500" },
      ],
    });
    assert.equal(usdPriceForAsset("vUSDC", prices), 1);
    assert.equal(usdPriceForAsset("WSOSO", prices), 0.42);
    assert.equal(usdPriceForAsset("SOSO", prices), 0.42);
    assert.equal(usdPriceForAsset("vETH", prices), 3500);
  });

  it("enriches balances with usdValue", () => {
    const prices = buildSpotPriceMap([{ symbol: "vETH_vUSDC", lastPx: 10 }]);
    const marked = enrichBalancesWithUsd(
      [{ coin: "vUSDC", available: "100", locked: "0", total: "100" }, { coin: "vETH", total: "2" }],
      prices,
    );
    assert.equal(marked.totals.usd, 120);
    assert.equal(marked.balances[0].usdValue, 100);
    assert.equal(marked.balances[1].usdValue, 20);
  });

  it("unwraps SoDEX nested data.balances envelope", () => {
    const prices = buildSpotPriceMap([{ symbol: "WSOSO_vUSDC", lastPx: "0.5" }]);
    const marked = enrichBalancesWithUsd(
      {
        code: 0,
        data: {
          balances: [
            { coin: "vUSDC", total: "5.96", locked: "0" },
            { coin: "WSOSO", total: "1.33", locked: "0" },
          ],
        },
      },
      prices,
    );
    assert.equal(marked.balances.length, 2);
    assert.ok(marked.totals.usd != null && marked.totals.usd > 6);
  });

  it("merges symbols with ticker lastPx", () => {
    const rows = mergeSymbolsWithTickers(
      [{ id: 1, name: "HYPE_vUSDC", symbol: "HYPE_vUSDC" }],
      [{ symbol: "HYPE_vUSDC", lastPx: "19.55" }],
    );
    assert.equal(rows[0].price, 19.55);
  });

  it("normalizes SSI snapshot fields", () => {
    const snap = normalizeSsiSnapshot(
      { price: 20.93, "24h_change_pct": -0.0016 },
      "ssimag7",
    );
    assert.equal(snap.nav, 20.93);
    assert.ok(snap.change24h != null && Math.abs(snap.change24h + 0.16) < 1e-9);
    assert.equal(snap.aum, null);
  });
});
