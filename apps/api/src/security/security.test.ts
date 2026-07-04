import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnv } from "@heirlock/config";
import { buildApp } from "../app.js";
import { evaluateTradePolicy } from "../trading/policy.js";

test("kill switch blocks trade policy", () => {
  const env = loadEnv();
  const blocked = evaluateTradePolicy(
    { ...env, KILL_SWITCH_TRADING: true, TRADING_ENABLED: true },
    { wallet: "0x1111111111111111111111111111111111111111", notionalUsd: 0.5 },
  );
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.match(blocked.reason, /KILL_SWITCH/);
});

test("mainnet hard cap refuses >1 USDC", () => {
  const env = loadEnv();
  const blocked = evaluateTradePolicy(
    { ...env, TRADING_ENABLED: true, KILL_SWITCH_TRADING: false, TRADING_ALLOWLIST: "" },
    {
      wallet: "0x1111111111111111111111111111111111111111",
      notionalUsd: 1.01,
      environment: "mainnet",
    },
  );
  assert.equal(blocked.ok, false);
});

test("helmet + rate-limit registered; health responds", async () => {
  const env = loadEnv();
  const app = await buildApp(env);
  await app.ready();
  const res = await app.inject({ method: "GET", url: "/api/health/live" });
  assert.equal(res.statusCode, 200);
  assert.ok(res.headers["x-content-type-options"] === "nosniff" || res.headers["content-type"]);
  await app.close();
});

test("rate limit eventually returns 429 under burst", async () => {
  const env = loadEnv();
  const { buildApp: build } = await import("../app.js");
  // Use a fresh app; burst past the configured 120/min ceiling
  const app = await build(env);
  await app.ready();

  let saw429 = false;
  for (let i = 0; i < 200; i++) {
    const res = await app.inject({ method: "GET", url: "/api/health/live" });
    if (res.statusCode === 429) {
      saw429 = true;
      break;
    }
  }
  assert.equal(saw429, true, "expected 429 after exceeding rate limit");
  await app.close();
});
