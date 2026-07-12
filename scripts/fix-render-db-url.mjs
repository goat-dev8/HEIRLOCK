#!/usr/bin/env node
/**
 * Fix Render DATABASE_URL / DIRECT_DATABASE_URL from local .env (strip quotes,
 * validate postgres scheme), restore start/build commands, trigger deploy.
 * Never prints secret values.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const API = "https://api.render.com/v1";
const SERVICE_ID = "srv-d98r7d67r5hc73a9pb7g";

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
    // Strip accidental wrapping quotes left inside
    v = v.replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
    out[k] = v;
  }
  return out;
}

function assertPostgresUrl(key, v) {
  if (!v) throw new Error(`${key} missing in local .env`);
  if (!/^(postgres|postgresql):\/\//i.test(v)) {
    throw new Error(
      `${key} must start with postgresql:// or postgres:// (got scheme=${(v.match(/^([^:]+):/) || [])[1] || "none"})`,
    );
  }
  if (/\s/.test(v)) throw new Error(`${key} contains whitespace`);
  try {
    // URL parser needs http scheme for host validation
    const u = new URL(v.replace(/^postgres(ql)?:/i, "http:"));
    if (!u.hostname) throw new Error("empty host");
  } catch (e) {
    throw new Error(`${key} is not a parseable URL: ${e.message || e}`);
  }
  return v;
}

const fileEnv = loadEnvFile(resolve(ROOT, ".env"));
const token = (fileEnv.RENDER_API_KEY || process.env.RENDER_API_KEY || "").trim();
if (!token) {
  console.error("RENDER_API_KEY missing");
  process.exit(2);
}

function isPlaceholder(v) {
  const s = String(v ?? "").trim();
  return !s || /^<REQUEST/i.test(s) || /^YOUR_/i.test(s) || s === "changeme";
}

if (isPlaceholder(fileEnv.DATABASE_URL) || isPlaceholder(fileEnv.DIRECT_DATABASE_URL)) {
  throw new Error("Local .env DATABASE_URL / DIRECT_DATABASE_URL look like placeholders");
}

const databaseUrl = assertPostgresUrl("DATABASE_URL", fileEnv.DATABASE_URL);
const directUrl = assertPostgresUrl(
  "DIRECT_DATABASE_URL",
  fileEnv.DIRECT_DATABASE_URL || fileEnv.DATABASE_URL,
);

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

const buildCommand =
  "cd ../.. && npm install -g pnpm@9.15.0 && pnpm install --frozen-lockfile --prod=false && pnpm --filter @heirlock/config build && pnpm --filter @heirlock/ai-provider build && pnpm --filter @heirlock/sodex-signing build && pnpm --filter @heirlock/api exec prisma generate && pnpm --filter @heirlock/api build";
const startCommand = "pnpm exec prisma migrate deploy && pnpm start";

// Inspect current remote DB vars (scheme only)
const remoteVarsRaw = await api("GET", `/services/${SERVICE_ID}/env-vars`);
const remoteList = (Array.isArray(remoteVarsRaw) ? remoteVarsRaw : []).map(
  (x) => x.envVar || x,
);
const remoteMap = new Map(remoteList.map((e) => [e.key, e.value]));

function schemeOf(v) {
  return ((String(v || "").match(/^([a-zA-Z0-9+.-]+):\/\//) || [])[1] || "NO_SCHEME");
}

console.log(
  JSON.stringify(
    {
      remoteBefore: {
        DATABASE_URL: {
          scheme: schemeOf(remoteMap.get("DATABASE_URL")),
          len: String(remoteMap.get("DATABASE_URL") || "").length,
          hasWrappingQuote: /^["']/.test(String(remoteMap.get("DATABASE_URL") || "")),
        },
        DIRECT_DATABASE_URL: {
          scheme: schemeOf(remoteMap.get("DIRECT_DATABASE_URL")),
          len: String(remoteMap.get("DIRECT_DATABASE_URL") || "").length,
          hasWrappingQuote: /^["']/.test(String(remoteMap.get("DIRECT_DATABASE_URL") || "")),
        },
        count: remoteList.length,
      },
    },
    null,
    2,
  ),
);

// Rebuild env var set from remote, overlay fixed DB URLs from local file
const next = new Map(remoteMap);
next.set("DATABASE_URL", databaseUrl);
next.set("DIRECT_DATABASE_URL", directUrl);

// Ensure critical runtime keys exist from local if missing remotely
for (const k of [
  "JWT_SECRET",
  "NVIDIA_API_KEY",
  "SOSO_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "CRON_SECRET",
  "WALLET_ENCRYPT_KEY",
]) {
  if (!next.get(k) && fileEnv[k]) next.set(k, fileEnv[k]);
}

const envVars = [...next.entries()].map(([key, value]) => ({
  key,
  value: String(value ?? ""),
}));

await api("PUT", `/services/${SERVICE_ID}/env-vars`, envVars);

// Restore build/start commands (empty startCommand causes silent fail)
await api("PATCH", `/services/${SERVICE_ID}`, {
  rootDir: "apps/api",
  serviceDetails: {
    envSpecificDetails: {
      buildCommand,
      startCommand,
    },
    healthCheckPath: "/api/health/live",
  },
});

const deploy = await api("POST", `/services/${SERVICE_ID}/deploys`, {
  clearCache: "clear",
});
const deployId = deploy?.id || deploy?.deploy?.id || null;

writeFileSync(
  resolve(ROOT, "scripts/.render-deploy-state.json"),
  JSON.stringify(
    {
      serviceId: SERVICE_ID,
      deployId,
      fixedDbUrls: true,
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
      deployId,
      envVarCount: envVars.length,
      databaseScheme: schemeOf(databaseUrl),
      directScheme: schemeOf(directUrl),
      databaseLen: databaseUrl.length,
      directLen: directUrl.length,
    },
    null,
    2,
  ),
);
