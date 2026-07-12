# HEIRLOCK — SoDEX User Flow Guide

> **Status:** Binding architecture decision for SoDEX integration.  
> **Validated against official docs:** 2026-07-11  
> **Sources of truth:**
> - https://sodex.com/documentation/trading-api/trading-api  
> - https://sodex.com/documentation/trading-api/rest-v1  
> - https://sodex.com/documentation/trading-api/rest-v1/sodex-rest-spot-api  
> - https://sodex.com/documentation/trading-api/websocket-v1  
> - https://sodex.com/documentation/user-guide/onboarding-guidance  
> - https://sodex.com/documentation/user-guide/onboarding-guidance/log-in-with-wallet  
> - https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-valuechain-evm  
>
> **Product context:** HEIRLOCK is a multi-user AI Financial OS. Every user trades on **their own** SoDEX account. There is **no shared house trading account**.

---

## Executive answer (First Question)

### Do we need these server environment variables?

```
SODEX_PRIVATE_KEY=
SODEX_ADDRESS=
SODEX_ACCOUNT_ID=
```

**No — not for the production multi-user product.**

Those three variables describe a **single global SoDEX account owned by the server**. That model is incompatible with:

- multiple independent users  
- per-user balances / orders / permissions  
- non-custodial production security  
- HEIRLOCK’s Family Office architecture  

### Is the proposed user-centric architecture correct?

**Yes — with one precise clarification.**

Your proposed flow is correct according to official SoDEX documentation:

1. User connects wallet (in HEIRLOCK).  
2. User activates trading **on SoDEX** (official “Enable Trading” gas-less signature).  
3. Environment-specific SoDEX app:
   - Mainnet → https://sodex.com  
   - Testnet → https://testnet.sodex.com  
4. User deposits / funds on SoDEX (Mirror / connected wallet).  
5. User returns to HEIRLOCK.  
6. Backend resolves that wallet’s SoDEX **Account ID (`aid`)** via the official account-state API.  
7. HEIRLOCK stores `aid` (and environment) in **our database**, keyed by wallet.  
8. All portfolio / balance / order / trade calls use **that user’s** address + `accountID`.  
9. Every trade is signed by **that user** (EIP-712).  
10. Backend never depends on a global trading private key.

**Clarification:** “Activate Trading” is not a HEIRLOCK-invented API. Official onboarding defines it as SoDEX’s **Enable Trading** step on sodex.com / testnet.sodex.com (wallet signs a gas-less message). HEIRLOCK should deep-link users there, then verify readiness by fetching account state.

---

## Official model (what SoDEX actually is)

From the Trading API overview:

| Concept | Meaning |
|---|---|
| **Master wallet** | User’s EVM wallet that owns the SoDEX account |
| **Account ID (`aid`)** | Numeric SoDEX account identifier required for account queries and trading bodies |
| **API key** | Optional named signing credential (max 5 per master). Signs trading actions; **cannot** query account data |
| **Default / master signing** | Trading actions can be signed by the master wallet when `X-API-Key` is omitted |
| **Public market data** | Symbols, orderbooks, tickers, klines — no user secret required |
| **Account data** | Queried by `userAddress` / `accountID` — not by API key |

Official “Get account ID”:

```bash
GET ${SPOT_ENDPOINT}/accounts/{userAddress}/state
# or
GET ${PERPS_ENDPOINT}/accounts/{userAddress}/state
```

Response field: **`aid`** = Account ID.

Mainnet Spot endpoint:

`https://mainnet-gw.sodex.dev/api/v1/spot`

Testnet Spot endpoint:

`https://testnet-gw.sodex.dev/api/v1/spot`

---

# 1. User Journey

Complete path from first visit → first successful trade.

```
┌─────────────┐
│ Visit HEIRLOCK
└──────┬──────┘
       ▼
┌─────────────┐
│ Connect wallet (SIWE → JWT)
└──────┬──────┘
       ▼
┌─────────────┐
│ Choose environment: MAINNET (default) or TESTNET (labeled)
└──────┬──────┘
       ▼
┌─────────────┐
│ Click “Activate Trading on SoDEX”
│ → open sodex.com OR testnet.sodex.com
└──────┬──────┘
       ▼
┌──────────────────────────────────────────┐
│ On SoDEX (official product):             │
│ 1. Connect same wallet                   │
│ 2. Accept Terms                          │
│ 3. Enable Trading (gas-less sign)        │
│ 4. Deposit funds (Mirror / connected)    │
│ 5. Optional: add ValueChain to MetaMask  │
└──────┬───────────────────────────────────┘
       ▼
┌─────────────┐
│ Return to HEIRLOCK → “I’ve activated”
└──────┬──────┘
       ▼
┌─────────────┐
│ Backend: GET /spot/accounts/{address}/state
│ Persist aid + environment in DB
└──────┬──────┘
       ▼
┌─────────────┐
│ Portfolio sync (balances, orders, fills)
└──────┬──────┘
       ▼
┌─────────────┐
│ Trade wizard: preflight → EIP-712 sign → relay → proof
└─────────────┘
```

**Success criteria for “ready to trade” in HEIRLOCK:**

- SIWE session valid  
- Environment selected  
- `aid` resolved and non-zero  
- Spot balances readable for that address  
- (Recommended) allowlist / risk policy OK  

---

# 2. Wallet Connection

### In HEIRLOCK

1. User connects via Reown / MetaMask / WalletConnect.  
2. HEIRLOCK issues SIWE challenge → user signs → backend returns JWT bound to checksum address.  
3. All privileged API calls send `Authorization: Bearer <jwt>`.  
4. Prompt user to add **ValueChain** when needed:

| Network | Chain ID | RPC | Explorer | Symbol |
|---|---|---|---|---|
| Mainnet | `286623` | `https://mainnet.valuechain.xyz` | `https://main-scan.valuechain.xyz` | SOSO |
| Testnet | `138565` | `https://testnet-v2.valuechain.xyz` | `https://test-scan.valuechain.xyz` | SOSO |

Official source: ValueChain EVM docs.

### Critical rule

The wallet that connects to HEIRLOCK **must be the same master wallet** used on SoDEX for that environment. Account ID resolution is address-based.

---

# 3. Testnet Flow

> Testnet is for labeled testing / CI only. Never the product default.

### Activation

1. User selects **Testnet** in HEIRLOCK Settings (explicit badge).  
2. HEIRLOCK opens https://testnet.sodex.com with copy: “Connect the same wallet, Enable Trading, claim/fund test assets, then return.”  
3. Official testnet onboarding also requires whitelist wallet in many cases (see SoDEX testnet onboarding docs).  

### Funding

- Claim test tokens on SoDEX testnet UI.  
- Transfer from EVM funding account → Spot account (official steps).  
- Add ValueChain testnet to wallet when prompted.

### Profile

- SoDEX testnet profile is the source of truth for deposits and Enable Trading.  
- HEIRLOCK does not host SoDEX custody UI.

### Trading (from HEIRLOCK)

- Gateway: `https://testnet-gw.sodex.dev/api/v1/spot` (+ perps/WS equivalents)  
- EIP-712 `chainId`: `138565`  
- Domain name: `spot` or `futures`

### Returning to HEIRLOCK

1. User clicks “Verify SoDEX account”.  
2. Backend calls testnet:

```http
GET https://testnet-gw.sodex.dev/api/v1/spot/accounts/{userAddress}/state
```

3. Store `{ wallet, environment: 'testnet', account_id: aid, verified_at }`.  
4. Sync balances/orders from testnet gateway only while Testnet is selected.

---

# 4. Mainnet Flow

> Primary production path.

### Activation

1. Default environment = **Mainnet**.  
2. HEIRLOCK opens https://sodex.com.  
3. User follows official wallet login:

Official steps (Log in with wallet):

1. Connect wallet on sodex.com  
2. Accept Terms / Privacy / Cookies  
3. Click **Enable Trading** → gas-less signature in wallet  
4. Deposit (USDC Base/Ethereum, BTC, ETH, SOL, MAG7.ssi / sMAG7.ssi / SOSO, etc.)  
5. Ready to trade on SoDEX  

### Funding

- Prefer official SoDEX deposit flows (Mirror Protocol / connected wallet).  
- HEIRLOCK may deep-link “Deposit” but should not re-implement bridge custody in v1.  
- Remind users: only clean funds (KYT/KYA on SoDEX deposits/withdrawals).

### Profile

- SoDEX mainnet portfolio: https://sodex.com/portfolio (order history / balances UI)  
- HEIRLOCK portfolio terminal mirrors API data for the same wallet.

### Trading (from HEIRLOCK)

- Gateway: `https://mainnet-gw.sodex.dev/api/v1/spot`  
- EIP-712 `chainId`: `286623`  
- Enforce `mainnet-limited` notional caps + kill switch + allowlist during soak  

### Returning to HEIRLOCK

```http
GET https://mainnet-gw.sodex.dev/api/v1/spot/accounts/{userAddress}/state
```

Persist `aid` for `environment = mainnet`.

---

# 5. How to retrieve the user’s SoDEX Account ID

### Exact official method

From Trading API → **Get account ID**:

```bash
curl -X GET "https://mainnet-gw.sodex.dev/api/v1/spot/accounts/{userAddress}/state" \
  -H "Accept: application/json"
```

- Field: **`aid`**  
- Same pattern under perps endpoint  
- Optional `?accountID=` for sub-accounts (primary account is default)

### Do not guess

- Do not invent account IDs.  
- Do not use a server global `SODEX_ACCOUNT_ID` for users.  
- Do not treat API key name as an account identifier (official: API keys are for signing only).

### Store in DB or fetch every session?

**Both — cache in DB, always re-fetchable.**

| Approach | Use |
|---|---|
| **Store in DB** | Fast UX; attach to `user_profiles` / `sodex_accounts` as `(wallet, environment) → account_id` |
| **Re-fetch on demand** | On “Verify”, on trade preflight if missing/stale, on 4xx account errors |
| **TTL refresh** | e.g. re-validate every 24h or when portfolio sync fails |

Recommended schema fields:

```
sodex_accounts (
  wallet_address,
  environment,          -- 'mainnet' | 'testnet'
  account_id,           -- aid
  verified_at,
  last_synced_at,
  UNIQUE(wallet_address, environment)
)
```

---

# 6. Trading Flow (real production)

No mocks. No fake fills. No shared account.

### 6.1 Reads (portfolio / balances / history)

Backend (with user JWT) proxies **read** calls to the environment gateway using the user’s address / `accountID`:

Examples (paths follow SoDEX REST v1; always confirm against current schema docs):

- Account state → resolve `aid`  
- Balances for address  
- Open orders / order history / user trades  
- Public: symbols, orderbook, tickers, mark prices  

**No private key required for reads.**

### 6.2 Order creation (HEIRLOCK)

1. Build intent (Skill proposal or manual).  
2. Load symbol metadata (`pricePrecision`, `quantityPrecision`, `minNotional`).  
3. Construct order body with **Go struct field order** and **decimal strings**.  
4. Include user’s `accountID` (`aid`) in the trading params.  
5. Risk preflight (caps, balance, kill switch, circuit breaker).  

Recommended reliable style for interactive trades:

- Type: **LIMIT**  
- TIF: **IOC** (market-style urgency with slippage buffer)  
- Slippage buffer from mid (e.g. +0.5% buy / −0.5% sell)  
- Deterministic `clOrdID`  

### 6.3 Signing (EIP-712) — user signs

Official trading typed data:

- `domain.name`: `"spot"` or `"futures"`  
- `domain.version`: `"1"`  
- `domain.chainId`: `286623` (mainnet) or `138565` (testnet)  
- `domain.verifyingContract`: `0x000…000`  
- `message`: `{ payloadHash, nonce }`  
- `payloadHash = keccak256(compactJSON({ type, params }))`  
- Wire signature: prepend byte `0x01`; normalize `v` to 0|1  

**Official REST write paths (2026 Spot/Perps REST):**

| Market | Place | Cancel | EIP-712 action types |
|---|---|---|---|
| Spot | `POST ${SPOT}/trade/orders/batch` | `DELETE ${SPOT}/trade/orders/batch` | `batchNewOrder` / `batchCancelOrder` |
| Perps | `POST ${PERPS}/trade/orders` | `DELETE ${PERPS}/trade/orders` | `newOrder` / `cancelOrder` |

Account reads always use `{userAddress}` (not aid-as-path). Order history: `GET .../accounts/{userAddress}/orders/history`.

**Production HEIRLOCK path:** the **user’s master wallet** signs in the browser (`eth_signTypedData_v4`).

Official docs allow omitting `X-API-Key` to sign with the master wallet (default key). That is the correct interactive multi-user model.

### 6.4 API Keys — when they matter

| Mode | Who holds key material | When to use |
|---|---|---|
| **Interactive user trades** | User wallet only | Default HEIRLOCK trade wizard |
| **Automated strategy / Guardian offline** | Registered API key private key | Only if product explicitly supports delegated automation |
| **Global server API key** | Server `.env` | **Rejected** for multi-user product |

Official recommendation for bots: register API keys via `addAPIKey` (master signs once), then sign day-to-day with API key private key. That is for **automation**, not for replacing per-user interactive trading.

### 6.5 Relay (backend role)

```
Browser: build envelope → user signs → wire sig
   → POST /api/sodex/relay (JWT)
Backend:
   1. requireWallet
   2. kill switch / allowlist / notional cap / risk
   3. verify EIP-712 recovers to JWT wallet
   4. insert signed_orders audit row
   5. forward to SoDEX gateway with X-API-Sign + X-API-Nonce
      (omit X-API-Key for master-wallet signatures)
   6. parse orderID/status
   7. return proof payload
```

Backend is a **policy + audit + forwarder**, not a custodian.

### 6.6 WebSocket updates

Subscribe (server-side multiplexer preferred):

- `account-order-updates` for fill confirmation  
- market streams for books/tickers as needed  

Fan out to the owning wallet’s dashboard session only.

### 6.7 Portfolio synchronization

On interval + on fill events:

1. Fetch balances/orders/trades for that address/`aid`  
2. Price with SoDEX tickers (+ SoSoValue for SSI sleeves)  
3. If aggregate spot PnL is not provided by API → UI shows **Unavailable** (never fabricate)

### 6.8 Order history & proof links

- Persist relay audit UUID separately from SoDEX `orderID`  
- Proof UX: link to **SoDEX Portfolio → Order History** for CLOB fills  
- ValueChain explorer **only** for real EVM `0x` transaction hashes (deposits, HEIRLOCK policy contracts)  
- Never link a relay UUID to `main-scan.valuechain.xyz`

---

# 7. Security Review

### Should our backend ever store a master wallet private key?

**No** (for user accounts).  
Official docs: master private key grants full control; keep offline; use only for `addAPIKey` / `revokeAPIKey`.  
HEIRLOCK must never custody user master keys.

Optional exception: a **company ops wallet** for deploying contracts / paying gas — unrelated to user trading, and still not named `SODEX_PRIVATE_KEY` as a trading identity.

### Should we have a global SoDEX trading account?

**No.**  
Violates multi-user isolation, mixes funds/permissions, and creates a honeypot.  
Official account model is per master wallet / accountID.

### Should every user sign their own trades?

**Yes** for interactive production trading.  
Matches non-custodial SoDEX design and EIP-712 auth.

### Is `SODEX_PRIVATE_KEY` actually necessary?

**Not for the product trading path.**  
Only appears in architectures that run a server-side bot against one account.  
HEIRLOCK multi-user design: **omit it**.

### Is `SODEX_ADDRESS` actually necessary?

**Not as a global env var.**  
Each session already has the user address from SIWE JWT.  
Optional ops address for contract deploy is a different secret name.

### Is `SODEX_ACCOUNT_ID` actually necessary?

**Not as a global env var.**  
Each user has their own `aid`, resolved from:

`GET /accounts/{userAddress}/state` → `aid`  

Store per user in DB.

### Which values belong in `.env`?

| Belongs in `.env` | Why |
|---|---|
| SoDEX gateway URLs (mainnet/testnet) | Public infrastructure |
| Chain IDs, EIP-712 domain constants | Public |
| `HEIRLOCK_DEFAULT_PROFILE`, notional caps, kill switch | App policy |
| `TRADING_ALLOWLIST` (optional soak) | Ops policy |
| JWT/DB/Redis/SoSoValue keys | App infra (not SoDEX user trading keys) |

### Which values belong in the database?

| DB field | Why |
|---|---|
| `wallet_address` | User identity |
| `environment` | mainnet/testnet |
| `account_id` (`aid`) | Per-user SoDEX account |
| `signed_orders` / trades | Audit |
| skill/policy settings | Product state |

### Which values should be derived dynamically?

| Dynamic | Source |
|---|---|
| `aid` | Official account state API |
| Symbol IDs / precision / minNotional | `/markets/symbols` |
| Balances, open orders, fills | Account REST (+ WS) |
| Mark prices / books | Market REST/WS |
| Nonce | Client atomic ms counter per signer |

### Support summary (docs-backed)

- Account ID retrieval: Trading API “Get account ID”  
- Master vs API key signing split: Trading API key terminology table  
- Enable Trading onboarding: “Log in with wallet” user guide  
- Chain IDs / RPC: ValueChain EVM docs  
- Max 5 API keys; keys don’t query accounts: Trading API overview  

---

# 8. Final Recommendation

## One production design (mandatory)

### Name

**Per-User Non-Custodial SoDEX Relay**

### Rules

1. **No global SoDEX trading private key.**  
2. **No global `SODEX_ACCOUNT_ID`.**  
3. Each user connects wallet → SIWE.  
4. Each user activates trading on official SoDEX (mainnet or testnet URL).  
5. HEIRLOCK resolves and stores that user’s `aid` per environment.  
6. Reads use that user’s address/`aid` against the selected gateway.  
7. Writes: user signs EIP-712 in wallet; HEIRLOCK relays with policy checks + audit.  
8. Mainnet is default; testnet is explicit and labeled.  
9. Optional future Guardian automation uses **per-user delegated API keys** (never a shared house key) — not required for v1 interactive trading.  
10. Server `.env` holds gateways, chain IDs, risk policy, and app secrets — **not** user trading keys.

### Sequence (canonical)

```
User wallet
  → SIWE session
  → Activate on sodex.com / testnet.sodex.com (Enable Trading + deposit)
  → HEIRLOCK verifies via GET /accounts/{address}/state (aid)
  → DB cache (wallet, env, aid)
  → Trade: local EIP-712 sign → /api/sodex/relay → SoDEX gateway
  → Proof: SoDEX orderID + Portfolio link
```

### What to remove / avoid from env templates for trading

Do **not** require for multi-user production:

```
SODEX_PRIVATE_KEY=
SODEX_ADDRESS=
SODEX_ACCOUNT_ID=
```

If present from older drafts, treat them as **deprecated for user trading**. Keep only if you later add a clearly named **ops-only** bot account (out of scope for HEIRLOCK user funds).

### Compatibility checklist

| Requirement | Satisfied? |
|---|---|
| Multiple users | Yes — per wallet/`aid` |
| Mainnet | Yes — mainnet gateways + chain 286623 |
| Testnet | Yes — testnet gateways + chain 138565 |
| Real trading | Yes — EIP-712 to official gateway |
| Real balances/orders | Yes — account REST by address/`aid` |
| Independent permissions | Yes — each master wallet owns its account |
| No shared trading account | Yes |
| Minimize server secrets | Yes — no user trading keys on server |
| Official-docs compatible | Yes |

---

## Implementation notes for HEIRLOCK phases

When Phase 6–7 begin:

1. Update `.env.example` / `.env.production` comments to mark global SoDEX trading keys as **not used**.  
2. Add DB model `sodex_accounts`.  
3. Add routes:  
   - `POST /api/sodex/verify-account` (fetch+store `aid`)  
   - `GET /api/sodex/me/portfolio` (user-scoped)  
   - `POST /api/sodex/relay` (user-signed)  
4. Frontend: “Activate Trading” deep links + “Verify” button.  
5. Never silently fall back to a server wallet.

---

## Common mistakes (do not repeat)

1. Putting one operator key in `.env` and trading “for all users”.  
2. Treating relay audit UUID as a ValueChain tx hash.  
3. Assuming API key header carries an address.  
4. Hardcoding account IDs.  
5. Using testnet gateways while showing a mainnet badge.  
6. Fabricating balances when `aid` is missing — show **Activate / Verify** instead.  
7. Server-signing user orders with a shared key.

---

*End of docs/SODEX_USER_FLOW_GUIDE.md — definitive SoDEX integration architecture for HEIRLOCK.*
