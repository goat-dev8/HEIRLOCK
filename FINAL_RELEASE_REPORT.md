# HEIRLOCK — Final Release Report

**Date:** 2026-07-15  
**Mode:** Product polish complete → ship  
**Wallet QA:** MetaMask `0xf76e…71a3` · ValueChain Testnet

## Verdict

HEIRLOCK no longer presents as an internal admin cockpit. The Partner home tells a continuous journey — what changed while away, debate, choose, sign, verify, learn — with larger typography, human copy, and animated story diagrams.

**Readiness:** ~8.8/10 (product polish + prior RC substance)

## What shipped in this polish pass

### Experience
- Story-led Partner hero (“While you were away”)
- Animated Partner journey (desktop SVG + mobile vertical steps)
- Evidence flow diagram (Market → Memory → Debate → You → Chain)
- Density cuts: digest cards, collapsed portfolio/radar, Learn tabs reduced
- First-run wizard fixed for returning wallets (address-keyed dismiss)
- Humanized jargon across Partner, Continuity, Wealth, Trading, Settings

### Typography & motion
- Base type ~16.5px, readable body line-height
- Panel/Stat scale up; fade-rise page presence; debate thinking dots

### Trading
- Markets default to priced pairs; “All” toggle
- Wallet-sign copy (no EIP-712 footer shout)
- Human capability badges and order titles

## Local Chrome QA

| Surface | Result |
|---|---|
| Partner | Journey + evidence flow; Challenger style; debate runnable |
| Wealth holdings | Balances LIVE; history capped |
| Wealth trade | Priced markets; prepare/sign copy human |
| Continuity | Alive mode; human role language |
| Settings / Research / Contracts | Product heroes |

API health local: `ok` (DB + Redis). Occasional `EADDRINUSE` from watch restarts is non-blocking while the bound process stays healthy.

## Production targets

| Surface | URL |
|---|---|
| Web | https://getheirlock.vercel.app |
| API | https://heirlock-api.onrender.com |

## Known non-blockers

- SSI token citation flake (DexScreener)
- Deeper FO AgentLog traces
- Guardian-role key separation staging demo
- Debate latency depends on LLM provider

## Ship checklist

- [x] Polish UX to premium financial-product bar
- [x] Local browser QA with connected wallet
- [x] `PROJECT_MEMORY.md` updated
- [x] Push via `scripts/push-github-safe.mjs` + `.env` `GITHUB_TOKEN`
- [ ] Deploy Vercel + Render
- [ ] Production smoke after deploy
