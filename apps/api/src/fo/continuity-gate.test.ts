import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluatePartnerApprovalGate } from "./continuity-gate.js";
import type { OnChainWealthPolicy } from "../valuechain/policy-read.js";

function policy(partial: Partial<OnChainWealthPolicy>): OnChainWealthPolicy {
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

test("gate blocks approve without debate", () => {
  const g = evaluatePartnerApprovalGate({
    preflightVerdict: "APPROVE",
    policy: policy({}),
    debateRan: false,
  });
  assert.equal(g.canApprove, false);
  assert.equal(g.nextStep, "debate");
});

test("gate blocks Guardian mode", () => {
  const g = evaluatePartnerApprovalGate({
    preflightVerdict: "APPROVE",
    policy: policy({ mode: 1, modeName: "Guardian" }),
    debateRan: true,
    moderatorStance: "approve",
  });
  assert.equal(g.canApprove, false);
  assert.match(g.blockReason ?? "", /Guardian/i);
});

test("gate allows Alive after debate", () => {
  const g = evaluatePartnerApprovalGate({
    preflightVerdict: "APPROVE",
    policy: policy({}),
    debateRan: true,
    moderatorStance: "approve",
  });
  assert.equal(g.canApprove, true);
  assert.equal(g.canExecute, true);
  assert.equal(g.nextStep, "sign");
});
