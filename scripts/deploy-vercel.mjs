#!/usr/bin/env node
/**
 * Deploy HEIRLOCK frontend to Vercel using token from root .env (vercal_token / VERCEL_TOKEN).
 * Sets env from frontend/.env and attaches a clean production domain alias.
 */
import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND = resolve(ROOT, "frontend");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const rootEnv = loadEnv(resolve(ROOT, ".env"));
const feEnv = loadEnv(resolve(FRONTEND, ".env"));
const token = rootEnv.VERCEL_TOKEN || rootEnv.vercal_token || process.env.VERCEL_TOKEN;
if (!token) {
  console.error("Missing Vercel token (VERCEL_TOKEN or vercal_token in .env)");
  process.exit(2);
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Vercel API ${method} ${path} → ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

const PROJECT = "heirlock";
const DOMAIN_CANDIDATES = [
  "heirlock.vercel.app",
  "heirlock-os.vercel.app",
  "heirlock-finance.vercel.app",
  "getheirlock.vercel.app",
];

const user = await api("/v2/user");
const teamId = user?.user?.defaultTeamId || undefined;
const teamQs = teamId ? `?teamId=${teamId}` : "";
const teamQsAmp = teamId ? `&teamId=${teamId}` : "";

console.log(JSON.stringify({ step: "auth", user: user?.user?.username || user?.user?.email, teamId: teamId || null }));

let project;
try {
  project = await api(`/v9/projects/${PROJECT}${teamQs}`);
  console.log(JSON.stringify({ step: "project", status: "exists", id: project.id, name: project.name }));
} catch (e) {
  if (e.status !== 404) throw e;
  project = await api(`/v11/projects${teamQs}`, {
    method: "POST",
    body: {
      name: PROJECT,
      framework: "tanstack-start",
      rootDirectory: "frontend",
      buildCommand: "npm run build",
      installCommand: "npm install",
      outputDirectory: undefined,
      gitRepository: {
        type: "github",
        repo: "goat-dev8/HEIRLOCK",
      },
    },
  });
  console.log(JSON.stringify({ step: "project", status: "created", id: project.id, name: project.name }));
}

// Ensure root directory + framework
await api(`/v9/projects/${project.id}${teamQs}`, {
  method: "PATCH",
  body: {
    framework: "tanstack-start",
    rootDirectory: "frontend",
    buildCommand: "npm run build",
    installCommand: "npm install",
  },
});

// Upsert env vars from frontend/.env (production + preview + development)
const existing = await api(`/v9/projects/${project.id}/env${teamQs}`);
const existingByKey = new Map((existing.envs || []).map((e) => [e.key, e]));

for (const [key, value] of Object.entries(feEnv)) {
  if (!key.startsWith("VITE_")) continue;
  const targets = ["production", "preview", "development"];
  const prev = existingByKey.get(key);
  if (prev) {
    await api(`/v9/projects/${project.id}/env/${prev.id}${teamQs}`, {
      method: "PATCH",
      body: { value, target: targets, type: "plain" },
    });
  } else {
    await api(`/v10/projects/${project.id}/env${teamQs}`, {
      method: "POST",
      body: { key, value, target: targets, type: "plain" },
    });
  }
  console.log(JSON.stringify({ step: "env", key, action: prev ? "updated" : "created" }));
}

// Prefer CLI deploy for correct Git-linked builds
const vercelBin = resolve(FRONTEND, "node_modules", "vercel", "dist", "vc.js");
const hasLocalVercel = existsSync(resolve(FRONTEND, "node_modules", "vercel"));
if (!hasLocalVercel) {
  execSync("npm install --no-save vercel@latest", { cwd: FRONTEND, stdio: "inherit" });
}

// Link project locally (non-interactive)
const vercelDir = resolve(FRONTEND, ".vercel");
mkdirSync(vercelDir, { recursive: true });
writeFileSync(
  resolve(vercelDir, "project.json"),
  JSON.stringify(
    {
      projectId: project.id,
      orgId: project.accountId || teamId || user?.user?.id,
    },
    null,
    2,
  ),
);

const deployEnv = {
  ...process.env,
  VERCEL_TOKEN: token,
  VERCEL_ORG_ID: project.accountId || teamId || user?.user?.id,
  VERCEL_PROJECT_ID: project.id,
};

console.log(JSON.stringify({ step: "deploy", mode: "production" }));
execSync("npx vercel deploy --prod --yes --force", {
  cwd: FRONTEND,
  stdio: "inherit",
  env: deployEnv,
});

// Resolve latest production deployment URL
const deps = await api(`/v6/deployments?projectId=${project.id}&limit=5&target=production${teamQsAmp}`);
const latest = (deps.deployments || [])[0];
const prodUrl = latest?.url ? `https://${latest.url}` : null;
console.log(JSON.stringify({ step: "deployment", url: prodUrl, state: latest?.readyState || latest?.state }));

// Attach the best available *.vercel.app alias
let attached = null;
for (const domain of DOMAIN_CANDIDATES) {
  try {
    await api(`/v10/projects/${project.id}/domains${teamQs}`, {
      method: "POST",
      body: { name: domain },
    });
    attached = domain;
    console.log(JSON.stringify({ step: "domain", domain, status: "attached" }));
    break;
  } catch (e) {
    console.log(
      JSON.stringify({
        step: "domain",
        domain,
        status: "skipped",
        reason: e.body?.error?.code || e.body?.error?.message || e.message,
      }),
    );
  }
}

const domains = await api(`/v9/projects/${project.id}/domains${teamQs}`);
console.log(
  JSON.stringify(
    {
      ok: true,
      project: PROJECT,
      productionUrl: prodUrl,
      preferredDomain: attached,
      domains: (domains.domains || []).map((d) => d.name),
    },
    null,
    2,
  ),
);
