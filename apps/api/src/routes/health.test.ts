import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadEnv } from "@heirlock/config";
import { buildApp } from "../app.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

test("health live returns ok", async () => {
  const env = loadEnv();
  const app = await buildApp(env);
  const res = await app.inject({ method: "GET", url: "/api/health/live" });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.status, "ok");
  await app.close();
});

test("config environment exposes per-user sodex architecture", async () => {
  const env = loadEnv();
  const app = await buildApp(env);
  const res = await app.inject({ method: "GET", url: "/api/config/environment" });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.sodex.architecture, "per-user-non-custodial-relay");
  assert.equal(body.ai.primaryProvider, "nvidia");
  await app.close();
});
