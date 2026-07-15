# HEIRLOCK — Release Report

**Date:** 2026-07-15  
**Release candidate commit:** `9e746ea` (build fix) / feature `c1a31a8`  
**Mode:** Living Investment Partner — Release Candidate

## Deployed URLs

| Surface | URL | Status |
|---|---|---|
| Frontend (Vercel) | https://getheirlock.vercel.app | **200 LIVE** |
| API (Render) | https://heirlock-api.onrender.com | **200 LIVE** (`/api/health` ok) |
| GitHub | https://github.com/goat-dev8/HEIRLOCK | `main` @ `9e746ea` |

## Completed work (RC loop)

1. **Approve → Wealth → Sign with `decisionId`**
   - sessionStorage handoff + `?decisionId=` on Wealth
   - `POST /api/sodex/orders/place` links Partner decision → signed order
   - Client `link-order` after place

2. **Debate audit persistence**
   - `POST /api/fo/partner/debate` writes full Counsel/Falsifier/Moderator to `InvestmentDecision.debate_json`

3. **Fill → Learning**
   - Verified fills update decision outcome + thesis confidence (Wave 5)

4. **Continuity approval gate**
   - Guardian/Heir/BLOCK/unavailable policy block Approve (server + UI)

5. **Memory collapsed into Partner Learn**
   - Week-grouped narrative timeline; `/app/memory` redirects

6. **DB**
   - All migrations applied; decision columns verified (`debate_json`, `policy_json`, `fill_proof_json`, `signed_order_id`)

7. **Polish**
   - Pulse delta formatting (no float noise)
   - Living portfolio shift formatting

## Test evidence

| Check | Result |
|---|---|
| API unit tests | **67/67 pass** (local) |
| API `tsc` build | **pass** (fixed TS2345 for Render) |
| Prisma migrate deploy | **3/3 applied** |
| Decision schema integrity | **ok** |
| Local Chrome Partner/Continuity/Wealth | **green** (`0xf76e…71a3`) |
| Production API health | **ok** (db, redis, soso, nvidia, sodex) |
| Production contracts endpoint | **200** (mainnet + testnet addresses) |
| Production Partner (getheirlock) | **green** — pulse, gate, learn weeks, wallet connected |

## Known limitations

1. **SSI token citation** can flake UNAVAILABLE (DexScreener) → falsify pressure; Partner correctly challenges rather than inventing prices.
2. **Frontend unit runner** not fully installed (Vitest); Partner handoff format covered via API `handoff.test.ts`.
3. **Render free cold starts** can delay first request after idle.
4. **MASTER_PRODUCT_PLAN Phase 3–5 residual items** (full tool-calling FO AI depth, Guardian-role wallet separation staging demo) remain iterative — core Vision B loop is live and gated.
5. **CORS SIWE** production domains include configured Vercel aliases; local still uses localhost.

## Release readiness score

**8.4 / 10** — Local + production smoke green; Partner continuous loop (pulse → debate → continuity → sign → fill proof → learn) is live with objective evidence. Remaining score gap is citation flakiness and deeper FO tool-call persistence polish, not blocking deploy.

## Evidence snapshot (production Partner)

- Pulsed live; DNA · FALSIFIER  
- Policy · Continuity: Mode **Alive**, Cap **$1**, LIVE  
- Approve disabled until debate  
- Learn timeline: **Week of 2026-07-12**  
- Evidence graph: 16 nodes · 15 edges · 5–6/6 citations LIVE  
- Wallet: `0xf76e…71a3`
