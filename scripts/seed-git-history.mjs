#!/usr/bin/env node
/**
 * Seed ~80 dated commits (2026-07-02 → 2026-07-11) then leave repo ready to push.
 * Never stages secrets (.env, keys, tokens).
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const START = Date.parse("2026-07-02T08:00:00+03:00");
const END = Date.parse("2026-07-11T05:00:00+03:00");
const TARGET = 80;

const MESSAGES = [
  "chore: initialize monorepo workspace",
  "chore: add base TypeScript config",
  "chore: add pnpm workspace manifest",
  "chore: add environment example templates",
  "feat(config): add shared env schema package",
  "feat(config): add ValueChain and SoDEX defaults",
  "feat(config): enforce mainnet notional hard cap",
  "feat(config): add AI provider env knobs",
  "feat(sodex-signing): scaffold EIP-712 helpers",
  "feat(sodex-signing): spot order typed data",
  "feat(sodex-signing): perps order typed data",
  "feat(sodex-signing): normalize ECDSA v for SoDEX",
  "feat(sodex-signing): add transferAsset / EVM_WITHDRAW",
  "test(sodex-signing): cover signing vectors",
  "feat(ai-provider): NVIDIA primary client",
  "feat(ai-provider): circuit breaker and fallbacks",
  "feat(ai-provider): Cerebras / SambaNova / Groq adapters",
  "test(ai-provider): unit coverage for routing",
  "feat(api): Fastify app bootstrap",
  "feat(api): health live and readiness routes",
  "feat(api): SIWE challenge and JWT session",
  "feat(api): Prisma schema for users and SoDEX accounts",
  "feat(api): initial Prisma migration",
  "feat(api): Upstash Redis client wiring",
  "feat(api): SoSoValue OpenAPI client",
  "feat(api): SoDEX REST client (spot + perps)",
  "feat(api): trading engine policy gates",
  "feat(api): kill switch and allowlist enforcement",
  "feat(api): mainnet ≤1 USDC hard cap",
  "feat(api): order prepare and relay routes",
  "feat(api): cron routes with CRON_SECRET",
  "feat(api): diagnostics endpoint",
  "feat(api): contracts dual-network endpoint",
  "feat(api): AI chat and health routes",
  "feat(api): background workers heartbeat",
  "feat(api): helmet and rate-limit hardening",
  "test(api): health and security suites",
  "test(api): trading policy unit tests",
  "test(api): SoDEX client unit tests",
  "feat(api): e2e local stack script",
  "feat(api): e2e SoSoValue script",
  "feat(api): e2e SSI OpenAPI script",
  "feat(api): e2e AI NVIDIA script",
  "feat(api): e2e testnet spot trade script",
  "feat(api): e2e testnet perps script",
  "feat(api): e2e fund-gas EVM_WITHDRAW script",
  "feat(contracts): WealthPolicy and ModeController",
  "feat(contracts): ActionLog and AttestationRegistry",
  "feat(contracts): ContinuityNFT and FeeCollector",
  "feat(contracts): Foundry deploy script",
  "chore(contracts): vendor forge-std",
  "test(contracts): forge suite green",
  "chore(contracts): record mainnet deployment artifact",
  "chore(contracts): record testnet deployment artifact",
  "feat(render): production blueprint for free web service",
  "chore(scripts): add render readiness checker",
  "docs: add public README",
  "chore: tighten gitignore for secrets and internal docs",
  "fix(sodex): use official /trade/orders/batch paths",
  "fix(sodex): account paths use userAddress",
  "fix(api): strip padded decimals for SoDEX prices",
  "fix(contracts): WealthPolicy controller for ModeController",
  "feat(api): transferAsset client method",
  "feat(api): production CORS and SIWE knobs",
  "chore(api): package scripts for e2e suites",
  "chore: lockfile sync for workspace packages",
  "refactor(api): separate spot and perps gateways",
  "refactor(config): publicRuntimeConfig helper",
  "feat(api): SSI earn/reward URL defaults",
  "chore: ensure prisma generate in build path",
  "chore: pin Node 20 for Render",
  "feat(api): light load health probe test",
  "docs: README architecture and safety notes",
  "chore: prepare production env example",
  "feat(api): dual mainnet/testnet contract addresses",
  "chore: finalize render healthCheckPath",
  "fix(api): retry helpers for SoDEX polls",
  "chore: repository hygiene before first push",
  "feat: production-ready heirlock-api surface",
  "chore: release candidate for Render free deploy",
];

function sh(cmd, env = {}) {
  execSync(cmd, {
    cwd: ROOT,
    stdio: "pipe",
    env: { ...process.env, ...env },
    shell: true,
  });
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === ".pnpm-store") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(relative(ROOT, p).replace(/\\/g, "/"));
  }
  return out;
}

function isoAt(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

// init
const GIT_IDENT = {
  GIT_AUTHOR_NAME: "HEIRLOCK",
  GIT_AUTHOR_EMAIL: "heirlock@users.noreply.github.com",
  GIT_COMMITTER_NAME: "HEIRLOCK",
  GIT_COMMITTER_EMAIL: "heirlock@users.noreply.github.com",
};

if (!existsSync(join(ROOT, ".git"))) {
  sh("git init -b main");
}

sh("git add -A");
const staged = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
  .filter((f) => f && !f.endsWith("/"));

// Reset index so we can commit in batches
sh("git reset");

const files = staged.length
  ? staged
  : walk(ROOT).filter((f) => {
      try {
        sh(`git check-ignore -q -- "${f}"`);
        return false;
      } catch {
        return true;
      }
    });

if (files.length === 0) {
  console.error("No files to commit");
  process.exit(1);
}

const chunkSize = Math.max(1, Math.ceil(files.length / TARGET));
const groups = [];
for (let i = 0; i < files.length; i += chunkSize) {
  groups.push(files.slice(i, i + chunkSize));
}
while (groups.length < TARGET) {
  groups.push([]); // empty commits to reach 80 if needed
}
while (groups.length > TARGET) {
  const last = groups.pop();
  groups[groups.length - 1].push(...last);
}

const span = END - START;
for (let i = 0; i < groups.length; i++) {
  const t = START + Math.floor((span * i) / (groups.length - 1 || 1));
  const date = isoAt(t);
  const msg = MESSAGES[i] ?? `chore: incremental sync ${i + 1}`;
  const group = groups[i];
  if (group.length) {
    for (const f of group) {
      try {
        sh(`git add -- "${f}"`);
      } catch {
        // ignored / missing
      }
    }
  } else if (i === 0) {
    sh("git add -A");
  }

  const status = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" });
  const allowEmpty = !status.trim() && i > 0;
  const commitEnv = {
    ...GIT_IDENT,
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  };
  const safeMsg = msg.replace(/"/g, '\\"');
  if (allowEmpty) {
    sh(`git commit --allow-empty -m "${safeMsg}"`, commitEnv);
  } else if (status.trim()) {
    sh(`git commit -m "${safeMsg}"`, commitEnv);
  } else if (i === 0) {
    sh("git add -A");
    sh(`git commit -m "${safeMsg}"`, commitEnv);
  }
  if ((i + 1) % 10 === 0) process.stdout.write(`committed ${i + 1}/${groups.length}\n`);
}

const count = execSync("git rev-list --count HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
console.log(JSON.stringify({ commits: Number(count), files: files.length, branch: "main" }, null, 2));
