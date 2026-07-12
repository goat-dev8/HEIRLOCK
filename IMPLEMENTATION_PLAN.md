# HEIRLOCK — Implementation Plan

> **Status:** Binding roadmap. No phase advances until the current phase is **100% complete**.  
> **Sources of truth:** `PROJECT_REDESIGN.md` · `docs/GUIDE.md` · `docs/SODEX_USER_FLOW_GUIDE.md` · `01/02/03_*_MASTER_REFERENCE.md` · `PROJECT_MEMORY.md`  
> **Last architecture lock:** 2026-07-11 — Per-User Non-Custodial SoDEX Relay + NVIDIA-primary AI

---

## Stack (locked)

| Layer | Choice |
|---|---|
| Backend (FIRST) | Node.js · TypeScript · Fastify · Prisma · PostgreSQL (Supabase) · Redis · WebSocket |
| AI | NVIDIA OpenAI-compatible primary · Cerebras/SambaNova/Groq fallback |
| Contracts | Solidity · ValueChain EVM · SSI on Base |
| Frontend (LAST) | React · Vite · TypeScript · Tailwind · wagmi · viem |
| Deploy | Render (API) · Vercel (FE later) · Supabase Postgres · GitHub Actions |

**Frontend is forbidden until every backend phase below is production-ready.**

---

## Official SoDEX architecture (non-negotiable)

```
User Wallet → SIWE → JWT
  → User activates trading on official SoDEX (sodex.com / testnet.sodex.com)
  → Backend GET /accounts/{address}/state → aid
  → Store aid in Supabase (per wallet + environment)
  → User signs every trade (EIP-712)
  → Backend validates policy → relays to SoDEX
  → Real execution / balances / history / portfolio
```

### Forbidden for user trading

```
SODEX_PRIVATE_KEY
SODEX_ADDRESS
SODEX_ACCOUNT_ID   # as a global env trading identity
```

No shared house account. No custodial user keys. See `docs/SODEX_USER_FLOW_GUIDE.md`.

---

## Official AI architecture (non-negotiable)

| Priority | Provider | Notes |
|---|---|---|
| 1 | NVIDIA | `https://integrate.api.nvidia.com/v1` · primary model `deepseek-ai/deepseek-v4-flash` |
| 2 | NVIDIA | Second NVIDIA model (configurable; verify on build.nvidia.com) |
| 3 | NVIDIA | Third NVIDIA model (configurable) |
| 4+ | Cerebras → SambaNova → Groq | Only if all NVIDIA attempts fail |

Implement `AIProviderManager` with health checks, failover, retry, timeout, circuit breaker, streaming, JSON mode, tool calling, metrics, cost tracking, logs.

Verify with a **real** NVIDIA end-to-end call before depending on the AI layer.

---

## Global stop rules

1. Acceptance criteria incomplete  
2. Tests failing  
3. Secret invented  
4. Endpoint disagrees with latest official docs  
5. Mainnet write path lacks kill switch / notional cap / audit  
6. Any global SoDEX trading key used for users  
7. Frontend work before backend DoD  
8. Mock balances / fake fills  

After every completed task: update `PROJECT_MEMORY.md` → re-check docs if ecosystem touch → test → fix → continue.

---

## Repository layout

```
HEIRLOCK/
  apps/api/                 # Fastify backend ONLY until backend DoD
  apps/web/                 # FORBIDDEN until Phase 13
  packages/
    sodex-signing/
    skill-sdk/
    ai-provider/            # AIProviderManager
    config/
  contracts/
  docs/
  PROJECT_MEMORY.md
  IMPLEMENTATION_PLAN.md
  SETUP_REQUIREMENTS.md
  .env.example
  .env.production.example
```

---

## Phase 0 — Foundations

**Objective:** Docs, env templates, gitignore, memory file aligned with final architecture.

**AC:**
- [x] SoDEX user-flow guide exists  
- [ ] IMPLEMENTATION_PLAN matches per-user relay + NVIDIA AI  
- [ ] `.env.example` / `.env.production.example` have public values; no global SoDEX trading keys required  
- [ ] `PROJECT_MEMORY.md` created  
- [ ] `.gitignore` excludes `.env`  

**Stop:** Missing memory file or plan still documenting global SoDEX keys as required.

---

## Phase 1 — Backend skeleton (Fastify)

**Objective:** Bootable API with env validation, health, config, logging.

**Files:** `apps/api/**`, `render.yaml`

**AC:**
- [ ] `GET /api/health/live` 200  
- [ ] `GET /api/health` honest dependency status  
- [ ] `GET /api/config/environment` returns mainnet-limited defaults  
- [ ] Zod env schema; production rejects weak JWT  

**Tests:** health routes · env schema  

---

## Phase 2 — Database (Prisma + Supabase)

**Objective:** Production schema including `sodex_accounts`.

**Tables (minimum):**  
`user_profiles`, `wealth_policies`, `sodex_accounts(wallet, environment, account_id/aid, verified_at)`, `skill_events`, `signals`, `signed_orders`, `trades`, `agent_logs`, `agent_meta`, `attestations`, `action_log_refs`, `ai_provider_metrics`

**AC:** migrate deploy succeeds · unique `(wallet_address, environment)` on sodex_accounts  

---

## Phase 3 — Authentication (SIWE → JWT)

**Objective:** Wallet sessions for all privileged routes.

**AC:** nonce once · JWT binds address · `requireWallet` on relay/verify routes  

---

## Phase 4 — SoSoValue client

**Objective:** Real Terminal OpenAPI client (9 modules), cache, rate governor, diag probes.

**AC:** `x-soso-api-key` · 20 rpm · no CoinGecko core path · no mock payloads  

---

## Phase 5 — SSI integration

**Objective:** Index reads via SoSoValue; on-chain Base adapters after addresses verified.

**AC:** NAV/constituents live · cooldown modeled · no invented contract addresses  

---

## Phase 6 — SoDEX reads + account verify (per-user)

**Objective:** Mainnet/testnet gateways; resolve `aid`; portfolio reads for **that user only**.

**Routes:**
- `POST /api/sodex/verify-account` → GET `{SPOT}/accounts/{address}/state` → store `aid`  
- `GET /api/sodex/me/portfolio` · balances · orders · trades  

**AC:**
- [ ] No `SODEX_PRIVATE_KEY` in code path  
- [ ] `aid` from official API only  
- [ ] Environment switch mainnet/testnet  
- [ ] Deep-link URLs: sodex.com / testnet.sodex.com  

**Stop:** Any fallback to a server wallet.

---

## Phase 7 — Trading engine (user-signed relay)

**Objective:** Real EIP-712 user signatures → policy → relay → SoDEX.

**Flow:** preflight → user signs → `POST /api/sodex/relay` → audit row → forward (omit `X-API-Key` for master-wallet sigs) → parse orderID → SoDEX Portfolio proof link  

**AC:**
- [ ] Signer == JWT wallet  
- [ ] Notional cap · kill switch · allowlist · circuit breaker  
- [ ] One real mainnet-limited fill archived (when funded)  
- [ ] No simulated execution path  

---

## Phase 8 — AI Platform (`AIProviderManager`)

**Objective:** NVIDIA-primary provider manager with full resilience.

**AC:**
- [ ] Real NVIDIA e2e chat completion succeeds  
- [ ] Failover NVIDIA → NVIDIA → NVIDIA → Cerebras → SambaNova → Groq  
- [ ] Health · retry · timeout · circuit breaker · streaming · JSON · tools · metrics · logs  
- [ ] Models configurable; default primary `deepseek-ai/deepseek-v4-flash`  

**Stop:** AI layer untested against live NVIDIA endpoint.

---

## Phase 9 — Skills OS

**Objective:** Skill Registry · Permission Kernel · Event Bus · built-in Skills.

**Order:** Research → Macro → Portfolio → Risk → SSI → SoDEX → Execution → Yield → Treasury → Guardian → Tax → Estate  

**AC:** disabled skill tools invisible · mode gates · real adapters only  

---

## Phase 10 — Smart contracts (ValueChain)

**Objective:** WealthPolicy · ModeController · ActionLog · Attestation · ContinuityNFT · FeeCollector  

**AC:** deploy testnet then mainnet · addresses into env after deploy · no invented addresses beforehand  

---

## Phase 11 — Integration tests

**Objective:** CI green · signing vectors · SoSoValue/SoDEX read smokes · relay reject paths  

---

## Phase 12 — Production hardening

**Objective:** Render always-on · kill switch runbook · Sentry · redacted logs · diag production  

**Backend DoD** when Phase 12 complete.

---

## Phase 13 — Frontend (ONLY after backend DoD)

Vite React app. Forbidden before Phase 12.

---

## Dependency graph

```
0 → 1 → 2 → 3 → 4 → 5
              ↘ 6 → 7
         4 → 8 → 9
         8 → 10
    7+9+10 → 11 → 12 → 13(FE)
```

---

## Backend Definition of Done

1. Per-user SoDEX verify + portfolio + user-signed relay on mainnet-limited  
2. SoSoValue research path live (no mocks)  
3. NVIDIA AIProviderManager proven with real call + failover  
4. Skills OS enforceable  
5. Contracts deployed or explicitly gated with verified addresses  
6. Render-deployable API · Supabase migrations · `/diag` honest  
7. `PROJECT_MEMORY.md` current  

---

*End of IMPLEMENTATION_PLAN.md*
