import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getCapability,
  isBuyable,
  isCancelOnlyError,
  recordCancelOnly,
  recordLiveMatcherOk,
} from "./capability.js";

test("cancel-only detector", () => {
  assert.equal(isCancelOnlyError("market is cancel-only"), true);
  assert.equal(isCancelOnlyError("insufficient balance"), false);
});

test("capability cache round-trip in memory", async () => {
  await recordLiveMatcherOk({
    environment: "testnet",
    symbol: "vBTC_vUSDC",
    filled: false,
  });
  const cap = await getCapability({
    environment: "testnet",
    symbol: "vBTC_vUSDC",
  });
  assert.ok(cap);
  assert.equal(cap?.state, "MATCHER_OK");
  assert.equal(isBuyable(cap), true);

  await recordCancelOnly({
    environment: "testnet",
    symbol: "vBTC_vUSDC",
    reason: "cancel only mode",
  });
  const neg = await getCapability({
    environment: "testnet",
    symbol: "vBTC_vUSDC",
  });
  assert.equal(neg?.state, "CANCEL_ONLY");
  assert.equal(isBuyable(neg), false);
});
