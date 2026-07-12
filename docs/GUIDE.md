# HEIRLOCK — Implementation Guide

> **Audience**: Senior engineering team building HEIRLOCK on **SoSoValue mainnet**.
>
> **Default environment**: SoDEX Mainnet + ValueChain Mainnet (chain ID `286623`). Testnet is CI-only and must be explicitly labeled — never the product default.
>
> **Sources of truth (validate before every integration change)**:
> - SoSoValue API: https://sosovalue-1.gitbook.io/sosovalue-api-doc
> - SoDEX Trading API: https://sodex.com/documentation/trading-api/trading-api
> - SoDEX Spot REST: https://sodex.com/documentation/trading-api/rest-v1/sodex-rest-spot-api
> - SoDEX WebSocket: https://sodex.com/documentation/trading-api/websocket-v1
> - ValueChain EVM: https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-valuechain-evm
> - SSI: https://ssi.sosovalue.com · https://github.com/SoSoValueLabs/ssi-protocol
> - Internal product: `PROJECT_REDESIGN.md` · ecosystem refs `01_*` / `02_*` / `03_*`
>
> **Last validated against official docs**: 2026-07-10

---

## 1. Overall Architecture

HEIRLOCK is an **AI Financial Operating System** with:

1. **Platform Layer** — Skill Registry, Permission Kernel, Event Bus, Audit Bus
2. **Flagship App** — AI Family Office / Wealth Continuity (Alive → Guardian → Heir)
3. **Skills** — built-in modules (Research, Portfolio, Risk, SSI, SoDEX, Yield, Macro, Treasury, Execution, Guardian, Estate, Tax)
4. **Ecosystem adapters** — SoSoValue OpenAPI, SSI (Base), SoDEX (mainnet), ValueChain EVM

```
Clients (Next.js) ──SIWE JWT──▶ API (FastAPI)
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              Skill Registry  Agents      Cron/WS workers
                    │            │
                    ▼            ▼
         Permission Kernel → Tool calls
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
 SoSoValue     SoDEX Mainnet   SSI / ValueChain
 OpenAPI       REST + WS       contracts
```

**Hard rule**: core market intelligence uses SoSoValue only. External price feeds are drift-checks, not the brain.

---

## 2. Backend Architecture

### Recommended layout

```
apps/api/
  src/
    platform/          # SkillRegistry, PermissionKernel, EventBus, AuditBus
    skills/            # one package per Skill
    agents/            # orchestrators (Research, Risk, Execution, …)
    clients/           # sosovalue.py, sodex.py, ssi.py, valuechain.py
    routes/            # REST + relay + health + diag
    auth/              # SIWE + JWT
    db/                # migrations, repositories
    workers/           # Celery: briefs, attestation, outcome eval
    config/            # environment profiles (mainnet-limited default)
```

### Responsibilities

| Component | Owns |
|---|---|
| API process | Auth, Skill toggles, research, portfolio reads, order relay |
| Worker process | Cron briefs, Guardian ladder, ActionLog commits, outcome tracking |
| Signer / relay | Verify EIP-712, forward to SoDEX mainnet, audit rows |
| Cache | Redis: SoSoValue snapshots, symbol metadata, health |

### Environment profiles (production)

| Profile | Chain | Writes | Default |
|---|---|---|---|
| `mainnet-limited` | 286623 | Yes, hard notional cap | **YES** |
| `mainnet` | 286623 | Yes, higher cap | Future / allowlisted |
| `mainnet-readonly` | 286623 | No | Diagnostics |
| `testnet` | 138565 | Yes | **CI / labeled only** |

Expose active profile via `GET /api/config/environment`. Frontend must send no silent testnet header in production demos.

---

## 3. Frontend Architecture

### Stack

- Next.js App Router (or Vite SPA if team prefers — keep SIWE + wagmi/viem)
- wagmi v2 + viem + Reown AppKit / MetaMask
- TanStack Query (staleTime ~60s for market panels)
- Tailwind + design tokens from HEIRLOCK brand system

### Critical UX rules (production-learned)

1. **No mock numbers.** If SoDEX does not expose aggregate spot PnL, show **Unavailable** — never fabricate.
2. **Mainnet badge** always visible when profile is mainnet.
3. **Skills panel** in Settings; toggling rebuilds available agent tools.
4. **Trade wizard**: Strategy → Risk Preflight → EIP-712 Sign → Execution Proof.
5. **Proof links**: SoDEX CLOB fills → SoDEX Portfolio Order History. ValueChain explorer **only** for real EVM `0x` tx hashes (deposits, policy contracts). Never link a relay UUID to `*-scan.valuechain.xyz`.
6. Cold-start backends: show “waking up” retry, not a hard failure toast on first request.

### Suggested routes

`/`, `/app` (FO dashboard), `/skills`, `/trade`, `/portfolio`, `/research`, `/track`, `/guardian`, `/estate`, `/judges`, `/diag`, `/settings`

---

## 4. AI Architecture

### Principles

- Agents orchestrate; **Skills own tools**.
- Permission Kernel filters tools by `enabledSkills × mode`.
- Multi-provider LLM fallback chain with per-provider cooldown on 429.
- Cache AI research outputs (~5 minutes) keyed by asset + skill set hash.
- Persist citations, confidence explanation, invalidation thesis with every signal.
- `Promise.allSettled` (or equivalent) for parallel data fetches — partial failure must not crash the pipeline.

### Pipeline

```
Orchestrator → Research Skill tools → Risk Skill gates → Macro overlay
            → Execution Skill (confirm) → SoDEX → AuditBus → /track
```

### Model routing

| Work | Model tier |
|---|---|
| Research synthesis / debate | Strong |
| Risk verdict | Strong |
| Execution sizing / JSON tools | Fast + deterministic schemas |
| Tax/report templates | Fast |

---

## 5. Database Architecture

### Core tables (Postgres)

| Table | Purpose |
|---|---|
| `user_profiles` | Wallet, SIWE link, prefs |
| `wealth_policies` | Allocations, bands, `enabled_skills`, mode |
| `skill_events` | Cross-skill event log |
| `signals` | Research outputs + citations + outcomes |
| `signed_orders` | EIP-712 relay audit (nonce, sig, SoDEX response) |
| `trades` | Normalized fills |
| `agent_logs` | Per-agent traces |
| `agent_meta` | Circuit breaker state |
| `attestations` | Liveness / trustee confirms |
| `action_log_refs` | ValueChain tx hash ↔ off-chain payload hash |

### Rules

- Never store KYC document bytes — pass-through to provider.
- Encrypt any custodial material (if ever used) with AES-256-GCM; prefer non-custodial mainnet relay.
- Index `wallet_address`, `created_at`, `status` on `signed_orders`.

---

## 6. API Architecture

### Headers

| Header | Use |
|---|---|
| `Authorization: Bearer <jwt>` | Wallet-authed routes |
| `x-soso-api-key` | Server→SoSoValue only (never browser) |
| SoDEX `X-API-Key` / `X-API-Sign` / `X-API-Nonce` | Server→SoDEX writes |

### Essential endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health/live` | Fast liveness for orchestrator probes |
| GET | `/api/health` | Cached deep health (SoSoValue, SoDEX, DB, Redis) |
| GET | `/api/config/environment` | Active mainnet profile + caps |
| GET/PATCH | `/api/skills` | List / toggle Skills |
| POST | `/api/agents/research/:asset` | Research Skill |
| GET | `/api/risk/preflight` | Risk Skill |
| POST | `/api/sodex/relay` | Non-custodial EIP-712 forward |
| GET | `/api/trading/orders/:id/timeline` | Poll fill proof |
| GET | `/api/sodex/user/:address/balances` | Portfolio sync |
| GET | `/api/diag` | Judge-visible integration matrix |

Global rate limit example: 120 req/min. Relay: 30 req/min **per wallet**.

---

## 7. Authentication

### SIWE → JWT

1. `GET /api/auth/nonce` → random nonce
2. Client signs SIWE message with mainnet-capable wallet
3. `POST /api/auth/verify` → JWT (HS256, short TTL e.g. 7d, rotate secret)
4. Middleware `requireWallet` binds JWT `sub` to checksum address

### Production guards

- Reject weak `JWT_SECRET` in `NODE_ENV=production`
- CORS allowlist exact frontend origins
- Relay: recovered EIP-712 signer **must equal** JWT wallet

---

## 8. Wallet Flow (Mainnet)

1. User connects MetaMask / WalletConnect (Reown).
2. Prompt add **ValueChain Mainnet** if missing:
   - Chain ID: `286623`
   - RPC: `https://mainnet.valuechain.xyz`
   - Symbol: `SOSO`
   - Explorer: `https://main-scan.valuechain.xyz`
3. User funds SoDEX via Mirror / deposit (official SoDEX UI acceptable for v1).
4. Resolve SoDEX `accountID` from `GET /spot/accounts/{userAddress}/state` (`aid` field) — **required** for trading bodies.
5. Optional: master wallet calls `addAPIKey` once; day-to-day trading uses API key **or** non-custodial user-signed relay (preferred for dashboard).

### Mainnet wallet connection checklist

- [ ] Chain ID 286623 present in wallet
- [ ] User has SoDEX mainnet balances (vUSDC / SSI mirrors as applicable)
- [ ] `accountID` cached server-side per address
- [ ] SIWE JWT issued
- [ ] Skills preset applied

---

## 9. SoSoValue API Integration

### Endpoints

- Base: `https://openapi.sosovalue.com/openapi/v1`
- Auth header: `x-soso-api-key: <key>`
- Limits: **20 req/min**, **100,000 req/month** per key (confirm dashboard if raised)

### Client requirements

1. Central HTTP wrapper with:
   - Retry on 429 / 5xx (exponential backoff + `Retry-After`)
   - Optional **failover keys** if multiple keys provisioned
   - Circuit breaker after N consecutive failures
   - Structured logging (endpoint, latency, status, remaining quota headers)
2. Redis cache:
   - Market snapshots: 30s
   - Research aggregates: 5 min
   - News clusters: 5–15 min
3. Cover all 9 modules used by Skills (Currency, ETF, Index, Crypto Stocks, BTC Treasuries, Feeds, Fundraising, Macro, Analysis).
4. Never ship the key to the browser.

### Pagination / windows

- Klines: `1d`, last ~3 months
- ETF history: ~1 month
- News time filters: ~7 days — maintain local rolling window if Skills need longer context

---

## 10. SoDEX Integration (MAINNET)

### Official mainnet endpoints (do not invent)

| Surface | URL |
|---|---|
| Spot REST | `https://mainnet-gw.sodex.dev/api/v1/spot` |
| Perps REST | `https://mainnet-gw.sodex.dev/api/v1/perps` |
| Spot WS | `wss://mainnet-gw.sodex.dev/ws/spot` |
| Perps WS | `wss://mainnet-gw.sodex.dev/ws/perps` |

Testnet (`testnet-gw.sodex.dev`, chain `138565`) is **development-only**.

### Key terminology (pinned)

| Term | Meaning |
|---|---|
| Master wallet | Owns account; signs `addAPIKey` / `revokeAPIKey` only |
| API key name | String in `X-API-Key` header — **not** an address |
| API key private key | Signs trading actions; never sent on wire |
| Max keys | 5 per master account |

### Recommended production trading modes

**A. Non-custodial relay (dashboard default)**  
User signs EIP-712 in wallet → backend verifies → forwards to gateway with `X-API-Sign` / `X-API-Nonce`.

**B. Server API key (Guardian / automated risk-off)**  
Dedicated API key per process; master cold; scoped use; kill switch.

---

## 11. EIP-712 Signing Flow (latest official)

### Domain (trading actions)

```
name: "spot" | "futures"
version: "1"
chainId: 286623          // MAINNET
verifyingContract: 0x0000000000000000000000000000000000000000
```

### Message

```
ExchangeAction { payloadHash: bytes32, nonce: uint64 }
```

### payloadHash

```
payloadHash = keccak256( utf8( compactJSON({ type: actionName, params: body }) ) )
```

**Critical rules (official):**

1. Compact JSON — no whitespace.
2. **Key order must match Go struct field order** (server re-marshals with `json.Marshal`).
3. `DecimalString` fields (`price`, `quantity`, `funds`, `stopPrice`) are **JSON strings**.
4. Omit `omitempty` fields when unset; keep required zero fields present.
5. Wire signature = `0x01` + 65-byte sig with **v normalized to 0|1** (MetaMask often returns 27|28 — subtract 27).
6. HTTP body for orders is typically the `params` object only; signing envelope still wraps `{type, params}`.

### Headers on write

| Header | Value |
|---|---|
| `X-API-Key` | API key **name** (omit if signing as master — not recommended for day trading) |
| `X-API-Sign` | `0x01`-prefixed typed signature |
| `X-API-Nonce` | uint64 ms timestamp in window `(T-2d, T+1d)` |

### Nonce management

- SoDEX stores **100 highest nonces per signing address**.
- New nonce > smallest in set; never reuse.
- **One API key / signing identity per process** — concurrent workers sharing a key race.
- Maintain atomic counter; fast-forward to `Date.now()` if behind; persist last nonce to durable storage so restarts do not collide.

---

## 12. API Key Management

1. Generate a fresh EVM keypair for the API key.
2. Master wallet signs `addAPIKey` (universal EIP-712 flow per docs).
3. Store API key private key in secrets manager (never git, never frontend).
4. Use distinct keys: `heirlock-living`, `heirlock-guardian`, …
5. Rotate by `addAPIKey` + `revokeAPIKey`; update workers atomically.
6. Remember: API keys **sign only** — queries use `accountID` / address, not the key name.

---

## 13. WebSocket Handling

### SoDEX WS (mainnet)

Subscribe to at least:

- `account-order-updates` — fill confirmation for Execution Skill
- `bookTicker` / `l2book` — slippage estimates
- `markPrice` — if perps hedges enabled later

### App WS (optional)

Fan-out prices, signals, alerts to dashboard. Auto-reconnect with backoff (e.g. up to 12 attempts). Heartbeat / ping per gateway docs.

### Limits (official ballpark)

Respect documented WS connection / subscription / message caps per IP. Share one server-side SoDEX WS multiplexer across users where possible.

---

## 14. Trading Flow (Real Mainnet Orders)

### Recommended order construction (production-hardened)

| Field | Guidance |
|---|---|
| Type | Prefer **LIMIT** for reliability; pair with **IOC** for market-style urgency |
| Slippage buffer | e.g. +0.5% buy / −0.5% sell from mid (tune per symbol) |
| Precision | Use `/markets/symbols` `pricePrecision` / `quantityPrecision` |
| Min notional | Enforce `minNotional` from symbol metadata before sign |
| Sell guard | Block quantity > available balance (reserve fee) |
| clOrdID | Deterministic idempotent ID per intent |

### End-to-end dashboard path

1. Build intent (Skill proposal)
2. Risk preflight (caps, concentration, ATR/vol, circuit breaker, kill switch)
3. Build signable envelope (Go field order helpers)
4. `eth_signTypedData_v4` in wallet
5. Convert to wire sig (`0x01` + v normalize)
6. `POST /api/sodex/relay`
7. Insert `signed_orders` row **before** upstream call
8. Forward to `https://mainnet-gw.sodex.dev/api/v1/spot/...`
9. Parse `orderID` / status; poll timeline until terminal
10. Show SoDEX Portfolio proof link + optional ActionLog commit

### Server automated path (Guardian)

Same signing math with API key private key; still enforce notional caps and kill switch.

---

## 15. Real Transaction Flow (ValueChain)

| Action | Where it settles | Proof |
|---|---|---|
| Spot / perps CLOB order | SoDEX appchain | SoDEX Portfolio / order ID |
| `WealthPolicy` / `ModeController` / `ActionLog` | ValueChain EVM | `https://main-scan.valuechain.xyz/tx/0x…` |
| WSOSO wrap/unwrap | ValueChain EVM `0x5050…5050` | Explorer tx |
| SSI mint/stake | Base (primary) | BaseScan |
| Mirror deposit/withdraw | Bridge + custodians | SoDEX deposit UI + explorer where applicable |

**Never** treat a relay audit UUID as an EVM transaction hash.

---

## 16. SSI Integration

- Frontend/contracts on **Base** for mint/stake/redeem.
- Index data via SoSoValue `/indices/*`.
- Staking → `sMAG7.ssi` etc.; respect **14-day unstake cooldown** in Guardian/Estate liquidity plans.
- Dual yield path: MAG7.ssi → stake → SoDEX sMAG7.ssi Vault (mainnet).
- SOSO stake on SSI Earn for boost; coordinate with SoDEX fee discount tiers.
- ResearchHubVoting: optional governance Skill later.

Exact contract addresses: derive from SSI app / BaseScan / repo deploy scripts — do not hardcode unverified addresses.

---

## 17. ValueChain Integration

| Param | Mainnet |
|---|---|
| Chain ID | `286623` |
| RPC | `https://mainnet.valuechain.xyz` |
| WS | `wss://mainnet-ws.valuechain.xyz` |
| Explorer | `https://main-scan.valuechain.xyz` |
| Gas | Native `SOSO` (18 decimals) |
| WSOSO | `0x5050505050505050505050505050505050505050` |

Deploy HEIRLOCK policy contracts here. Use SOSO for gas in demos (keep balances topped up).

---

## 18. Portfolio Synchronization

1. Pull spot balances, open orders, order history, user trades from SoDEX mainnet REST.
2. Price with SoDEX tickers + SoSoValue snapshots for SSI / stocks / treasuries sleeves.
3. Recompute drift vs Wealth Policy targets in Portfolio Skill.
4. If API lacks aggregate spot PnL, UI = **Unavailable**.
5. Refresh on WS fill events + periodic poll (e.g. 15–30s) while portfolio page open.

---

## 19. Error Handling & Retry Logic

| Class | Strategy |
|---|---|
| SoSoValue 429 | Backoff; failover key; serve cache |
| SoDEX 5xx | Retry idempotent GETs; **do not** blind-retry POSTs without new nonce / clOrdID strategy |
| Signature reject | Surface exact pitfall (key name, field order, decimal strings, 0x01, wrong domain) |
| Nonce collision | Bump atomic counter; persist |
| Risk reject | Return structured reasons to UI |
| Kill switch | HTTP 503 `kill_switch` |

Log correlation IDs across relay → upstream → timeline.

---

## 20. Logging & Monitoring

- Structured JSON logs: `wallet`, `skill`, `action`, `nonce`, `sodexOrderId`, `latencyMs`
- Metrics: order success rate, preflight block rate, SoSoValue remaining quota, WS reconnects
- `/api/health/live` for uptime probes; `/api/diag` for judges
- Alert on: kill switch flip, circuit breaker open, quota < 10%, signing error spike

---

## 21. Security

| Control | Implementation |
|---|---|
| Non-custodial default | User signs; backend verifies |
| Secrets | Vault / host secret store |
| Kill switch | `KILL_SWITCH_TRADING=true` instant halt |
| Notional caps | `mainnet-limited` hard cap per order |
| Allowlist | Optional `TRADING_ALLOWLIST` during launch |
| Circuit breaker | e.g. 3 global losses → 1h halt; per-asset blocks |
| Rate limits | Global + per-wallet relay |
| CORS | Exact origins |
| PII | No KYC blobs in DB; scrub NFT metadata |

---

## 22. Performance Optimizations

- Redis cache SoSoValue + symbol metadata
- Semaphore SoDEX outbound concurrency (e.g. max 5) + small inter-request delay
- Parallel research fetches with allSettled
- Frontend Query staleTime 60s; avoid refetch storms
- Precompute morning briefs once; fan-out to users
- Stay under 15–18 SoSoValue rpm steady-state

---

## 23. Rate Limits (cheat sheet)

| System | Limit |
|---|---|
| SoSoValue | 20/min, 100k/month |
| SoDEX REST weight | 1200 weight/min/IP (endpoint weights vary) |
| SoDEX orders | 600/min and 20/s per account (API key) |
| Address-based | ~1 request per 1 USDC traded cumulative (+ buffer) — see official rate-limit docs |
| App relay | Suggest ≤30/min/wallet |

---

## 24. Caching

| Key | TTL |
|---|---|
| `soso:snapshot:{id}` | 30s |
| `soso:research:{asset}` | 5m |
| `sodex:symbols` | 5–15m |
| `health:full` | 15–30s |
| AI completion | 5m |

Invalidate symbol cache on precision errors.

---

## 25. UX Improvements (ship these)

1. Four-step trade wizard with explicit preflight failures
2. Evidence-first research cards (citations, invalidation)
3. Skills toggles with plain-language “what you lose if disabled”
4. Execution proof panel: Relay Audit ID + SoDEX Order ID + pending→filled
5. Honest Unavailable states
6. `/judges` + `/diag` always green-path tested on mainnet-limited
7. Environment badge never lies

---

## 26. Lessons Learned (production experience, generalized)

1. **CLOB fills are not EVM txs** — proof UX must target SoDEX Portfolio, not ValueChain scan UUIDs.
2. **Field order bugs dominate signing failures** — centralize body builders; never ad-hoc JSON.
3. **Market orders can fail in ways LIMIT+IOC does not** — prefer buffered limits for reliability.
4. **Symbol precision must come from API metadata** — hardcoding BTC decimals will reject orders.
5. **Sell without balance guard** causes avoidable rejects and bad demos.
6. **Fabricated PnL destroys trust** — Unavailable > fake.
7. **Mainnet needs a limited profile** — uncapped mainnet in a hackathon is reckless.
8. **Kill switch + circuit breaker** are mandatory before any public wallet trading.
9. **One signing identity per worker** or nonces collide under load.
10. **SoSoValue quota** dies without cache + batch briefs.
11. **Partial research failure** must still return a degraded brief.
12. **Health live vs deep health** — probes must not wait on every dependency.
13. **Perps execution** should stay read-only until product + risk policy are ready.
14. **Telegram/custodial paths** and **dashboard non-custodial paths** must not share the same threat model.
15. **Demo default = mainnet-limited** — judges reward real fills with caps.

---

## 27. Common Mistakes

| Mistake | Symptom |
|---|---|
| `X-API-Key` = address | Auth fail |
| Master key signs `newOrder` | Sig reject |
| Missing `0x01` prefix | Sig reject |
| Numbers instead of decimal strings | Sig / validate fail |
| Wrong JSON key order | Intermittent sig fail |
| `chainId` 138565 on mainnet demo | Wrong network fills / confusion |
| Linking audit UUID to ValueChain explorer | Broken proof |
| Shared nonce across processes | `nonce already used` |
| Ignoring min notional | Immediate reject |
| Shipping SoSoValue key to Vite env | Key leak |

---

## 28. Bugs Encountered → Root Cause → Fix

| # | Bug | Root cause | Fix |
|---|---|---|---|
| 1 | Proof link 404 / nonsense explorer page | Treated relay UUID as EVM tx; CLOB settles on SoDEX appchain | Build proof links to SoDEX Portfolio; explorer only for `0x` EVM hashes |
| 2 | Signature verification failed “randomly” | JSON key order ≠ Go struct order | Canonical body builders; golden vectors vs Go SDK |
| 3 | MetaMask sig rejected by gateway | v=27/28 not normalized; missing `0x01` | `ethSigToWireSig` normalizer |
| 4 | Market order errors | Oracle / market-type constraints | LIMIT + IOC + slippage buffer |
| 5 | Quantity rejected | Wrong precision | Load `quantityPrecision` from symbols |
| 6 | Sell rejected after UI allowed it | No balance/fee reserve check | Sell balance guard |
| 7 | Portfolio showed fake PnL | API lacks aggregate spot PnL | Show Unavailable |
| 8 | Nonce already used after deploy | Nonce counter reset on restart | Persist nonce per signing address |
| 9 | SoSoValue 429 cascades | No cache / no failover | Redis + multi-key + governor |
| 10 | Concurrent strategies corrupt nonces | Shared API key | One key per process |
| 11 | Relay accepted foreign signature | Did not bind recovered signer to JWT wallet | Explicit mismatch 401 |
| 12 | Health check flapped | Deep health on probe path | Separate `/health/live` |
| 13 | Testnet symbols shown on mainnet | Env header / profile bleed | Profile resolver single source of truth; badge |
| 14 | Order “success” but failed exchange status | Trusted HTTP 200 only | Parse exchange status + executed qty |
| 15 | Funding surprise near hour boundary | Opened perps at funding time | Avoid ±60s around hour if perps enabled |

---

## 29. Better Implementation Approaches

1. **Single `sodex-signing` package** shared by frontend and backend tests.
2. **Golden test vectors** checked into repo from official Go SDK examples.
3. **Relay-first architecture** for user trades; API keys only for Guardian automation.
4. **Skill-manifest driven tools** so agents cannot call disabled capabilities.
5. **Timeline polling** until `sodexOrderId` present (2–3s interval, timeout).
6. **mainnet-limited** as code default, not a docs suggestion.
7. **Diag page** that runs live probes and shows Skill → pillar matrix.

---

## 30. Production Checklist

- [ ] SoSoValue key approved; quota monitored
- [ ] SoDEX mainnet account funded; `accountID` known
- [ ] ValueChain added to wallets; SOSO for gas
- [ ] `mainnet-limited` default; kill switch tested
- [ ] EIP-712 golden tests green
- [ ] Relay signer↔JWT binding tested
- [ ] Circuit breaker + notional cap tested
- [ ] No secrets in frontend bundle
- [ ] CORS + JWT_SECRET production guards
- [ ] `/diag` and `/judges` pass on mainnet-limited
- [ ] Proof links verified manually after a real fill
- [ ] Skills toggles rebuild tool registry
- [ ] Logging + alerts wired

---

## 31. Deployment Checklist

- [ ] API always-on host (no cold-start during judging if possible)
- [ ] Frontend on HTTPS custom domain
- [ ] Env vars set (see §33)
- [ ] Health probe = `/api/health/live`
- [ ] Migrations applied
- [ ] Redis reachable
- [ ] Cron/heartbeat secured with shared secret
- [ ] Rollback plan documented

---

## 32. Testing Checklist

- [ ] Unit: payloadHash / wire sig / decimal string helpers
- [ ] Unit: Permission Kernel skill×mode matrix
- [ ] Integration: SoSoValue each module smoke
- [ ] Integration: SoDEX mainnet **small** LIMIT IOC round-trip
- [ ] Integration: reject path (bad sig, over notional, kill switch)
- [ ] E2E: trade wizard → proof panel
- [ ] E2E: Guardian simulation mode transition
- [ ] Load: nonce uniqueness under parallel requests
- [ ] Chaos: SoSoValue 429 with cache fallback

---

## 33. Go-Live Checklist

- [ ] Demo wallet funded on **mainnet** with capped size
- [ ] Recorded fallback clip if live fill fails
- [ ] Kill switch operator reachable during demo
- [ ] `/judges` script rehearsed < 90s
- [ ] README + architecture diagram + contract addresses
- [ ] No testnet labels on marketing surfaces
- [ ] Confirm official docs URLs still match deployed gateway hosts

---

## 34. Production Environment Variables

### API

```bash
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://<heirlock-domain>
CORS_ALLOWED_ORIGINS=https://<heirlock-domain>

# SoSoValue
SOSO_API_KEY=SOSO-...
SOSO_BASE_URL=https://openapi.sosovalue.com/openapi/v1
# optional failover: SOSO_API_KEY_2=...

# SoDEX MAINNET
SODEX_CHAIN_ID=286623
SODEX_SPOT_REST=https://mainnet-gw.sodex.dev/api/v1/spot
SODEX_PERPS_REST=https://mainnet-gw.sodex.dev/api/v1/perps
SODEX_SPOT_WS=wss://mainnet-gw.sodex.dev/ws/spot
SODEX_PERPS_WS=wss://mainnet-gw.sodex.dev/ws/perps
HEIRLOCK_DEFAULT_PROFILE=mainnet-limited
TRADING_ENABLED=true
TRADING_MAX_NOTIONAL_USD=100
KILL_SWITCH_TRADING=false
TRADING_ALLOWLIST=          # empty = all, or comma addresses
# Optional server API key for Guardian automation only:
SODEX_API_KEY_NAME=heirlock-guardian
SODEX_API_KEY_PRIVATE_KEY=0x...
SODEX_MASTER_ADDRESS=0x...
SODEX_ACCOUNT_ID=

# ValueChain
VALUECHAIN_RPC=https://mainnet.valuechain.xyz
VALUECHAIN_CHAIN_ID=286623
VALUECHAIN_WS=wss://mainnet-ws.valuechain.xyz

# Data / auth
DATABASE_URL=...
REDIS_URL=...
JWT_SECRET=...              # strong
CRON_SECRET=...

# AI providers (fallback chain)
# ... provider keys ...
```

### Frontend

```bash
NEXT_PUBLIC_API_URL=https://<api-domain>
NEXT_PUBLIC_DEFAULT_ENVIRONMENT=mainnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_VALUECHAIN_CHAIN_ID=286623
```

**Never** put `SOSO_API_KEY` or SoDEX private keys in frontend env.

---

## 35. Mainnet Deployment Notes

1. Ship `mainnet-limited` first; raise caps only after soak.
2. Keep Guardian automation keys separate from any human demo wallet.
3. Top up SOSO on ValueChain for policy txs before demo day.
4. Rehearse one real fill 24h before submission; archive order ID + screenshot.
5. Re-validate gateway URLs against https://sodex.com/documentation/trading-api/trading-api on go-live morning.

---

## 36. Document Maintenance

When official docs change:

1. Diff this GUIDE against Trading API + ValueChain EVM pages.
2. Update golden signing vectors.
3. Bump “Last validated” date at top.
4. Run mainnet-limited smoke + `/diag`.

---

*End of docs/GUIDE.md — implementation handbook for HEIRLOCK mainnet build.*
