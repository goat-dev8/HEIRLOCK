#!/usr/bin/env node
/**
 * Render production readiness checklist (no secrets printed).
 * Exit 0 = blueprint + local secrets shape look deployable; 2 = blockers.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

const root = resolve(process.cwd());
loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, ".env.production"));

const blockers = [];
const warnings = [];

if (!existsSync(resolve(root, "render.yaml"))) {
  blockers.push("render.yaml missing");
}

const required = [
  "DATABASE_URL",
  "JWT_SECRET",
  "NVIDIA_API_KEY",
  "SOSO_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];
for (const k of required) {
  if (!process.env[k]) blockers.push(`${k} missing in env`);
}

if (process.env.SODEX_PRIVATE_KEY && process.env.NODE_ENV === "production") {
  warnings.push(
    "SODEX_PRIVATE_KEY present — ensure SODEX_LOCAL_TEST_WALLET_ONLY=true and never use as house account",
  );
}

const mainnetCap = Number(process.env.MAINNET_TEST_MAX_NOTIONAL_USD ?? "1");
if (!(mainnetCap > 0 && mainnetCap <= 1)) {
  blockers.push("MAINNET_TEST_MAX_NOTIONAL_USD must be <= 1");
}

if (process.env.AI_PRIMARY_PROVIDER && process.env.AI_PRIMARY_PROVIDER !== "nvidia") {
  warnings.push(`AI_PRIMARY_PROVIDER=${process.env.AI_PRIMARY_PROVIDER} (expected nvidia)`);
}

const out = {
  ready: blockers.length === 0,
  blockers,
  warnings,
  next: [
    "Push repo to GitHub",
    "Create Render Blueprint from render.yaml",
    "Inject sync:false secrets in Render dashboard",
    "Confirm healthCheckPath /api/health/live returns 200",
  ],
};

console.log(JSON.stringify(out, null, 2));
process.exit(blockers.length ? 2 : 0);
