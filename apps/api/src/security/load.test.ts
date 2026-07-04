/**
 * Light load / concurrency smoke — development scale only.
 * Hits public health endpoints concurrently; asserts no 5xx storm.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnv } from "@heirlock/config";
import { buildApp } from "../app.js";

test("concurrent health probes stay healthy under light load", async () => {
  const env = loadEnv();
  const app = await buildApp(env);
  await app.ready();

  const N = 40;
  const results = await Promise.all(
    Array.from({ length: N }, () =>
      app.inject({ method: "GET", url: "/api/health/live" }),
    ),
  );

  const byStatus = new Map<number, number>();
  for (const r of results) {
    byStatus.set(r.statusCode, (byStatus.get(r.statusCode) ?? 0) + 1);
  }

  const ok = byStatus.get(200) ?? 0;
  const limited = byStatus.get(429) ?? 0;
  const serverErr = [...byStatus.entries()]
    .filter(([code]) => code >= 500)
    .reduce((a, [, n]) => a + n, 0);

  assert.equal(serverErr, 0, `unexpected 5xx under load: ${JSON.stringify([...byStatus])}`);
  assert.ok(ok + limited === N, "all responses should be 200 or 429");
  assert.ok(ok > 0, "at least some requests should succeed");

  await app.close();
});
