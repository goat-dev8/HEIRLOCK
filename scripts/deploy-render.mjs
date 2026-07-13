#!/usr/bin/env node
/**
 * Create/update Render free web service from local .env (secrets never printed).
 * Requires: RENDER_API_KEY, GitHub repo already pushed.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const API = "https://api.render.com/v1";
const SERVICE_NAME = "heirlock-api";
const REPO = process.env.GITHUB_URL || "https://github.com/goat-dev8/HEIRLOCK";
const BRANCH = process.env.GITHUB_BRANCH || "main";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
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
    v = v.replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
    out[k] = v;
  }
  return out;
}

const fileEnv = loadEnvFile(resolve(ROOT, ".env"));
/** Prefer real .env secrets; never let .env.production placeholders win. */
const env = {
  ...process.env,
  ...fileEnv,
  RENDER_API_KEY: (fileEnv.RENDER_API_KEY || process.env.RENDER_API_KEY || "").trim(),
};
const token = env.RENDER_API_KEY;
if (!token) {
  console.error("RENDER_API_KEY missing");
  process.exit(2);
}

function isPlaceholder(v) {
  const s = String(v ?? "").trim();
  return !s || /^<REQUEST/i.test(s) || /^YOUR_/i.test(s) || s === "changeme";
}

const NEVER_UPLOAD = new Set([
  "RENDER_API_KEY",
  "GITHUB_TOKEN",
  "GITHUB_URL",
  "DEPLOYER_PRIVATE_KEY",
  "SODEX_PRIVATE_KEY",
  "SODEX_TEST_PRIVATE_KEY",
  "SODEX_GUARDIAN_API_KEY_PRIVATE_KEY",
  "SODEX_ACCOUNT_ID",
  "SODEX_TEST_ACCOUNT_ID",
  "SODEX_TESTNET_ACCOUNT_ID",
  "SODEX_MAINNET_ACCOUNT_ID",
  "SODEX_ADDRESS",
  "SODEX_TEST_ADDRESS",
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

for (const k of REQUIRED) {
  if (!env[k]) {
    console.error(`Missing required env for Render: ${k}`);
    process.exit(2);
  }
}

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

function buildEnvVars(serviceUrl) {
  const host = serviceUrl ? new URL(serviceUrl).host : "heirlock-api.onrender.com";
  const publicUrl = serviceUrl || `https://${host}`;

  const overrides = {
    NODE_ENV: "production",
    NODE_VERSION: "20.19.0",
    PORT: "10000",
    HOST: "0.0.0.0",
    LOG_LEVEL: "info",
    HEIRLOCK_DEFAULT_PROFILE: "mainnet-limited",
    HEIRLOCK_ALLOW_TESTNET: "false",
    TRADING_ENABLED: "true",
    KILL_SWITCH_TRADING: "false",
    TRADING_MAX_NOTIONAL_USD: "1",
    MAINNET_TEST_MAX_NOTIONAL_USD: "1",
    SODEX_LOCAL_TEST_WALLET_ONLY: "true",
    AI_PRIMARY_PROVIDER: "nvidia",
    API_PUBLIC_URL: publicUrl,
    FRONTEND_URL: env.FRONTEND_URL || publicUrl,
    CORS_ALLOWED_ORIGINS: env.CORS_ALLOWED_ORIGINS || publicUrl,
    SIWE_DOMAIN: host,
    SIWE_URI: publicUrl,
  };

  const keys = new Set([
    ...REQUIRED,
    "WALLET_ENCRYPT_KEY",
    "TRADING_ALLOWLIST",
    "CEREBRAS_API_KEY",
    "SAMBANOVA_API_KEY",
    "GROQ_API_KEY",
    "WEALTH_POLICY_ADDRESS",
    "ACTION_LOG_ADDRESS",
    "MODE_CONTROLLER_ADDRESS",
    "ATTESTATION_REGISTRY_ADDRESS",
    "CONTINUITY_NFT_ADDRESS",
    "FEE_COLLECTOR_ADDRESS",
    "WEALTH_POLICY_ADDRESS_TESTNET",
    "ACTION_LOG_ADDRESS_TESTNET",
    "MODE_CONTROLLER_ADDRESS_TESTNET",
    "ATTESTATION_REGISTRY_ADDRESS_TESTNET",
    "CONTINUITY_NFT_ADDRESS_TESTNET",
    "FEE_COLLECTOR_ADDRESS_TESTNET",
    "VALUECHAIN_ANCHOR_PRIVATE_KEY",
    "VALUECHAIN_GUARDIAN_PRIVATE_KEY",
    "AI_FALLBACK_PROVIDERS",
    "NVIDIA_BASE_URL",
    "NVIDIA_MODEL_PRIMARY",
    "NVIDIA_MODEL_SECONDARY",
    "NVIDIA_MODEL_TERTIARY",
    "SOSO_BASE_URL",
    ...Object.keys(overrides),
  ]);

  const envVars = [];
  for (const key of keys) {
    if (NEVER_UPLOAD.has(key)) continue;
    let value = overrides[key] ?? env[key];
    // Map deployer → operational ValueChain signers (never user trading keys)
    if (
      (key === "VALUECHAIN_ANCHOR_PRIVATE_KEY" || key === "VALUECHAIN_GUARDIAN_PRIVATE_KEY") &&
      (!value || isPlaceholder(value))
    ) {
      value = env.VALUECHAIN_ANCHOR_PRIVATE_KEY || env.VALUECHAIN_GUARDIAN_PRIVATE_KEY || env.DEPLOYER_PRIVATE_KEY;
    }
    if (value === undefined || value === null || value === "") continue;
    if (isPlaceholder(value)) continue;
    let v = String(value).replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
    if (key === "DATABASE_URL" || key === "DIRECT_DATABASE_URL") {
      if (!/^(postgres|postgresql):\/\//i.test(v)) {
        throw new Error(
          `${key} must be postgresql://… before upload (got invalid scheme)`,
        );
      }
    }
    envVars.push({ key, value: v });
  }
  return envVars;
}

const owners = await api("GET", "/owners");
const ownerList = Array.isArray(owners) ? owners : owners?.length != null ? owners : [];
const owner =
  (Array.isArray(owners) ? owners : []).map((o) => o.owner || o).find((o) => o?.id) ||
  ownerList[0]?.owner ||
  ownerList[0];
if (!owner?.id) {
  console.error("No Render owner/workspace found for API key");
  process.exit(2);
}
const ownerId = owner.id;

const servicesRaw = await api("GET", `/services?limit=50`);
const services = (Array.isArray(servicesRaw) ? servicesRaw : []).map((s) => s.service || s);
let service = services.find((s) => s.name === SERVICE_NAME);

const buildCommand =
  "cd ../.. && npm install -g pnpm@9.15.0 && pnpm install --frozen-lockfile --prod=false && pnpm --filter @heirlock/config build && pnpm --filter @heirlock/ai-provider build && pnpm --filter @heirlock/sodex-signing build && pnpm --filter @heirlock/api exec prisma generate && pnpm --filter @heirlock/api build";
const startCommand = "pnpm exec prisma migrate deploy && pnpm start";

if (!service) {
  console.log(`Creating service ${SERVICE_NAME}...`);
  const created = await api("POST", "/services", {
    type: "web_service",
    name: SERVICE_NAME,
    ownerId,
    repo: REPO,
    autoDeploy: "yes",
    branch: BRANCH,
    rootDir: "apps/api",
    serviceDetails: {
      runtime: "node",
      env: "node",
      plan: "free",
      region: "oregon",
      healthCheckPath: "/api/health/live",
      numInstances: 1,
      envSpecificDetails: {
        buildCommand,
        startCommand,
      },
    },
    envVars: buildEnvVars(null),
  });
  service = created.service || created;
} else {
  console.log(`Service exists: ${service.id}`);
}

const serviceUrl = service.serviceDetails?.url || service.url || `https://${SERVICE_NAME}.onrender.com`;
const envVars = buildEnvVars(serviceUrl.startsWith("http") ? serviceUrl : `https://${serviceUrl}`);

// PUT env vars (replace)
await api("PUT", `/services/${service.id}/env-vars`, envVars);

// Trigger deploy
console.log("Triggering deploy...");
let deployId = null;
try {
  const deploy = await api("POST", `/services/${service.id}/deploys`, {
    clearCache: "clear",
  });
  deployId = deploy?.id || deploy?.deploy?.id || null;
} catch (e) {
  console.warn("Deploy trigger warning:", e.message);
}

if (!deployId) {
  const list = await api("GET", `/services/${service.id}/deploys?limit=1`);
  const items = (Array.isArray(list) ? list : []).map((d) => d.deploy || d);
  deployId = items[0]?.id || null;
}

const resolvedUrl =
  service.serviceDetails?.url ||
  (typeof serviceUrl === "string" && serviceUrl.startsWith("http")
    ? serviceUrl
    : `https://${SERVICE_NAME}.onrender.com`);

const statePath = resolve(ROOT, "scripts/.render-deploy-state.json");
writeFileSync(
  statePath,
  JSON.stringify(
    {
      serviceId: service.id,
      serviceName: SERVICE_NAME,
      deployId,
      url: resolvedUrl,
      repo: REPO,
      ownerId,
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      serviceId: service.id,
      deployId,
      url: resolvedUrl,
      envVarCount: envVars.length,
    },
    null,
    2,
  ),
);
