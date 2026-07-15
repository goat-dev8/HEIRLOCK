# HEIRLOCK — Project Memory

Last updated: 2026-07-15 04:00 UTC+3

## Mode

**RELEASE CANDIDATE — SHIPPED**

Category sentence:

> *It kept thinking while you were away — re-scores your theses, debates itself, and only lets you approve after Continuity and the Moderator agree.*

## Deployed

| Surface | URL | Evidence |
|---|---|---|
| API | https://heirlock-api.onrender.com | `/api/health` 200 ok |
| Web | https://getheirlock.vercel.app | Partner live, wallet connected |
| Git | `main` @ `9e746ea` | pushed via `GITHUB_TOKEN` |

## RC milestones completed

- Approve → Sign `decisionId` handoff
- Debate persistence on debate endpoint
- Continuity gate + fill learning + Memory collapse (prior waves)
- DB migrations + schema integrity
- Local Chrome QA + Production Partner QA
- Render build fix (TS2345 living-portfolio)
- `RELEASE_REPORT.md`

## Tests / QA

- API tests 67/67; typecheck/build pass
- Production smoke: health, contracts, Partner pulse/gate/learn

## Remaining (non-blocking)

- SSI token citation flake (DexScreener)
- Deeper FO tool-call AgentLog traces
- Guardian-role key separation staging demo

See `RELEASE_REPORT.md` for full evidence and readiness score **8.4/10**.
