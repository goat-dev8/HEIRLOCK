import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnv } from "@heirlock/config";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { evaluateTradePolicy, effectiveNotionalCapUsd } from "./policy.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

test("kill switch blocks trades", () => {
  const env = { ...loadEnv(), KILL_SWITCH_TRADING: true };
  const d = evaluateTradePolicy(env, { wallet: "0xabc", environment: "testnet" });
  assert.equal(d.ok, false);
});

test("mainnet rejects notional above 1 USDC hard cap", () => {
  const env = {
    ...loadEnv(),
    TRADING_MAX_NOTIONAL_USD: 1,
    MAINNET_TEST_MAX_NOTIONAL_USD: 1,
    KILL_SWITCH_TRADING: false,
    TRADING_ENABLED: true,
    TRADING_ALLOWLIST: "",
  };
  const d = evaluateTradePolicy(env, {
    wallet: "0xabc",
    notionalUsd: 1.5,
    environment: "mainnet",
  });
  assert.equal(d.ok, false);
});

test("mainnet allows 0.5 USDC", () => {
  const env = {
    ...loadEnv(),
    TRADING_MAX_NOTIONAL_USD: 1,
    MAINNET_TEST_MAX_NOTIONAL_USD: 1,
    KILL_SWITCH_TRADING: false,
    TRADING_ENABLED: true,
    TRADING_ALLOWLIST: "",
  };
  const d = evaluateTradePolicy(env, {
    wallet: "0xabc",
    notionalUsd: 0.5,
    environment: "mainnet",
  });
  assert.equal(d.ok, true);
});

test("testnet allows large notional", () => {
  const env = {
    ...loadEnv(),
    TESTNET_TEST_MAX_NOTIONAL_USD: 100000,
    KILL_SWITCH_TRADING: false,
    TRADING_ENABLED: true,
    TRADING_ALLOWLIST: "",
  };
  const d = evaluateTradePolicy(env, {
    wallet: "0xabc",
    notionalUsd: 500,
    environment: "testnet",
  });
  assert.equal(d.ok, true);
  assert.equal(effectiveNotionalCapUsd(env, "mainnet") <= 1, true);
});

test("testnet ignores TRADING_ALLOWLIST (SoDEX aid is the gate)", () => {
  const env = {
    ...loadEnv(),
    KILL_SWITCH_TRADING: false,
    TRADING_ENABLED: true,
    TRADING_ALLOWLIST: "0xf76e6b0920e9332ff4410f6dd53f01722abc71a3",
  };
  const d = evaluateTradePolicy(env, {
    wallet: "0x0103000000000000000000000000000000001337",
    notionalUsd: 11.25,
    environment: "testnet",
  });
  assert.equal(d.ok, true);
});

test("mainnet still enforces TRADING_ALLOWLIST when set", () => {
  const env = {
    ...loadEnv(),
    KILL_SWITCH_TRADING: false,
    TRADING_ENABLED: true,
    TRADING_ALLOWLIST: "0xf76e6b0920e9332ff4410f6dd53f01722abc71a3",
    TRADING_MAX_NOTIONAL_USD: 1,
    MAINNET_TEST_MAX_NOTIONAL_USD: 1,
  };
  const blocked = evaluateTradePolicy(env, {
    wallet: "0x0103000000000000000000000000000000001337",
    notionalUsd: 0.5,
    environment: "mainnet",
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.reason, "wallet_not_allowlisted");
});
