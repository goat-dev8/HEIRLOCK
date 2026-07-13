import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOnChainContinuityGate } from "../trading/policy.js";
import type { OnChainWealthPolicy } from "./policy-read.js";

function snap(partial: Partial<OnChainWealthPolicy>): OnChainWealthPolicy {
  return {
    mode: 0,
    modeName: "Alive",
    maxNotionalUsd: 1,
    address: "0xabc",
    chainId: 286623,
    source: "valuechain",
    ...partial,
  };
}

test("Guardian mode blocks new orders", () => {
  const d = applyOnChainContinuityGate(
    { ok: true, effectiveCapUsd: 1 },
    snap({ mode: 1, modeName: "Guardian" }),
    0.5,
  );
  assert.equal(d.ok, false);
  if (!d.ok) assert.match(d.reason, /guardian/i);
});

test("Heir mode blocks execution", () => {
  const d = applyOnChainContinuityGate(
    { ok: true, effectiveCapUsd: 1 },
    snap({ mode: 2, modeName: "Heir" }),
    0.5,
  );
  assert.equal(d.ok, false);
  if (!d.ok) assert.match(d.reason, /heir/i);
});

test("Alive mode allows within on-chain cap", () => {
  const d = applyOnChainContinuityGate(
    { ok: true, effectiveCapUsd: 1 },
    snap({ mode: 0, modeName: "Alive", maxNotionalUsd: 1 }),
    0.5,
  );
  assert.equal(d.ok, true);
  if (d.ok) assert.equal(d.effectiveCapUsd, 1);
});

test("unavailable on-chain policy blocks relay", () => {
  const d = applyOnChainContinuityGate(
    { ok: true, effectiveCapUsd: 1 },
    snap({ source: "unavailable", error: "rpc down" }),
    0.5,
  );
  assert.equal(d.ok, false);
  if (!d.ok) assert.match(d.reason, /unavailable/);
});

test("testnet skips on-chain notional cap but still reads mode", () => {
  const d = applyOnChainContinuityGate(
    { ok: true, effectiveCapUsd: 100000 },
    snap({ mode: 0, modeName: "Alive", maxNotionalUsd: 1 }),
    9,
    { applyOnChainNotionalCap: false },
  );
  assert.equal(d.ok, true);
  if (d.ok) assert.equal(d.effectiveCapUsd, 100000);
});

test("mainnet still applies on-chain notional cap", () => {
  const d = applyOnChainContinuityGate(
    { ok: true, effectiveCapUsd: 1 },
    snap({ mode: 0, modeName: "Alive", maxNotionalUsd: 1 }),
    9,
    { applyOnChainNotionalCap: true },
  );
  assert.equal(d.ok, false);
  if (!d.ok) assert.match(d.reason, /on_chain_cap/);
});
