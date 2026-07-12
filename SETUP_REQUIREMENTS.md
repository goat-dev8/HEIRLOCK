# HEIRLOCK — Setup Requirements

> Onboarding checklist for a **real production** HEIRLOCK deployment.
>
> **Mainnet is primary.** Testnet is for labeled testing / CI only.
>
> Public infrastructure values are already filled in `.env.example` / `.env.production.example` from official docs (validated **2026-07-11**).
>
> **Architecture lock:** Per-user non-custodial SoDEX relay · NVIDIA-primary AI · Supabase PostgreSQL · Backend-first (no frontend until backend DoD).

---

## Legend

| Tag | Meaning |
|---|---|
| **AUTO** | Already completed / discoverable from official docs (in env files) |
| **USER** | You must act |
| **APPROVAL** | Manual review by a third party |
| **PAYMENT** | Likely paid plan or usage fees |
| **REGISTRATION** | Create an account |
| **WHITELIST** | Access gated |
| **API** | API key / credential |
| **WALLET** | EVM wallet + signatures |
| **FUNDING** | On-chain balances required |
| **DEPLOY** | Hosting / infra deploy |
| **DNS** | Domain / DNS records |
| **SECRETS** | Generate and store securely |

**Priority:** P0 = block Phase 1–4 · P1 = block trading/AI · P2 = Guardian/Estate polish · P3 = nice-to-have

---

## A. Already completed automatically (AUTO)

| Item | Value / location | Official source |
|---|---|---|
| SoSoValue API base URL | `https://openapi.sosovalue.com/openapi/v1` | [API docs](https://sosovalue-1.gitbook.io/sosovalue-api-doc) |
| SoSoValue rate limits | 20/min, 100k/month | [Rate limit](https://sosovalue-1.gitbook.io/sosovalue-api-doc/rate-limit.md) |
| SoDEX mainnet Spot/Perps REST+WS | `mainnet-gw.sodex.dev` | [Trading API](https://sodex.com/documentation/trading-api/trading-api) |
| SoDEX testnet gateways | `testnet-gw.sodex.dev` | same |
| SoDEX EIP-712 domain | `spot` / `futures`, version `1`, verifyingContract `0x0…0` | same |
| ValueChain mainnet | chain `286623`, RPC/WS/explorer filled | [ValueChain EVM](https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-valuechain-evm) |
| ValueChain testnet | chain `138565`, RPC/WS/explorer filled | same |
| WSOSO | `0x5050505050505050505050505050505050505050` | [WSOSO](https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-wsoso) |
| $SOSO Ethereum / Base | filled in env | SSI master ref |
| Base chain / RPC | `8453` / `https://mainnet.base.org` | Base docs |
| SSI / SoDEX app URLs | filled | official sites |
| NVIDIA OpenAI-compatible base | `https://integrate.api.nvidia.com/v1` | [NVIDIA API](https://docs.api.nvidia.com/) |
| NVIDIA primary model default | `deepseek-ai/deepseek-v4-flash` | [Build](https://build.nvidia.com/deepseek-ai/deepseek-v4-flash) |
| Default trading profile | `mainnet-limited`, `$100` notional cap | product policy |

---

## B. Need registration + API access

### B1. SoSoValue API key — P0 · REGISTRATION · APPROVAL · API

| | |
|---|---|
| **URL** | https://sosovalue.com/developer/dashboard |
| **Docs** | https://sosovalue-1.gitbook.io/sosovalue-api-doc/setting-up-your-api-key.md |
| **Env** | `SOSO_API_KEY` (optional `SOSO_API_KEY_2`) |
| **Header** | `x-soso-api-key` |
| **Time** | 2 min apply + approval wait |

### B2. NVIDIA API key — P0 · REGISTRATION · API

| | |
|---|---|
| **URL** | https://build.nvidia.com/ → Generate API Key |
| **Docs** | https://docs.api.nvidia.com/ · https://build.nvidia.com/ |
| **Env** | `NVIDIA_API_KEY` |
| **Base URL** | `https://integrate.api.nvidia.com/v1` (AUTO) |
| **Models** | Verify on Build; defaults: `deepseek-ai/deepseek-v4-flash` → `meta/llama-3.1-70b-instruct` → `nvidia/llama-3.1-nemotron-70b-instruct` |
| **Time** | 5 min |
| **Why** | Primary AI provider for agentic coding / reasoning |

### B3. AI fallback keys — P1 · REGISTRATION · API

| Provider | URL | Env |
|---|---|---|
| Cerebras | https://cloud.cerebras.ai/ | `CEREBRAS_API_KEY` |
| SambaNova | https://cloud.sambanova.ai/ | `SAMBANOVA_API_KEY` |
| Groq | https://console.groq.com/ | `GROQ_API_KEY` |

Used **only** if every NVIDIA model attempt fails.

### B4. Reown / WalletConnect — P2 (frontend later) · REGISTRATION · API

| | |
|---|---|
| **URL** | https://cloud.reown.com/ |
| **Env** | `REOWN_PROJECT_ID` |
| **Time** | 5–10 min |

### B5–B8. Optional (P1–P2)

| Service | Env | URL |
|---|---|---|
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | https://resend.com/ |
| Telegram | `TELEGRAM_BOT_TOKEN` | https://t.me/BotFather |
| Pinata | `PINATA_JWT` | https://app.pinata.cloud/ |
| Sentry | `SENTRY_DSN` | https://sentry.io/ |
| Sumsub | `SUMSUB_*` | https://sumsub.com/ |
| Twilio | `TWILIO_*` | https://www.twilio.com/ |

---

## C. Need infrastructure

### C1. Supabase PostgreSQL — P0 · DEPLOY

| | |
|---|---|
| **URL** | https://supabase.com/dashboard |
| **Env** | `DATABASE_URL` (pooler / transaction mode), `DIRECT_DATABASE_URL` (session/direct for migrations) |
| **Docs** | https://supabase.com/docs/guides/database/connecting-to-postgres |
| **Time** | 5–15 min |
| **Why** | Prisma source of truth including `sodex_accounts` |

### C2. Redis — P0 · DEPLOY

| | |
|---|---|
| **Recommended** | Upstash Redis |
| **Env** | `REDIS_URL` |
| **Time** | 10 min |

### C3. Render (Backend) — P0 · DEPLOY

| | |
|---|---|
| **URL** | https://dashboard.render.com/ |
| **Root** | `apps/api` |
| **Health** | `/api/health/live` |
| **Time** | 30–60 min |
| **Note** | Prefer always-on for trading demos |

### C4. Vercel (Frontend) — **DEFERRED** until backend DoD

Do not prioritize until Phase 13.

### C5. Generate app secrets — P0 · SECRETS

| Secret | Command | Env |
|---|---|---|
| JWT | `openssl rand -hex 32` | `JWT_SECRET` |
| Cron | `openssl rand -hex 24` | `CRON_SECRET` |
| Wallet encrypt | `openssl rand -hex 32` | `WALLET_ENCRYPT_KEY` |

---

## D. SoDEX — per-user non-custodial (CRITICAL)

### Forbidden for user trading

Do **not** configure or use:

```
SODEX_PRIVATE_KEY
SODEX_ADDRESS
SODEX_ACCOUNT_ID
```

as a global shared trading identity.

### Official user flow

1. User connects wallet (SIWE → JWT)  
2. User opens official SoDEX (`https://sodex.com` or `https://testnet.sodex.com`) and **Enable Trading**  
3. Backend `GET {SPOT}/accounts/{address}/state` → field `aid`  
4. Store `aid` in Supabase `sodex_accounts` for `(wallet, environment)`  
5. User signs every EIP-712 trade  
6. Backend validates policy → relays to SoDEX (omit `X-API-Key` for master-wallet signatures)  
7. Real balances / orders / portfolio for **that user only**

See `docs/SODEX_USER_FLOW_GUIDE.md`.

### D1. Each end-user wallet — P0 · WALLET · FUNDING

| | |
|---|---|
| **Steps** | Add ValueChain · fund SOSO gas · Enable Trading on SoDEX · deposit collateral as needed |
| **Storage** | `aid` in DB only — never a server private key for that user |
| **Time** | per user onboarding |

### D2. Optional Guardian automation key — P2 · WALLET · API

| | |
|---|---|
| **Env** | `SODEX_GUARDIAN_API_KEY_NAME`, `SODEX_GUARDIAN_API_KEY_PRIVATE_KEY`, `SODEX_GUARDIAN_MASTER_ADDRESS` |
| **Why** | Automated risk-off only — **not** a house trading account for users |
| **Limit** | Max 5 API keys per master |

### D3. Trading allowlist — P0 (launch)

| | |
|---|---|
| **Env** | `TRADING_ALLOWLIST=0xabc...,0xdef...` |
| **Why** | Restrict mainnet writes during soak |

### D4. SoDEX Testnet whitelist — P2 · WHITELIST

| | |
|---|---|
| **Docs** | https://sodex.com/documentation/resources/testnet-onboarding-steps |

---

## E. Need discovery (do not invent addresses)

### E1. SSI Protocol contracts on Base — P1

Discover via `ssi.sosovalue.com` wallet prompts → verify on BaseScan → optional cross-check `SoSoValueLabs/ssi-protocol`.

### E2. HEIRLOCK contracts — after Phase 10 deploy

---

## F. Domain · DNS — P2 (after frontend)

`FRONTEND_URL`, `SIWE_DOMAIN`, `SIWE_URI`, `CORS_ALLOWED_ORIGINS`, email domain.

---

## G. Approvals summary

| Item | Who | Blocks |
|---|---|---|
| SoSoValue API key | SoSoValue Labs | Terminal Skills |
| SoDEX testnet whitelist | SoDEX | Testnet trading CI |
| Sumsub production | Sumsub | Live Estate KYC |

---

## H. Recommended human setup order

1. Supabase project + `DATABASE_URL` / `DIRECT_DATABASE_URL`  
2. Generate `JWT_SECRET` / `CRON_SECRET` / `WALLET_ENCRYPT_KEY`  
3. NVIDIA API key (primary AI)  
4. Apply SoSoValue API key (approval lag)  
5. Cerebras / SambaNova / Groq fallbacks  
6. Redis  
7. Render API deploy (health only)  
8. Per-user SoDEX Enable Trading when testing Phase 6–7  
9. Optional Guardian key, Pinata, Sentry  
10. Frontend / Vercel **only after backend DoD**  

---

## I. Ready for Phase 1 coding

Minimum:

- [x] Postgres URL (Supabase) — if already in `.env`  
- [ ] `JWT_SECRET` generated  
- [x] `NVIDIA_API_KEY` — if already in `.env`  
- [ ] SoSoValue key applied / normalized to `SOSO_API_KEY`  
- [ ] Redis (can soft-fail health until present)  

Minimum for real mainnet trading (Phase 7):

- [ ] SoSoValue key approved  
- [ ] User has Enable Trading + `aid` stored in DB  
- [ ] Allowlist + kill switch + notional cap  
- [ ] No global SoDEX trading private key in use  

---

*End of SETUP_REQUIREMENTS.md*
