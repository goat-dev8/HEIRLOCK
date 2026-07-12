# HEIRLOCK — Project Memory

Last updated: 2026-07-12

## What HEIRLOCK is

AI Family Office / Finance OS on SoSoValue. Non-custodial. Per-user SoDEX relay (SIWE → JWT → Enable Trading → EIP-712 → relay). Mainnet trades hard-capped (≤ $1 USDC notional in current profile).

## Live surfaces

| Layer | URL |
|---|---|
| API | https://heirlock-api.onrender.com |
| Web | https://heirlock-os.vercel.app (also heirlock-beta.vercel.app) |
| Repo | https://github.com/goat-dev8/HEIRLOCK |

## Product flow (user-visible)

1. Connect wallet + SIWE
2. Choose Mainnet (default) or labeled Testnet
3. Open official SoDEX → Enable Trading → return → Verify aid
4. Portfolio: balances from SoDEX; **USD marks from spot tickers `lastPx`** (vUSDC/USDC = $1; WSOSO↔SOSO alias)
5. SSI: SoSoValue OpenAPI indices (default `ssimag7`). NAV = snapshot `price`. 24h = `24h_change_pct` × 100. AUM often unavailable from snapshot (show Unavailable, never invent)
6. Trading: symbols enriched with tickers; prepare → EIP-712 ExchangeAction → place
7. Continuity: ValueChain WealthPolicy / ModeController / ContinuityNFT
8. AI UI label: **Sonnet 5** (do not expose vendor cascade in the product UI)

## Real-data contracts (do not regress)

### SoDEX
- Spot REST mainnet: `https://mainnet-gw.sodex.dev/api/v1/spot`
- Spot REST testnet: `https://testnet-gw.sodex.dev/api/v1/spot`
- Prices: `GET /markets/tickers` → `lastPx`
- Symbols: `GET /markets/symbols` (metadata only until HEIRLOCK merges tickers)
- HEIRLOCK enrichment: `apps/api/src/sodex/mark-to-market.ts` + `/api/sodex/markets/symbols` + `/api/sodex/me/portfolio`
- Orderbook respects `market=spot|perps`

### SSI / SoSoValue
- Base: `https://openapi.sosovalue.com/openapi/v1` + `x-soso-api-key`
- List: `GET /indices`
- Snapshot: `GET /indices/{id}/market-snapshot` fields: `price`, `24h_change_pct`, ROI fields
- Valid tickers include `ssimag7`, `ssilayer1`, `ssidefi`, … — **not** ETF ids like `BTCX20`
- On-chain Base router/staking/voting remain null until verified (deep-link SSI app only)

### Frontend branding
- Mark: `frontend/public/brand/heirlock-mark.svg` (+ favicon)
- DESIGN.md at repo root (Stripe-clarity + antique gold)
- AI pages must not mention NVIDIA

## Known gaps / honesty rules

- No fabricated PnL or USD when tickers missing → show Unavailable / note
- SSI AUM often null from official snapshot
- Official SSI Base contract addresses still pending
- Optional `VITE_REOWN_PROJECT_ID` for WalletConnect

## Deploy notes

- Render API auto-deploys from `main`; restore env via `scripts/restore-render-env.mjs` if PUT wiped secrets
- Vercel FE: `node scripts/deploy-vercel.mjs` (token: `vercal_token` / `VERCEL_TOKEN`)
- **Vercel Root Directory must be `frontend`** — Git deploys from monorepo root will fail with `pnpm -r build`
- Git push: `node scripts/push-github.mjs` (`GITHUB_TOKEN`)
- CORS/SIWE allow `*.vercel.app` + localhost

## Never invent

SoDEX EIP-712 domains, SSI Base addresses, shared house SoDEX keys, or mock market numbers.
