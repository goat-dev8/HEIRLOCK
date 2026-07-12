# HEIRLOCK — Project Memory

Last updated: 2026-07-12 (Winning plan shipped `1a54a73`)

## Mode

`WINNING_EXECUTION_PLAN.md` implemented (P0–E core). Pushed to GitHub. Vercel FE redeployed.

## Live surfaces

| Layer | URL |
|---|---|
| API | https://heirlock-api.onrender.com |
| Web | https://heirlock-os.vercel.app |
| Judges | /app/judges |
| Living Loop | /app/living |
| Track | /app/track |
| SSI Skill | /app/ssi |

## Completed this session (plan IDs)

- **P0** Identity lock in WINNING_EXECUTION_PLAN + README  
- **A1–A4, A6** SSI dual-source, % fix (no FE double×), whitepaper contracts, Allocate UX, DataBadge  
- **A5** Portfolio nested balances unwrap (prior commit; keep)  
- **B1–B5** Living Loop API+UI, /judges, fill proof tray, preflight, /diag skills+ssi matrix  
- **B6** README judge/demo script  
- **C1, C3, C4** FO Brief API, /track + outcomes PENDING, track on place  
- **D1–D4** Guardian simulate, Skills messaging, IA (sidebar OS group), landing rewrite  
- **E1–E3** Macro/ETF/Feeds in Living Loop; Brief optional modules; SSI allocate/earn links  

## SSI whitepaper addresses (Base) — do not invent beyond these

Tokens: MAG7.ssi `0x9E6A46f2…403B55`, DEFI.ssi, MEME.ssi, USSI.  
Protocol: swap, factory, issuer, rebalancer, feeManager, stakeFactory, assetLocking.  
ResearchHubVoting: null until official.

## Data honesty

- OpenAPI `ssiMAG7` price = **Terminal index level**  
- MAG7.ssi ERC-20 = **token** (~$0.42 class)  
- `change_pct_24h` fraction → percent points **once** in API; FE must not ×100 again  
- AUM often missing on Terminal snapshot  

## Never invent

SoDEX EIP-712 domains, ResearchHubVoting address, house SoDEX keys, mock markets.

## Deploy

- Vercel rootDirectory=`frontend`; engines node `24.x`  
- Push: `node scripts/push-github.mjs`
