# HEIRLOCK — Product Audit (Buildathon Review Mode)

> **Mode:** Product Review & Competitive Redesign — **no feature code in this pass**.  
> **Date:** 2026-07-12  
> **Sources:** `PROJECT_MEMORY.md`, `PROJECT_REDESIGN.md`, `docs/GUIDE.md`, `IMPLEMENTATION_PLAN.md`, `docs/SODEX_USER_FLOW_GUIDE.md`, `projects.md` (30 Wave 2 entries), official SoSoValue / SoDEX / SSI / whitepaper docs, live probes of OpenAPI + BaseScan.  
> **Status:** Awaiting founder approval of `WINNING_EXECUTION_PLAN.md` before any implementation.

---

## 1. Current score — **58 / 100**

| Dimension (judge-weighted) | Score | Notes |
|---|---:|---|
| User value & daily utility | 11/20 | Living FO exists as pages, not as a closed daily loop |
| Functionality & working demo | 13/20 | Real SIWE, aid verify, SoDEX relay, portfolio marks — but SSI data semantics wrong; no `/judges` path |
| Logic / workflow / product design | 10/15 | Story is OS + FO; UX is still a multi-page dashboard with warnings as product |
| Data / API integration | 9/15 | SoDEX strong; SoSoValue client exists but living loop underuses modules; SSI OpenAPI ≠ on-chain token |
| UX & clarity | 8/15 | Honest Unavailable is good; SSI page looks unfinished; nav sprawl; no 60s judge path |
| Differentiation vs Wave 2 bar | 7/15 | Continuity/Skills OS narrative unique; shipped proof does not yet beat Mosaic/Sonar/sosomind on demo |

**Verdict:** Strong engineering foundation for a SoSoValue-native OS. **Not yet a Wave-winning product.** Wave 2 winners average ~72–82 on judge dimensions with explicit Research → Risk → Act → Prove loops. HEIRLOCK has the architecture docs of a winner and the live surface of a mid-pack “dashboard + chat + deep links.”

---

## 2. Judge perspective

Judges will ask, in order:

1. **Is this what SoSoValue asked for?** Research → insight → action on Terminal + SSI + SoDEX + ValueChain.  
2. **Can I verify it in 60–90 seconds without a walkthrough call?** (`/judges`, `/diag`, `/track`, live order ID).  
3. **Is every number real?** LIVE vs DEMO badges; no invented NAV/AUM/addresses.  
4. **Why not Mosaic / Sonar / sosomind?** One sentence that sticks.  
5. **Does removing SoSoValue kill the product?** Portability smell = loss.

**Predicted deliberation lines if demoed as-is:**

- “Nice OS story, but where is the living Research→Confirm→Fill loop?”
- “SSI shows $11.36 and ‘Unavailable’ AUM while the official MAG7.ssi page shows ~$0.42 and $74M TVL — which is real?”
- “The yellow banner is an apology, not a feature.”
- “Family Office AI is a chat window, not a cited agent with outcomes.”
- “Skills and Continuity feel like settings pages, not the wow.”
- “sosomind already claimed ‘Finance OS’ — prove governance + continuity, not breadth.”

**What they will respect today:**

- Non-custodial per-user SoDEX relay (SIWE → Enable Trading → aid → EIP-712 → relay).
- Honesty rules (no invented router addresses; Unavailable when data missing).
- Mainnet-limited policy cap narrative.
- Real portfolio balances after envelope unwrap fix (once API redeployed).

---

## 3. Weak points

1. **Story–surface gap.** Docs say AI Finance OS + life-cycle FO. UI is Portfolio / Trading / SSI / Chat / Skills toggles — a capable app shell without a single inevitable loop.
2. **SSI semantic mismatch (critical).** OpenAPI index `ssiMAG7`/`ssimag7` returns **index level NAV ~$11.36** and ROI fields. Official SSI app / BaseScan MAG7.ssi token trades ~**$0.42** with **TVL ~$70M+**. HEIRLOCK labels OpenAPI `price` as “NAV / PRICE” next to deep-links to the SSI buy page — judges will call this broken or misleading.
3. **24h change display likely wrong.** Live `change_pct_24h: -0.0032` (= −0.32%). UI showed **−32%** — double percent conversion / formatting bug. Destroys trust instantly.
4. **AUM “Unavailable” next to wrong price.** Official product has TVL; OpenAPI snapshot for indices does **not** expose AUM. Showing Unavailable is honest for that endpoint — but pairing it with index-level price without clarifying “OpenAPI index level ≠ on-chain MAG7.ssi” looks incomplete.
5. **No Wave-2 table stakes:** `/judges`, `/track` (NAV vs buy-hold + HIT/STOP/DRIFT), LIVE/DEMO badges, order-ID proof tray, judge video script.
6. **AI under-delivers.** Family Office AI is conversational; winners ship tool-cited diagnostics, risk gates that LLM cannot override, and outcome trackers.
7. **SoSoValue as decoration risk.** Client covers ETF/news/macro/fundraising; default living path does not force a multi-module brief → gate → act story.
8. **IA sprawl.** Wealth + Intelligence + Platform + System + Ecosystem links compete; first viewport does not scream one job.
9. **Continuity moat is dormant.** Alive → Guardian → Heir is the differentiator vs Mosaic/Sonar; demo time still spent on empty SSI warnings.
10. **Positioning collision.** “Finance OS” is already occupied rhetorically by sosomind. Without a sharper hook (*wealth continuity OS* / *family office that never dies*), HEIRLOCK reads as “another agentic SoSo dashboard.”

---

## 4. Missing innovation

Shipable innovation HEIRLOCK claims but does not yet **show**:

| Claimed moat | Wave-2 proof pattern | HEIRLOCK today |
|---|---|---|
| Skills OS + Permission Kernel | Toggle Skill → agent tools disappear live | Skills page exists; not a demo beat |
| Alive / Guardian / Heir | ModeController transition in <60s | Continuity page; not the hero loop |
| Policy-gated Family Office | Confirm rebalance → fill → ActionLog | Trading exists; not FO-orchestrated |
| Dual-yield SSI→Vault path | One path touching SSI + SoDEX + points | Deep-link only |
| Verifiable FO track record | `/track` with citations | Missing |

**Innovation that is real but under-leveraged:** non-custodial multi-user relay + WealthPolicy notional caps. Keep it; make it the spine of the demo, not a footnote.

---

## 5. Missing story

**Required story (from `PROJECT_REDESIGN.md`):**  
*AI Finance OS. On-chain.* → Family Office app manages wealth while alive → guards when you can’t → delivers when you’re gone.

**Current story users feel:**  
Connect wallet → verify SoDEX → look at balances → glance at SSI with a warning → maybe chat AI → maybe place a $1-capped trade.

**Gap:** Inheritance/continuity is emotionally strong but Buildathon-scoring weak if it is the homepage. Living loop is scoring-strong but product-weak if it is not demoed. HEIRLOCK currently demos neither at winner quality.

**Sticky one-liner needed (not yet earned on-screen):**  
> Mosaic builds the basket. Sonar runs a fund. HEIRLOCK is the family office OS — with modes for when you can’t click confirm.

---

## 6. Missing AI value

| Winner pattern | HEIRLOCK gap |
|---|---|
| Tool-use with cited numbers (Edgework, Helix) | Chat without mandatory SoSo tool receipts |
| Deterministic risk before LLM (Bloom Sentinel, TradeFirewall) | Policy caps exist; no preflight theater in UX |
| Outcome tracking HIT/STOP/DRIFT (sosomind, sosovault, Consilium) | Missing |
| Weekly FO brief as forwardable artifact | Missing |
| Debate only for high stakes | Not productized |

**Do not** add more agents for breadth. **Do** make one Living Loop agent path: Research (SoSo tools) → Risk gates → Propose SSI/SoDEX action → Confirm → Prove.

---

## 7. Missing SoSoValue integration

**Have:** OpenAPI client, ETF/news routes, index list/snapshot/constituents, diag probes.  
**Missing for judges:**

- Living loop that **must** hit ≥5–6 modules (Currency, Index, ETF, Feeds, Macro, + one of Stocks/Treasuries/Fundraising/Analysis).
- Evidence chips on every recommendation (endpoint + timestamp).
- Stale-data / fail-closed behavior when feeds degrade.
- Public `/diag` matrix Skill → pillar (partial health page ≠ Mosaic `/diag`).

Whitepaper framing: Terminal → SSI → SoDEX → ValueChain as **one stack**. HEIRLOCK must make that stack visible in one demo minute.

---

## 8. Missing SSI integration

### Official address review (do not invent)

| Asset | Status | Address / note |
|---|---|---|
| $SOSO on Base | **Verified** (docs + BaseScan) | `0x624e2e7fdc8903165f64891672267ab0fcb98831` |
| $SOSO on Ethereum | **Verified** | `0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d` |
| MAG7.ssi ERC-20 (Base) | **Verified on BaseScan** as SoSoValue MagSeven Index Token | `0x9E6A46f294bB67c20F1D1E7AfB0bBEf614403B55` |
| Router / mint router | **Not published** in GitBook / whitepaper / SSI support as a single canonical address | Deep-link mint/buy on `ssi.sosovalue.com` |
| Staking / Earn contracts | **Not published** as canonical addresses in official docs | Deep-link Earn / Reward |
| ResearchHubVoting | Contract **exists in SSI protocol repo**; **deployed Base address not documented** for product use | Do not hardcode until official |

**Internal ref (`03_SSI_PROTOCOL_MASTER_REFERENCE.md` §5.1):** exact protocol addresses are intentionally not listed in docs; discover via SSI app tx or BaseScan — HEIRLOCK policy remains: **no invented router/staking/voting**.

### Product implication

- **Do** surface verified **token** addresses (SOSO, MAG7.ssi) with BaseScan links when used for portfolio/read-only.
- **Do not** pretend mint/stake/vote works in-app without verified router/staking/voting.
- **Redesign UX:** turn the yellow apology into a deliberate **“SSI Allocate via Official App”** skill step: HEIRLOCK owns research + weights + SoDEX proxy trading; SSI app owns Base mint/stake. Make the handoff the feature (Kinetic/Mosaic honesty pattern).

### Data implication

- Label OpenAPI `ssiMAG7` as **Index level (SoSoValue Terminal)**, not “token price.”
- Pair with **on-chain MAG7.ssi** mark from SoDEX symbol / Base where available (~$0.42 class).
- Pull TVL/holders only from sources that actually return them (SSI app Onchain Data / verified token metrics) — never invent from empty snapshot fields.
- Fix 24h % formatting.

---

## 9. Missing SoDEX integration

**Have (strong):** verify aid, portfolio unwrap, tickers→USD marks, symbols merge, orderbook, EIP-712 prepare/place path, mainnet/testnet switch, notional policy.

**Missing vs winners:**

| Gap | Why judges care |
|---|---|
| Fill proof tray (order ID → SoDEX Portfolio history) | ETFSignal / Guide §15 |
| Pre-trade risk theater (Approve / Caution / Block) | TradeFirewall / Bloom |
| Outcome tracker after fills | Consilium / sosovault |
| Optional vault / SoPoints narrative (deep-link OK) | Dual-yield demo beat |
| Judge-visible mainnet-limited fill archive | Demo insurance |

HEIRLOCK should **not** try to out-terminal SoVibe. It should out-**govern** execution: policy → confirm → relay → proof → continuity modes.

---

## 10. UX problems

1. SSI page leads with chain IDs and an unfinished banner — engineer UI, not FO UI.  
2. “Unavailable” without teaching the dual-source model (Terminal index vs on-chain token).  
3. No single **Alive dashboard** that sequences Research → Proposal → Act.  
4. Nav groups (Wealth / Intelligence / Platform / System) fragment the story.  
5. Chat AI competes with Research instead of consuming it.  
6. Onboarding is checklist-correct but not emotional or demo-tight.  
7. Missing `/judges` unattended path (Wave 2 universal).  
8. Continuity / Skills feel secondary when they are the moat.  
9. Ecosystem outbound links in sidebar dilute “SoSoValue is the hero.”  
10. Landing claims OS + modes; app does not deliver a 60-second proof of either.

---

## 11. Opportunities to beat previous winners

| Winner | They own | HEIRLOCK beat path |
|---|---|---|
| **Edgework** | Trader PNL decompression | Own **insight → governed Act + FO portfolio**; don’t compete on slicers |
| **Mosaic** | Thesis → basket → backtest + `/judges` | Match judge UX; **win on real non-custodial fill + continuity modes** |
| **Sonar** | Verifiable agentic fund + citations | Match `/track` bar; **add Guardian/Heir they lack** |
| **sosomind** | Breadth “Finance OS” + MCP | **Narrower, clearer FO + policy honesty**; avoid feature sprawl |
| **sosovault / ThesisX / Prism** | Index/fund managers | Same lane — win on **reliability, mainnet clarity, dual SSI/SoDEX handoff** |
| **Helix / ETFSignal / POD** | News/ETF alpha | Borrow evidence UX; stay FO frequency, not day-trade |
| **TradeFirewall** | Pre-trade risk | Absorb as Risk Skill theater inside Act |

**Category white space still empty:** multi-mandate **family office** with **Alive / Guardian / Heir** and **Skills permission kernel** on SoSoValue. No Wave 2 winner fully owns that. HEIRLOCK loses if it demos as “yet another research→trade agent.”

---

## 12. Prioritized redesign roadmap (summary)

Full task list with impact ranking: **`WINNING_EXECUTION_PLAN.md`**.

**P0 — judging impact (do first):**  
Clarify SSI dual-source truth + fix % bug · Living Loop demo spine · `/judges` + `/diag` + fill proof · `/track` skeleton · Risk preflight theater · Story/IA compression · Official-app SSI Allocate as intentional feature.

**P1 — separation:**  
Weekly FO brief · HIT/STOP/DRIFT · Guardian simulation wow · Skills toggle demo · Verified MAG7.ssi token display · SoSo module evidence chips.

**P2 — moat polish (after P0/P1):**  
Estate sandbox · Yield/SoPoints planner deep-links · MCP optional · Marketplace ideas **last**.

---

## Competitive scorecard (HEIRLOCK vs top threats)

| Criterion | HEIRLOCK now | Mosaic | Sonar | sosomind | Target after plan |
|---|---:|---:|---:|---:|---:|
| Demo in 90s | 3 | 9 | 8 | 7 | 9 |
| Real SoDEX loop | 7 | 5 (sim) | 8 | 6 (testnet) | 9 |
| SoSo depth in path | 4 | 8 | 8 | 9 | 8 |
| SSI honesty / clarity | 3 | 7 | 8 | 7 | 9 |
| AI with citations/outcomes | 3 | 7 | 9 | 8 | 8 |
| Continuity / FO moat | 5 (claimed) | 2 | 3 | 3 | 9 |
| Judge trust UX | 4 | 9 | 8 | 8 | 9 |

---

## SSI redesign principle (approved direction, pending build)

> **HEIRLOCK is the Family Office brain and SoDEX execution desk.  
> The official SSI app is the Base mint / stake / earn venue.  
> We display only verified token addresses and Terminal index analytics.  
> The handoff is the product — not a missing contract.**

---

## Gate

**Do not implement UI or features until `WINNING_EXECUTION_PLAN.md` is approved.**  
This audit freezes critique; the execution plan freezes priority order.

*End of PRODUCT_AUDIT.md*
