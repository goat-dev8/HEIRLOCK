#!/usr/bin/env node
/** Poll Render deploy until live/failed; then smoke-test health. */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = { ...loadEnvFile(resolve(ROOT, ".env")), ...process.env };
const token = env.RENDER_API_KEY;
const statePath = resolve(ROOT, "scripts/.render-deploy-state.json");
if (!token || !existsSync(statePath)) {
  console.error("Need RENDER_API_KEY and scripts/.render-deploy-state.json");
  process.exit(2);
}
const state = JSON.parse(readFileSync(statePath, "utf8"));

async function api(path) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const deadline = Date.now() + 20 * 60 * 1000;
let status = "unknown";
let deploy = null;
while (Date.now() < deadline) {
  const list = await api(`/services/${state.serviceId}/deploys?limit=5`);
  const items = (Array.isArray(list) ? list : []).map((d) => d.deploy || d);
  deploy = state.deployId
    ? items.find((d) => d.id === state.deployId) || items[0]
    : items[0];
  status = deploy?.status || "unknown";
  console.log(`deploy ${deploy?.id} status=${status}`);
  if (["live", "update_failed", "build_failed", "canceled", "deactivated"].includes(status)) break;
  await new Promise((r) => setTimeout(r, 15000));
}

const base = state.url.replace(/\/$/, "");
const smoke = {};
if (status === "live") {
  // free tier cold start
  for (let i = 0; i < 8; i++) {
    try {
      const live = await fetch(`${base}/api/health/live`, { signal: AbortSignal.timeout(60000) });
      smoke.live = { status: live.status, body: await live.json() };
      if (live.ok) break;
    } catch (e) {
      smoke.live = { error: String(e.message || e) };
    }
    await new Promise((r) => setTimeout(r, 20000));
  }
  try {
    const h = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(60000) });
    smoke.health = { status: h.status, body: await h.json() };
  } catch (e) {
    smoke.health = { error: String(e.message || e) };
  }
  try {
    const c = await fetch(`${base}/api/contracts`, { signal: AbortSignal.timeout(60000) });
    smoke.contracts = { status: c.status, body: await c.json() };
  } catch (e) {
    smoke.contracts = { error: String(e.message || e) };
  }
}

const ok = status === "live" && smoke.live?.status === 200;
console.log(JSON.stringify({ ok, status, url: base, deployId: deploy?.id, smoke }, null, 2));
process.exit(ok ? 0 : 1);
