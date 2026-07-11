# HEIRLOCK

AI Finance OS / Family Office backend for the SoSoValue Buildathon.

**Stack:** Fastify · Prisma · Supabase · Upstash Redis · SoDEX · NVIDIA AI · ValueChain

## Architecture (backend)

- Per-user non-custodial SoDEX trading (SIWE → JWT → Enable Trading → EIP-712 relay)
- Mainnet trades hard-capped at **≤ 1 USDC**
- Local `SODEX_*` keys are **test wallet only** — never a shared house account
- ValueChain contracts: WealthPolicy, ModeController, ActionLog, AttestationRegistry, ContinuityNFT, FeeCollector

## Monorepo

| Path | Package |
|---|---|
| `apps/api` | Fastify API |
| `frontend` | React / TanStack Start web client (Vercel) |
| `packages/config` | Shared env + runtime config |
| `packages/sodex-signing` | EIP-712 / transferAsset signing |
| `packages/ai-provider` | NVIDIA + fallbacks |
| `contracts` | Foundry Solidity |

## Quick start (local)

```bash
corepack enable
pnpm install
cp .env.example .env   # fill secrets locally — never commit .env
pnpm --filter @heirlock/config build
pnpm --filter @heirlock/sodex-signing build
pnpm --filter @heirlock/ai-provider build
pnpm --filter @heirlock/api exec prisma generate
pnpm --filter @heirlock/api exec prisma migrate deploy
pnpm --filter @heirlock/api dev
```

Health: `GET /api/health/live`

## Production (Render API + Vercel frontend)

### API — Render
Blueprint: [`render.yaml`](./render.yaml)

- **Service:** `heirlock-api` (Node web service, free plan)
- **URL:** https://heirlock-api.onrender.com
- **Health check:** `/api/health/live`
- Secrets via Render env vars — never committed

### Web — Vercel
- **Live:** https://heirlock-os.vercel.app (also https://heirlock-beta.vercel.app)
- Project: `heirlock` · deploys from `frontend/`
- Env: all `VITE_*` keys from `frontend/.env` (synced via `node scripts/deploy-vercel.mjs`)
- Framework: TanStack Start + Nitro `vercel` preset

Redeploy:
```bash
node scripts/deploy-vercel.mjs
```

## License

Private — SoSoValue Buildathon submission.
