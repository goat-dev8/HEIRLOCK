import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { SiweMessage } from "siwe";
import { loadEnv } from "@heirlock/config";
import { buildApp } from "../app.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

test("SIWE nonce + verify issues JWT bound to wallet", async () => {
  const env = loadEnv();
  const app = await buildApp(env);

  // Deterministic throwaway key for unit test only (not a funded wallet)
  const account = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4a2dc08",
  );

  const nonceRes = await app.inject({
    method: "POST",
    url: "/api/auth/nonce",
    payload: { address: account.address },
  });
  assert.equal(nonceRes.statusCode, 200);
  const { nonce, domain, uri, chainId, statement } = nonceRes.json();

  const message = new SiweMessage({
    domain,
    address: account.address,
    statement,
    uri,
    version: "1",
    chainId,
    nonce,
  });
  const prepared = message.prepareMessage();
  const signature = await account.signMessage({ message: prepared });

  const verifyRes = await app.inject({
    method: "POST",
    url: "/api/auth/verify",
    payload: { message: prepared, signature },
  });
  assert.equal(verifyRes.statusCode, 200, verifyRes.body);
  const body = verifyRes.json();
  assert.ok(body.token);
  assert.equal(body.address, account.address.toLowerCase());

  const meRes = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: { authorization: `Bearer ${body.token}` },
  });
  assert.equal(meRes.statusCode, 200);
  assert.equal(meRes.json().address, account.address.toLowerCase());

  // nonce reuse must fail
  const reuse = await app.inject({
    method: "POST",
    url: "/api/auth/verify",
    payload: { message: prepared, signature },
  });
  assert.equal(reuse.statusCode, 401);

  await app.close();
});
