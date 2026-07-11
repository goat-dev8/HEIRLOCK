#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const ROOT = resolve(process.cwd());
const env = { ...loadEnvFile(resolve(ROOT, ".env")), ...process.env };
const state = JSON.parse(
  readFileSync(resolve(ROOT, "scripts/.render-deploy-state.json"), "utf8"),
);
const token = env.RENDER_API_KEY;
if (!token) {
  console.error("RENDER_API_KEY missing");
  process.exit(2);
}

const NEVER = new Set([
  "RENDER_API_KEY",
  "GITHUB_TOKEN",
  "GITHUB_URL",
  "DEPLOYER_PRIVATE_KEY",
  "SODEX_PRIVATE_KEY",
  "SODEX_TEST_PRIVATE_KEY",
  "SODEX_GUARDIAN_API_KEY_PRIVATE_KEY",
  "SODEX_ACCOUNT_ID",
  "SODEX_ADDRESS",
  "SODEX_TEST_ADDRESS",
  "SODEX_TEST_ACCOUNT_ID",
  "SODEX_TESTNET_ACCOUNT_ID",
  "SODEX_MAINNET_ACCOUNT_ID",
]);

const REQUIRED = [
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "JWT_SECRET",
  "NVIDIA_API_KEY",
  "SOSO_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "CRON_SECRET",
];

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${text.slice(0, 500)}`);
  return data;
}

const existing = await api("GET", `/services/${state.serviceId}/env-vars`);
const list = (Array.isArray(existing) ? existing : []).map((v) => v.envVar || v);
const map = new Map();
for (const e of list) {
  if (e.value != null && e.value !== "") map.set(e.key, String(e.value));
}

const overrides = {
  NODE_ENV: "production",
  NODE_VERSION: "20.19.0",
  PORT: "10000",
  HOST: "0.0.0.0",
  LOG_LEVEL: "info",
  HEIRLOCK_DEFAULT_PROFILE: "mainnet-limited",
  HEIRLOCK_ALLOW_TESTNET: "true",
  TRADING_ENABLED: "true",
  KILL_SWITCH_TRADING: "false",
  TRADING_MAX_NOTIONAL_USD: "1",
  MAINNET_TEST_MAX_NOTIONAL_USD: "1",
  SODEX_LOCAL_TEST_WALLET_ONLY: "true",
  AI_PRIMARY_PROVIDER: "nvidia",
  AI_FALLBACK_PROVIDERS: env.AI_FALLBACK_PROVIDERS || "cerebras,sambanova,groq",
  API_PUBLIC_URL: "https://heirlock-api.onrender.com",
  FRONTEND_URL: "http://localhost:8080",
  CORS_ALLOWED_ORIGINS:
    "http://localhost:5173,http://localhost:3000,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:8080",
  SIWE_DOMAIN: "localhost",
  SIWE_URI: "http://localhost:8080",
  WEALTH_POLICY_ADDRESS: env.WEALTH_POLICY_ADDRESS,
  ACTION_LOG_ADDRESS: env.ACTION_LOG_ADDRESS,
  MODE_CONTROLLER_ADDRESS: env.MODE_CONTROLLER_ADDRESS,
  ATTESTATION_REGISTRY_ADDRESS: env.ATTESTATION_REGISTRY_ADDRESS,
  CONTINUITY_NFT_ADDRESS: env.CONTINUITY_NFT_ADDRESS,
  FEE_COLLECTOR_ADDRESS: env.FEE_COLLECTOR_ADDRESS,
  WEALTH_POLICY_ADDRESS_TESTNET: env.WEALTH_POLICY_ADDRESS_TESTNET,
  ACTION_LOG_ADDRESS_TESTNET: env.ACTION_LOG_ADDRESS_TESTNET,
  MODE_CONTROLLER_ADDRESS_TESTNET: env.MODE_CONTROLLER_ADDRESS_TESTNET,
  ATTESTATION_REGISTRY_ADDRESS_TESTNET: env.ATTESTATION_REGISTRY_ADDRESS_TESTNET,
  CONTINUITY_NFT_ADDRESS_TESTNET: env.CONTINUITY_NFT_ADDRESS_TESTNET,
  FEE_COLLECTOR_ADDRESS_TESTNET: env.FEE_COLLECTOR_ADDRESS_TESTNET,
};

for (const [k, v] of Object.entries(overrides)) {
  if (v != null && v !== "") map.set(k, String(v));
}
for (const k of REQUIRED) {
  if (!env[k]) {
    console.error("missing local secret", k);
    process.exit(2);
  }
  map.set(k, String(env[k]));
}
if (env.WALLET_ENCRYPT_KEY) map.set("WALLET_ENCRYPT_KEY", String(env.WALLET_ENCRYPT_KEY));
for (const k of ["CEREBRAS_API_KEY", "SAMBANOVA_API_KEY", "GROQ_API_KEY", "TRADING_ALLOWLIST"]) {
  if (env[k]) map.set(k, String(env[k]));
}
for (const k of NEVER) map.delete(k);

const body = [...map.entries()].map(([key, value]) => ({ key, value }));
console.log(
  JSON.stringify(
    {
      putting: body.length,
      secretsOk: REQUIRED.every((k) => map.has(k)),
      siwe: map.get("SIWE_DOMAIN"),
      cors: map.get("CORS_ALLOWED_ORIGINS"),
      allowTestnet: map.get("HEIRLOCK_ALLOW_TESTNET"),
    },
    null,
    2,
  ),
);

await api("PUT", `/services/${state.serviceId}/env-vars`, body);
const deploy = await api("POST", `/services/${state.serviceId}/deploys`, {
  clearCache: "clear",
});
const deployId = deploy.id || deploy.deploy?.id;
console.log(JSON.stringify({ deployId }, null, 2));

const deadline = Date.now() + 15 * 60 * 1000;
while (Date.now() < deadline) {
  const listDeploys = await api(
    "GET",
    `/services/${state.serviceId}/deploys?limit=1`,
  );
  const cur = (Array.isArray(listDeploys) ? listDeploys : []).map(
    (d) => d.deploy || d,
  )[0];
  console.log(`status=${cur?.status} id=${cur?.id}`);
  if (
    ["live", "update_failed", "build_failed", "canceled", "deactivated"].includes(
      cur?.status,
    )
  ) {
    // wait a moment for cold start
    await new Promise((r) => setTimeout(r, 5000));
    const cfg = await fetch(
      "https://heirlock-api.onrender.com/api/config/environment",
      { signal: AbortSignal.timeout(90000) },
    ).then((r) => r.json());
    const health = await fetch("https://heirlock-api.onrender.com/api/health", {
      signal: AbortSignal.timeout(90000),
    }).then((r) => r.json());
    console.log(
      JSON.stringify(
        {
          final: cur?.status,
          allowTestnet: cfg.allowTestnet,
          health: health.status,
          db: health.checks?.database,
        },
        null,
        2,
      ),
    );
    process.exit(cur?.status === "live" && health.status === "ok" ? 0 : 1);
  }
  await new Promise((r) => setTimeout(r, 15000));
}
process.exit(2);
