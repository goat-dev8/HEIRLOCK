# HEIRLOCK — Project Memory

Last updated: 2026-07-15 03:40 UTC+3

## Mode

**RELEASE CANDIDATE** — closing remaining Partner → Sign → Fill gaps; push + deploy after green local QA.

Category sentence:

> *It kept thinking while you were away — re-scores your theses, debates itself, and only lets you approve after Continuity and the Moderator agree.*

## Research performed

- `PROJECT_MEMORY.md`, `MASTER_PRODUCT_PLAN.md` Phases 1–5
- `guide_sodex_order.md` §19–21 fill evidence (not HTTP 200)
- SSI allocate via official app only; ValueChain WealthPolicy mode gate

## RC implementation (this session)

### Approve → Wealth → Sign with decisionId
- `frontend/src/lib/partner-handoff.ts` — sessionStorage decisionId
- Living Approve/Debate stores decisionId; Sign link passes `?decisionId=`
- Wealth search schema accepts `decisionId`; TradingWorkspace passes to place
- `POST /api/sodex/orders/place` accepts `decisionId` → `linkDecisionToOrder`
- Client also calls `POST /partner/decision/:id/link-order` after place

### Debate persistence on debate endpoint
- `POST /api/fo/partner/debate` writes InvestmentDecision audit row with full `debateJson` + policy
- Returns `debateDecisionId`

### Narrative timeline + polish
- Learn Timeline grouped by week
- Pulse deltas formatted (no float noise like `0.059999…`)

### DB
- `prisma migrate deploy` — no pending; all 3 migrations applied
- Schema integrity: `debate_json`, `policy_json`, `fill_proof_json`, `signed_order_id` present

## Tests

| Suite | Result |
|---|---|
| FO unit tests | **14/14 pass** |
| Full API `pnpm test` | **67/67 pass** |
| API typecheck | **pass** |
| Decision schema integrity | **ok** |

## Browser QA (Chrome, `0xf76e…71a3`, ValueChain Testnet, 20.45 SOSO)

| Area | Result |
|---|---|
| Partner pulse 6/6 LIVE | **OK** |
| Policy · Continuity Alive / Approve gated | **OK** |
| Learn week timeline | **OK** |
| Continuity ActionLog + Guardian UI | **OK** |
| Wealth Trade ticket EIP-712 | **OK** |
| Drift formatting | **OK** (`0.1200`) |

## Explicit next

- Push via `scripts/push-github-safe.mjs`
- Deploy Render + Vercel
- Post-deploy production QA
- `RELEASE_REPORT.md`
