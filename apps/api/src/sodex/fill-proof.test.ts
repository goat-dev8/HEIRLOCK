import assert from "node:assert/strict";
import { test } from "node:test";
import { reconcileFill } from "./fill-proof.js";
import type { SodexClient, SodexEnvironment } from "./client.js";

function mockSodex(opts: {
  history?: unknown;
  trades?: unknown;
  balances?: unknown;
}): SodexClient {
  return {
    getOrderHistory: async () => opts.history ?? [],
    getTrades: async () => opts.trades ?? [],
    getBalances: async () => opts.balances ?? [{ a: "USDC", t: "1" }],
  } as unknown as SodexClient;
}

test("reconcileFill never marks filled without trade evidence", async () => {
  const sodex = mockSodex({
    history: [{ orderID: "99", status: "FILLED", executedQty: 1 }],
    trades: [],
  });
  const ev = await reconcileFill({
    sodex,
    environment: "testnet" as SodexEnvironment,
    wallet: "0xabc",
    sodexOrderId: "99",
    timeoutMs: 10,
    intervalMs: 5,
  });
  assert.notEqual(ev.status, "filled");
  assert.equal(ev.historyMatch, true);
  assert.equal(ev.tradesMatch, false);
});

test("reconcileFill marks filled when history + trades + balances align", async () => {
  const sodex = mockSodex({
    history: [{ orderID: "42", status: "FILLED", executedQty: 0.5 }],
    trades: [{ tradeID: "t1", orderID: "42", size: 0.5, price: "100", side: "BUY" }],
    balances: [{ a: "vBTC", t: "0.5" }],
  });
  const ev = await reconcileFill({
    sodex,
    environment: "testnet" as SodexEnvironment,
    wallet: "0xabc",
    sodexOrderId: "42",
    timeoutMs: 50,
    intervalMs: 5,
  });
  assert.equal(ev.status, "filled");
  assert.equal(ev.executedQty, 0.5);
  assert.deepEqual(ev.tradeIds, ["t1"]);
  assert.equal(ev.balanceChecked, true);
});

test("reconcileFill stays unconfirmed without sodexOrderId", async () => {
  const sodex = mockSodex({
    history: [{ orderID: "1", status: "FILLED", executedQty: 1 }],
    trades: [{ tradeID: "t1", orderID: "1", size: 1 }],
  });
  const ev = await reconcileFill({
    sodex,
    environment: "testnet" as SodexEnvironment,
    wallet: "0xabc",
    sodexOrderId: null,
    timeoutMs: 10,
    intervalMs: 5,
  });
  assert.equal(ev.status, "unconfirmed");
});
