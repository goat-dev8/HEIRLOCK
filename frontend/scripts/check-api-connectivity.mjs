#!/usr/bin/env node
/** Probe production API shapes the frontend depends on. Exit 0 if public connectivity is green. */
const BASE = process.env.VITE_API_URL || "https://heirlock-api.onrender.com";

const checks = [];
async function hit(path, expectOk = true) {
  const url = `${BASE}${path}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const ok = expectOk ? res.ok : true;
    checks.push({
      path,
      status: res.status,
      ok,
      ms: Date.now() - t0,
      preview: text.slice(0, 160).replace(/\s+/g, " "),
    });
    return { res, json, text };
  } catch (e) {
    checks.push({ path, status: 0, ok: false, ms: Date.now() - t0, error: String(e.message || e) });
    return null;
  }
}

const symbols = await hit("/api/sodex/markets/symbols?environment=mainnet&market=spot");
const nested = symbols?.json?.data?.data;
const symbolCount = Array.isArray(nested) ? nested.length : 0;

await hit("/api/health/live");
await hit("/api/health");
await hit("/api/config/environment");
await hit("/api/contracts");
await hit("/api/skills");
await hit("/api/ssi/config");
await hit("/api/sodex/gateways?environment=mainnet");
await hit("/api/diag");
await hit("/api/ai/health");
if (symbolCount > 0) {
  const sym = nested[0].name || nested[0].symbol;
  await hit(`/api/sodex/markets/${encodeURIComponent(sym)}/orderbook?environment=mainnet&limit=5`);
}

const failed = checks.filter((c) => !c.ok);
const report = {
  base: BASE,
  symbolCount,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  authRequired: [
    "/api/auth/me",
    "/api/sodex/verify-account",
    "/api/sodex/me/portfolio",
    "/api/soso/news/hot",
    "/api/ssi/indices/:id/*",
    "/api/sodex/orders/prepare|place",
  ],
  notes: [
    "SIWE_DOMAIN must be the frontend host (localhost for local).",
    "CORS_ALLOWED_ORIGINS must include the FE origin.",
    "Frontend normalizes nested SoDEX {data:{data:[]}} payloads.",
  ],
};
console.log(JSON.stringify(report, null, 2));
process.exit(failed.length ? 1 : 0);
