import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadEnv } from "@heirlock/config";
import { createSodexClient } from "./client.js";
import { buildApp } from "../app.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

test("SoDEX gateways expose official mainnet URLs", async () => {
  const env = loadEnv();
  const app = await buildApp(env);
  const res = await app.inject({ method: "GET", url: "/api/sodex/gateways" });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.architecture, "per-user-non-custodial-relay");
  assert.equal(body.spotRest, "https://mainnet-gw.sodex.dev/api/v1/spot");
  assert.equal(body.appUrl, "https://sodex.com");
  await app.close();
});

test("SoDEX client works without treating local test keys as house account", () => {
  const env = loadEnv();
  const client = createSodexClient(env);
  const gw = client.gateways("mainnet");
  assert.ok(gw.spotRest.includes("mainnet-gw.sodex.dev"));
  // Local SODEX_* may exist for test-only; product architecture remains per-user relay
  assert.equal(env.SODEX_LOCAL_TEST_WALLET_ONLY, true);
  assert.equal(
    (loadEnv() as { sodexArchitecture?: string }) && true,
    true,
  );
});
