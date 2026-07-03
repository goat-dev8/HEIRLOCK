import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnv } from "@heirlock/config";
import { buildApp } from "../app.js";

test("cron routes require bearer secret", async () => {
  const env = loadEnv({
    CRON_SECRET: "test-cron-secret-heirlock",
  });
  const app = await buildApp(env);
  await app.ready();

  const denied = await app.inject({ method: "POST", url: "/api/cron/heartbeat" });
  assert.equal(denied.statusCode, 401);

  const ok = await app.inject({
    method: "POST",
    url: "/api/cron/heartbeat",
    headers: { authorization: "Bearer test-cron-secret-heirlock" },
  });
  assert.equal(ok.statusCode, 200);
  const body = ok.json() as { ok: boolean };
  assert.equal(body.ok, true);
  await app.close();
});
