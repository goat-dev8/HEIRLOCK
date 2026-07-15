import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * Mirrors frontend/src/lib/partner-handoff.ts formatPulseDelta —
 * kept in API test suite so CI runs without a frontend test runner.
 */
function formatPulseDelta(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-9) {
      return String(Math.round(value));
    }
    const abs = Math.abs(value);
    if (abs >= 100) return value.toFixed(0);
    if (abs >= 1) return value.toFixed(2);
    return value.toFixed(4);
  }
  return String(value);
}

test("formatPulseDelta trims float noise", () => {
  assert.equal(formatPulseDelta(0.05999999999999961), "0.0600");
  assert.equal(formatPulseDelta(1.23456), "1.23");
  assert.equal(formatPulseDelta(6), "6");
  assert.equal(formatPulseDelta(null), "—");
});
