import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnv } from "@heirlock/config";
import { buildApp } from "../app.js";

test("GET /api/contracts exposes deployed ValueChain mainnet addresses", async () => {
  const env = loadEnv();
  const app = await buildApp(env);
  await app.ready();
  const res = await app.inject({ method: "GET", url: "/api/contracts" });
  assert.equal(res.statusCode, 200);
  const body = res.json() as {
    mainnet: { deployed: boolean; chainId: number; addresses: Record<string, string | null> };
    testnet: { deployed: boolean; chainId: number };
  };
  assert.equal(body.mainnet.chainId, 286623);
  assert.equal(body.testnet.chainId, 138565);
  if (env.WEALTH_POLICY_ADDRESS) {
    assert.equal(body.mainnet.deployed, true);
    assert.equal(
      body.mainnet.addresses.wealthPolicy?.toLowerCase(),
      env.WEALTH_POLICY_ADDRESS.toLowerCase(),
    );
  }
  await app.close();
});
