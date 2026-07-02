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

## Production (Render)

Blueprint: [`render.yaml`](./render.yaml)

- **Service:** `heirlock-api` (Node web service, free plan)
- **Build:** monorepo install + package builds + Prisma generate + API build
- **Start:** `prisma migrate deploy` then `pnpm start`
- **Health check:** `/api/health/live`
- Secrets are injected via Render env vars — not committed to git

## Safety

- Do not commit `.env`, private keys, or deployment tokens
- Do not treat local SoDEX keys as production trading identity
- Frontend is out of scope until backend DoD is complete

## License

Private — SoSoValue Buildathon submission.
