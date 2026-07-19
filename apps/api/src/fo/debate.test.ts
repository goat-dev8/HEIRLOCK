import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildActionPlan,
  buildDeterministicDebate,
  evidenceKillReasons,
} from "./debate.js";
import type { LivingLoopResult } from "./living-loop.js";

function mockLoop(overrides: Partial<LivingLoopResult> = {}): LivingLoopResult {
  return {
    citations: [
      { source: "etf", endpoint: "/etfs", at: "2026-01-01T00:00:00Z", status: "LIVE" },
      { source: "index", endpoint: "/indices", at: "2026-01-01T00:00:00Z", status: "LIVE" },
    ],
    evidence: { etf: null, news: null, macro: null, indexSnapshot: null, indices: null },
    proposal: {
      title: "Hold MAG7",
      rationale: "Stable",
      ssiAllocateUrl: "https://ssi.example/allocate",
    },
    drift: null,
    preflight: { verdict: "APPROVE", factors: [] },
    liveCount: 2,
    ...overrides,
  };
}

test("buildActionPlan — approve hold when stable", () => {
  const plan = buildActionPlan(
    mockLoop(),
    { stance: "approve", confidence: 70, summary: "ok" },
    { maxNotionalUsd: 1 },
  );
  assert.equal(plan.primaryAction, "hold");
  assert.equal(plan.steps.length, 6);
  assert.equal(plan.steps[0]!.phase, "understand");
  assert.equal(plan.steps[plan.steps.length - 1]!.phase, "learn");
});

test("buildActionPlan — drift + approve routes to SSI", () => {
  const plan = buildActionPlan(
    mockLoop({
      drift: { alert: true, driftPct: 2.5, signal: "drift" } as LivingLoopResult["drift"],
      proposal: { title: "Drift", ssiAllocateUrl: "https://ssi.example" },
    }),
    { stance: "approve", confidence: 72, summary: "allocate" },
    { ssiAppUrl: "https://ssi.example", maxNotionalUsd: 1 },
  );
  assert.equal(plan.primaryAction, "ssi_allocate");
  const action = plan.steps.find((s) => s.id === "action");
  assert.ok(action?.href?.includes("ssi"));
});

test("buildActionPlan — BLOCK forces wait", () => {
  const plan = buildActionPlan(
    mockLoop({ preflight: { verdict: "BLOCK", factors: [] } }),
    { stance: "approve", confidence: 90, summary: "blocked" },
    { maxNotionalUsd: 1 },
  );
  assert.equal(plan.primaryAction, "wait");
  const policy = plan.steps.find((s) => s.id === "policy");
  assert.match(policy!.detail, /BLOCK/);
});

test("evidenceKillReasons — on-chain UNAVAILABLE is a hard kill", () => {
  const reasons = evidenceKillReasons(
    mockLoop({
      citations: [
        { source: "etf", endpoint: "/etfs", at: "t", status: "LIVE" },
        { source: "ssi_token", endpoint: "dexscreener", at: "t", status: "UNAVAILABLE" },
      ],
      drift: { action: "UNAVAILABLE", alert: false } as LivingLoopResult["drift"],
      proposal: {
        title: "Hold MAG7",
        onChainToken: { priceUsd: null, change24hPct: null },
      },
    }),
  );
  assert.ok(reasons.some((r) => /on-chain|drift/i.test(r)));
});

test("deterministic debate — WAIT never APPROVE on kill evidence", () => {
  const loop = mockLoop({
    citations: [
      { source: "ssi_token", endpoint: "dexscreener", at: "t", status: "UNAVAILABLE" },
    ],
    drift: { action: "UNAVAILABLE", alert: false } as LivingLoopResult["drift"],
    proposal: {
      title: "Hold MAG7; confirm liquidity",
      onChainToken: { priceUsd: null, change24hPct: null },
    },
    preflight: { verdict: "CAUTION", factors: [] },
  });
  const debate = buildDeterministicDebate(
    loop,
    { openTheses: 0, recentDecisions: 0 },
    { maxNotionalUsd: 1 },
    Date.now(),
  );
  assert.equal(debate.synthesis.stance, "wait");
  assert.match(debate.counsel.content, /WAIT/i);
  assert.match(debate.falsifier.content, /INVALIDATE|UNAVAILABLE/i);
  assert.ok(!/Counsel recommends: APPROVE/i.test(debate.counsel.content));
});
