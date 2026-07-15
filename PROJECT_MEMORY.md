# HEIRLOCK — Project Memory

Last updated: 2026-07-15 03:25 UTC+3

## Mode

**Wave 5 — Continuity gate + full decision record + Memory collapse** — local only. **NO PUSH · NO DEPLOY** until exceptional.

Category sentence:

> *It kept thinking while you were away — re-scores your theses, debates itself, and only lets you approve after the Moderator speaks.*

## Research performed (this session)

- `PROJECT_MEMORY.md`, `MASTER_PRODUCT_PLAN.md` Vision B
- `guide_sodex_order.md` §19–21 — fill evidence mandatory, not relay HTTP 200
- SSI whitepaper §5.2 — allocate via official SSI app only
- ValueChain `WealthPolicy.mode()` — Guardian/Heir block execution

## Wave 5 implemented (local)

### Continuity as REAL approval gate
- `fo/continuity-gate.ts` — `evaluatePartnerApprovalGate()`
- Brief returns `policy` + `continuityGate`
- `GET /api/fo/partner/gate` — client pre-check
- Server rejects `POST /partner/decision` approve when Guardian/Heir/BLOCK/unavailable policy
- Partner UI: Policy · Continuity panel; **Approve disabled** until debate + Alive mode
- Approve **no longer auto-opens SSI** — records intent → Sign on Wealth

### Full debate persistence
- Schema: `debate_json`, `policy_json`, `fill_proof_json`, `signed_order_id` on `InvestmentDecision`
- Migration `20260715003000_partner_decision_record`
- Decision API accepts `debate` + `policy`; stores `livingLoopHash` via citation content hash
- Why pack returns `debate`, `fillProof`, `policy`

### Auto-learning from fills
- `fo/fill-learning.ts` — `applyFillToPartnerMemory()` after verified fill
- Wired into `sodex/fill-proof.ts` `applyFillEvidence()`
- Links pending approved decision → signed order; sets outcome HIT/STOP/DRIFT; runs learning engine
- `POST /api/fo/partner/decision/:id/link-order`

### Memory collapsed into Partner
- `/app/memory` redirects → `/app/living?learn=timeline`
- Learn section: tabs Timeline · Theses · What changed · Lessons
- Removed separate Memory nav link and duplicate Hypothesis card

## Tests executed

| Suite | Result |
|---|---|
| `fo/continuity-gate.test.ts` | **3/3 pass** |
| FO unit tests (debate, learning, pulse) | **13/13 pass** |
| API `pnpm typecheck` | **pass** |
| DB `prisma db push` | **synced** |

## Browser QA (Chrome, `0xf76e…71a3`)

| Area | Result |
|---|---|
| Policy · Continuity panel | **OK** — Mode Alive, cap $1, LIVE |
| Approve gated (no debate) | **OK** — disabled + message |
| Learn tabs (Memory collapsed) | **OK** — Timeline/Theses/Changed/Lessons |
| `/app/memory` redirect | **OK** → `?learn=timeline` |
| Pulse + falsify + radar | **OK** |
| Wallet connected | **OK** |

## Issues found / fixes

- Prisma generate EPERM while API dev server locks DLL (db push still succeeded)
- Duplicate API dev terminals cleaned earlier (EADDRINUSE)

## Remaining work (before exceptional)

1. Persist debate automatically when debate endpoint runs (not only on decision POST)
2. Wire Wealth trade UI to `link-order` after approve
3. Narrative timeline visualization (weeks)
4. Frontend tests for Partner journey
5. Full 6/6 citation stability under load (saw 1/6 transient in QA)
6. Production push/deploy after user green light

## Next task

- Auto-link approve → Wealth sign flow with `decisionId` in session
- Persist debate on `POST /partner/debate` for audit trail
- Continuity page live mode flip demo for Guardian block

## Explicit

- **No push this session**
- **No deploy this session**
- Local: API `:10000` · Web `:8080`
- When exceptional: `node scripts/push-github-safe.mjs` (GITHUB_TOKEN from `.env`)
