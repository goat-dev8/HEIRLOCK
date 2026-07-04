import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadEnv } from "@heirlock/config";
import { createSodexClient } from "./client.js";
import { nextSodexNonce } from "./nonce.js";
import { SodexWsClient } from "./ws.js";
import { prepareSpotBatchOrder } from "../trading/engine.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

test("testnet markets symbols are live", async () => {
  const env = loadEnv();
  const client = createSodexClient(env);
  const data = await client.listSymbols("testnet");
  const list = Array.isArray(data) ? data : (data as { data?: unknown[] }).data;
  assert.ok(Array.isArray(list) && list.length > 0);
});

test("testnet balances by userAddress", async () => {
  const env = loadEnv();
  const addr = env.SODEX_ADDRESS ?? env.SODEX_TEST_ADDRESS;
  assert.ok(addr, "local test address required");
  const client = createSodexClient(env);
  const bal = await client.getBalances("testnet", addr!);
  assert.ok(bal != null);
});

test("nonce is monotonic", async () => {
  const a = await nextSodexNonce("0x00000000000000000000000000000000000000aa");
  const b = await nextSodexNonce("0x00000000000000000000000000000000000000aa");
  assert.ok(b > a);
});

test("prepareSpotBatchOrder blocks mainnet over cap", () => {
  const env = loadEnv();
  const r = prepareSpotBatchOrder(env, {
    environment: "mainnet",
    accountID: 1,
    symbolID: 1,
    side: 1,
    type: 1,
    timeInForce: 1,
    funds: "5",
    notionalUsd: 5,
    wallet: env.SODEX_ADDRESS ?? "0x0000000000000000000000000000000000000001",
  });
  assert.equal(r.ok, false);
});

test("SoDEX WS connects and receives on testnet", async () => {
  const env = loadEnv();
  const ws = SodexWsClient.fromEnv(env, "testnet", "spot");
  const msgs: unknown[] = [];
  try {
    await ws.connect();
    ws.onMessage((m) => msgs.push(m));
    ws.subscribe({ type: "trades", symbol: "vBTC_vUSDC" });
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline && msgs.length < 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(msgs.length >= 1, "expected at least one WS message/ack");
  } finally {
    ws.close();
  }
});
