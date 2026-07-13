/**
 * Phase 5 continuity proof: Alive → Guardian (blocks policy) → restore Alive.
 * Uses DEPLOYER / VALUECHAIN_GUARDIAN key from root .env — never prints secrets.
 */
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { loadEnv } from "@heirlock/config";
import { applyOnChainContinuityGate } from "../trading/policy.js";
import { enterGuardianMode, restoreAliveMode } from "./mode.js";
import { readOnChainWealthPolicy } from "./policy-read.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

async function main() {
  const env = loadEnv();
  const before = await readOnChainWealthPolicy(env, "mainnet");
  console.log(
    JSON.stringify({
      step: "before",
      source: before.source,
      mode: before.modeName,
      maxNotionalUsd: before.maxNotionalUsd,
    }),
  );

  const enter = await enterGuardianMode(env, "mainnet");
  console.log(JSON.stringify({ step: "enterGuardian", ...enter }));
  if (!enter.ok && enter.reason !== "already_guardian") {
    process.exitCode = 1;
    return;
  }

  const mid = await readOnChainWealthPolicy(env, "mainnet");
  const base = {
    ok: true as const,
    effectiveCapUsd: 1,
  };
  const gated = applyOnChainContinuityGate(base, mid, 0.5);
  console.log(
    JSON.stringify({
      step: "policy_under_guardian",
      mode: mid.modeName,
      policyOk: gated.ok,
      reason: gated.ok ? null : gated.reason,
    }),
  );

  if (gated.ok || mid.modeName !== "Guardian") {
    console.error("FAIL: Guardian mode did not block new orders");
    process.exitCode = 1;
  }

  const restore = await restoreAliveMode(env, "mainnet");
  console.log(JSON.stringify({ step: "restoreAlive", ...restore }));
  const after = await readOnChainWealthPolicy(env, "mainnet");
  console.log(
    JSON.stringify({
      step: "after",
      mode: after.modeName,
      ok: after.modeName === "Alive",
    }),
  );

  if (after.modeName !== "Alive") {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
