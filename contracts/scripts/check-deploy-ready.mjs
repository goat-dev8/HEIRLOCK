#!/usr/bin/env node
/**
 * Preflight for ValueChain contract deploy.
 * Exits 0 when forge + DEPLOYER_PRIVATE_KEY + RPC are present; otherwise prints blockers.
 */
import { spawnSync } from "node:child_process";
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

loadEnvFile(resolve(process.cwd(), "../.env"));
loadEnvFile(resolve(process.cwd(), "../../.env"));
loadEnvFile(resolve(process.cwd(), ".env"));

const blockers = [];

const forge = spawnSync("forge", ["--version"], { encoding: "utf8" });
if (forge.status !== 0) {
  blockers.push(
    "forge not installed — install Foundry: https://book.getfoundry.sh/getting-started/installation",
  );
}

if (!process.env.DEPLOYER_PRIVATE_KEY) {
  blockers.push("DEPLOYER_PRIVATE_KEY missing — required to broadcast deploys");
}

const rpc =
  process.env.VALUECHAIN_TESTNET_RPC || process.env.VALUECHAIN_MAINNET_RPC;
if (!rpc) {
  blockers.push("VALUECHAIN_TESTNET_RPC (or MAINNET) missing");
}

if (blockers.length) {
  console.log("DEPLOY_NOT_READY");
  for (const b of blockers) console.log(`- ${b}`);
  process.exit(2);
}

console.log(
  JSON.stringify({
    ready: true,
    forge: forge.stdout.trim().split("\n")[0],
    rpcHost: (() => {
      try {
        return new URL(rpc).host;
      } catch {
        return "ok";
      }
    })(),
    next: "forge script script/Deploy.s.sol:DeployScript --rpc-url $VALUECHAIN_TESTNET_RPC --broadcast --private-key $DEPLOYER_PRIVATE_KEY",
  }),
);
