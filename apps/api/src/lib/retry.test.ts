import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultShouldRetry, withRetry, pollUntil } from "./retry.js";

test("withRetry succeeds after transient failures", async () => {
  let n = 0;
  const result = await withRetry(
    async () => {
      n += 1;
      if (n < 3) {
        const err = new Error("429 rate limit");
        (err as { status?: number }).status = 429;
        throw err;
      }
      return "ok";
    },
    { attempts: 5, baseDelayMs: 1 },
  );
  assert.equal(result, "ok");
  assert.equal(n, 3);
});

test("withRetry does not retry non-transient errors", async () => {
  let n = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          n += 1;
          throw new Error("validation failed");
        },
        { attempts: 5, baseDelayMs: 1 },
      ),
    /validation failed/,
  );
  assert.equal(n, 1);
});

test("defaultShouldRetry recognizes 503", () => {
  assert.equal(defaultShouldRetry({ status: 503, message: "down" }), true);
  assert.equal(defaultShouldRetry({ status: 400, message: "bad" }), false);
});

test("pollUntil resolves when predicate matches", async () => {
  let n = 0;
  const value = await pollUntil(
    async () => {
      n += 1;
      return n;
    },
    (v) => v >= 3,
    { timeoutMs: 2000, intervalMs: 1 },
  );
  assert.equal(value, 3);
});
