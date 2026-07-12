# HEIRLOCK — PROJECT REDESIGN

> **Status**: Awaiting co-founder approval. Do not implement until approved.
>
> **Mandate**: Transform HEIRLOCK from a crypto inheritance platform into the best AI financial agent on SoSoValue — an **AI Financial Operating System** whose default application is an AI Family Office / Wealth Continuity Platform. Inheritance is one Skill, not the product.
>
> **North star**: If a judge can say "this could run on another chain," we failed. SoSoValue Terminal + SSI + SoDEX + ValueChain + $SOSO must be load-bearing, not decorative.
>
> **Hook (3–5 words)**: *AI Finance OS. On-chain.*
>
> **Positioning**: For crypto holders who treat digital assets as generational wealth, HEIRLOCK is the **AI Financial Operating System** for SoSoValue — a modular Skill platform whose flagship application is an AI Family Office that researches, allocates, executes, protects, and — only if needed — transfers that wealth. Unlike Mosaic (thesis baskets) or Edgework (trader analytics), we own the full life-cycle OS: living → inactive → deceased, with pluggable Skills for research, risk, SSI, SoDEX, yield, treasury, guardian, estate, and tax.

---

## 0. Executive Verdict

**Current HEIRLOCK will not win first place.**

It is a strong *idea* in an empty category, but it is misaligned with what SoSoValue and AKINDO are actually funding: **agentic research → insight → execution products** that make Terminal + SSI + SoDEX feel inevitable.

Inheritance is emotionally powerful. It is also a product that delivers almost no daily value, fights adoption psychology ("don't make me think about death"), and forces legal/KYC complexity that Wave timelines punish.

**The winning move**: keep the inheritance moat as the *terminal state*, rebuild the product as a living AI Family Office, and elevate the whole stack into an **AI Financial Operating System** — a Platform Layer with enable/disable Skills (Research, Portfolio, Risk, SSI, SoDEX, Yield, Macro, Treasury, Guardian, Estate, Tax, Execution). Death becomes the Estate Skill. Life becomes the default Skill set. The OS makes HEIRLOCK feel like infrastructure SoSoValue itself would ship.

---

## 1. Judge Review

### 1.1 How this Buildathon actually scores

Official workshop language (Luma / SoSoValue kickoff):

- Strong submissions show **clear user value**, a **real use case**, and a **complete flow: input → insight → action**.
- Ecosystem deep dive centers on **Terminal + SSI + SoDEX + ValueChain** as one closed loop.
- Explicit build targets: Signal-to-Execution Agents, AI Research Assistants, Smart Trading Dashboards, Opportunity Discovery Engines, Automated Strategy Bots.
- Evaluation is **multi-wave, milestone-based, progress-oriented** — not a one-shot demo day.

Internal HEIRLOCK.md scoring weights (User Value 30 / Functionality 25 / Workflow 20 / API Integration 15 / UX 10) are directionally useful, but the *content* of those scores must map to the workshop mandate above.

### 1.2 What Wave 1–2 winners taught us

| Project | Why it scored | What HEIRLOCK currently lacks vs them |
|---|---|---|
| **Edgework** (Wave 1) | Live trader PNL, smart-money consensus, counterfactual equity — daily utility | No daily trading / analytics loop |
| **Mosaic** (Wave 2) | Thesis → basket → backtest; `/judges` + `/diag` reviewer UX | Inheritance has no "thesis" loop for the living |
| **sonar** | ETF → thesis → SSI rebalance → SoDEX perps hedge; verifiable track record | HEIRLOCK only rebalances on death |
| **Consilium** | Multi-agent hedge fund; EIP-712 SoDEX testnet; paper/live modes | HEIRLOCK agents are death-path only |
| **SignalForge** | Scan → Analyze → Signal → Match with hard verification gates | No gated research→trade pipeline while alive |
| **Prior agentic terminals / vault agents** | Dense API coverage + agentic fund management | HEIRLOCK claims 8 modules but uses them as *death sensors*, not *living alpha* |

### 1.3 Brutal judge read of current HEIRLOCK

| Criterion | Current score (honest) | Why |
|---|---|---|
| User Value | 6/10 | Real problem ($140B dead crypto), but **zero daily value** for 99.9% of product lifetime |
| Innovation | 7/10 | Category empty — but category is orthogonal to Buildathon wishlist |
| Technical Difficulty | 7/10 | EIP-712 + multi-agent + KYC is hard; legal templates are theater unless lawyer-stamped |
| AI | 5/10 | Agents mostly ping "are you alive?" — not research/execution intelligence |
| UX | 6/10 | Monte Carlo "what if I died" is memorable; onboarding is morbid |
| Integration | 6/10 | Lists 8 modules; most are optional overlays on a death trigger |
| Demo | 5/10 | 7-minute death simulation is emotionally heavy and easy to mock as "dead man's switch + KYC" |
| Business | 6/10 | AUM fee is real; CAC against death-aversion is brutal |
| **Ecosystem fit** | **4/10** | Could pitch half of this on Ethereum + CoinGecko + any DEX |

**Honest total vs first-place bar: ~52–58/80 equivalent. Not a winner.**

### 1.4 What judges will say in deliberation (predicted)

1. "Cool idea, but it's not what SoSoValue asked for."
2. "Where is the research-to-execution loop for a living user?"
3. "This is mostly Sumsub + email cron + a rebalance."
4. "Mosaic already owns portfolio construction; this is a side quest."
5. "Legal claims scare me — are they practicing law?"

---

## 2. Weakness Analysis

### 2.1 Structural weaknesses (fatal if unfixed)

1. **Value activation timing is wrong.** Product value peaks at death. Buildathon products must peak in the first 60 seconds of a demo.
2. **Mandate misalignment.** Workshop examples are all living-agent / research-execution. Inheritance is not on the list.
3. **Portability risk.** KYC, email attestation, PDF trusts, and Monte Carlo do not require SoSoValue. Judges smell this.
4. **Adoption psychology.** People avoid death UX. Retention for a check-in ping is weak vs a portfolio that makes money.
5. **Competitive crowding on the wrong axis.** Empty inheritance category ≠ empty *judging* category. Judging category is crowded with agentic funds.
6. **Legal surface area.** Multi-jurisdiction trust deeds in a Wave cycle is a liability, not a flex. One false claim = disqualification risk.
7. **AI is underused.** Current agents are workflow routers, not financial intelligence. SoSoValue's entire Terminal exists to feed AI — HEIRLOCK barely uses it for living decisions.
8. **Demo length / tone.** 7 minutes of escalation-to-death is long and dark. Winners ship <4 min, problem→wow→tech→ask.
9. **Self-score inflation.** 93/100 and 78% win probability are founder-delusion. Against Wave 2 bar (~82 avg for winners), current design is mid-pack at best.
10. **SOSO utility is cosmetic.** ≥30 SOSO fee discount (~pocket change) does not create token demand narrative judges reward.

### 2.2 Technical weaknesses

| Weakness | Impact |
|---|---|
| No continuous portfolio management while alive | Misses SSI Robo-Advisor + SoDEX execution scoring |
| No SoPoints optimizer | Misses SoDEX growth narrative |
| No Mirror Protocol story | Multi-chain wealth not unified into ValueChain |
| No Multi-Asset Margin / SOSO collateral optimization | Misses advanced SoDEX mechanics |
| Spot-only SAFE MODE | Fine for death; weak for living risk hedges |
| 90-day kline limit for Monte Carlo | Weak quant credibility |
| API key scoped only for death rebalance | Living agent needs continuous, permissioned execution |
| Fundraising / Analysis Charts / Token Economics unused | Leaves modules on the table |
| ResearchHubVoting as "Wave 3 stretch" | Governance is under-used by all competitors — should be core |
| No verifiable track record page | sonar's `/track` pattern is now table stakes |

### 2.3 Narrative weaknesses

- Tagline *"Your crypto survives you"* wins emotion, loses Buildathon frame.
- Framing vs Mosaic ("they build for the living, we preserve for the dead") accidentally admits we have no living product.
- BTC Treasuries "unique angle" is niche vanity — not a demo centerpiece.
- TRUST-NFT social flex is weak vs live PNL / live rebalance / live research brief.

---

## 3. Missed Opportunities

### 3.1 Opportunities the current design leaves on the table

1. **Become the default AI layer on top of SoSoValue Terminal** — there is no public LLM API; builders must bring their own. That gap *is* the product.
2. **SSI as the native portfolio primitive** — not just a death wrapper. Living allocation across MAG7.ssi / DEFI.ssi / MEME.ssi / USSI with confirm-before-execute.
3. **Closed-loop agent** — perception (9 API modules) → reason (multi-agent) → action (SoDEX EIP-712) → settle (ValueChain audit) → earn (SSI Earn + Vault dual yield + SoPoints).
4. **Yield stack optimizer** — SSI Points + SOSO boost + sMAG7.ssi Vault dual yield + SoDEX fee tiers + SoPoints from vault holdings.
5. **Macro / ETF / news gated execution** — SignalForge-style verification gates, but for family-office rebalances (not day trades).
6. **Crypto Stocks + BTC Treasuries as portfolio context** — MSTR/COIN exposure in net-worth + risk model for living users, not only "exec settlors."
7. **Mirror Protocol onboarding** — "Bring BTC/ETH/USDC from anywhere → ValueChain → HEIRLOCK-managed SSI book."
8. **Guardian Mode as the bridge** — inactivity is a *product state* with living value (risk freeze), not just a countdown to death.
9. **Weekly Family Office Brief** — the demo artifact judges can forward: one page, cited to SoSoValue endpoints, with recommended actions.
10. **ResearchHubVoting as product feature** — propose / vote for `TREASURY.ssi` or `STABLE.ssi` as continuity wrappers; HEIRLOCK becomes a governance actor.
11. **Verifiable performance** — every recommendation and fill linked to SoSoValue snapshot hash + SoDEX order ID + ValueChain log.
12. **SOSO as operating capital** — gas on ValueChain, fee discount tiers matching SoDEX schedule (up to 40%), multi-asset collateral, SSI boost — one token, four utilities inside one product.

### 3.2 Opportunities competitors already own (do not fight head-on)

| Competitor owns | HEIRLOCK response |
|---|---|
| Day-trading alpha (Edgework, SignalForge) | We are **family office**, not prop desk — lower frequency, higher AUM, continuity |
| Thesis baskets (Mosaic) | We **operate** the basket continuously + protect it across life states |
| Agentic hedge fund (sonar, Consilium) | We add **Guardian + Heir** states they don't have — full life-cycle OS |

**Differentiation sentence**: *They optimize the next trade. We optimize the next decade — and the transfer after it.*

---

## 4. Competitive Advantage

### 4.1 Positioning statement

> For crypto-native individuals and families who hold a material share of net worth on-chain, **HEIRLOCK** is an **AI Financial Operating System** for the SoSoValue ecosystem — a modular Skill platform whose flagship application is an **AI Family Office / Wealth Continuity** layer that researches markets through SoSoValue, allocates into SSI indexes, executes on SoDEX, and automatically protects or transfers wealth across Alive → Guardian → Heir states. Unlike Mosaic or Consilium, we are not only a portfolio builder or trading agent — we are the **finance OS that never sleeps, and never dies with you**.

### 4.2 Moat stack (must all be true)

1. **Platform Layer (Skills OS)** — enable/disable modular Skills; Family Office is the default app, not a monolith. No competitor ships an OS abstraction on SoSoValue.
2. **Life-cycle state machine** — Alive / Guardian / Heir. No competitor has this.
3. **SoSoValue-native intelligence** — 9 modules as the agent's only market brain (no CoinGecko crutch in the core path).
4. **SSI-native portfolio** — indexes are the unit of allocation, not random bags of coins.
5. **SoDEX-native execution** — EIP-712 spot (+ optional perps hedges) with vault dual yield.
6. **ValueChain-native audit** — every agent decision hashed on-chain.
7. **$SOSO-native economics** — fees, gas, boost, collateral, discounts.
8. **Continuity Skill (Estate)** — inheritance as the final Skill, not the pitch.

### 4.3 Why this is impossible without SoSoValue

| Capability | Why SoSoValue-only |
|---|---|
| Research brain | Terminal OpenAPI is the structured institutional feed |
| Portfolio vehicle | SSI Protocol indexes + Earn + ResearchHubVoting |
| Execution | SoDEX CLOB + Vaults + SoPoints on ValueChain |
| Settlement / gas | $SOSO native on ValueChain; WSOSO for EVM dApps |
| Bridge | Mirror Protocol for multi-chain → ValueChain unification |
| Compliance texture | SoDEX KYT/KYA on deposits/withdrawals |
| Skill runtime | Every Skill's tools bind to Terminal / SSI / SoDEX / ValueChain primitives — swapping the stack empties the OS |

If you remove any pillar, the product collapses. That is the design test.

### 4.4 Memory anchors for judges (engineer all three)

1. **Surprising primitive**: Skills OS + life-cycle state machine (Alive → Guardian → Heir) with on-chain audit.
2. **Polished demo**: Toggle Skills live → Living rebalance → Guardian freeze → Estate claim.
3. **Narrative hook**: *AI Finance OS. On-chain.*

### 4.5 OS vs app competitive frame

| Competitor type | They ship | HEIRLOCK ships |
|---|---|---|
| Signal / trade bots | One workflow | Skill graph + Family Office app |
| Portfolio builders | One basket UX | Portfolio + SSI + Yield + Risk Skills composed |
| Inheritance tools | One death path | Estate Skill on top of a living OS |
| Agentic funds | Fixed agent roster | User-configurable Skill set with mode permissions |

---

## 4A. Platform Layer — AI Financial Operating System

> This section extends (does not replace) the Family Office vision. The Family Office is the **default application**. The Platform Layer is the **runtime** that makes HEIRLOCK feel like SoSoValue infrastructure.

### 4A.1 Product vision (OS)

HEIRLOCK is an **AI Financial Operating System** built exclusively on SoSoValue:

```
┌─────────────────────────────────────────────────────────────────┐
│                    HEIRLOCK PLATFORM LAYER                      │
│              AI Financial Operating System (OS)                 │
│  Skill Registry · Permission Kernel · Event Bus · Audit Bus     │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ FLAGSHIP APP    │ │ SKILL MODULES   │ │ LIFE-CYCLE      │
│ AI Family Office│ │ (enable/disable)│ │ Alive/Guardian/ │
│ Wealth Continuity│ │ see catalog    │ │ Heir modes      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   SoSoValue Terminal    SSI Protocol      SoDEX + ValueChain
```

**Rules:**
- Skills are **built-in modules**, not separate products or third-party app stores (v1).
- Users **enable / disable** Skills per Wealth Policy.
- Disabled Skills cannot be invoked by agents (Permission Kernel enforces).
- Mode (Alive / Guardian / Heir) further restricts which Skills may act.
- Every Skill tool must map to a SoSoValue / SSI / SoDEX / ValueChain / $SOSO primitive.

### 4A.2 Built-in Skill catalog

| Skill | Default | Primary ecosystem binding | Family Office role |
|---|---|---|---|
| **Research Skill** | ON | Terminal Feeds, Analysis, Fundraising | Intelligence |
| **Portfolio Skill** | ON | Currency, Index, Crypto Stocks, balances | Net worth + drift |
| **Risk Skill** | ON | ETF, Macro, pairs depth, klines | Gates + VaR-lite |
| **SSI Skill** | ON | SSI mint/stake/redeem, Index API | Allocation vehicle |
| **SoDEX Skill** | ON | Spot/Perps REST+WS, Vaults, SoPoints | Execution venue |
| **Yield Skill** | ON | SSI Earn, SOSO boost, sMAG7 Vault, fee tiers | Earn stack |
| **Macro Skill** | ON | `/macro/events`, ETF flows | Calendar / regime |
| **Treasury Skill** | OFF→ON for advanced | BTC Treasuries + Crypto Stocks | Equity-beta / corp BTC overlay |
| **Execution Skill** | ON | EIP-712 SoDEX + confirm UX | Order path |
| **Guardian Skill** | ON | ModeController + notifications | Inactivity protection |
| **Estate Skill** | ON (dormant until Heir) | Continuity contracts + KYC | Inheritance |
| **Tax Skill** | ON at claim / monthly | ActionLog + klines + templates | Reports |

These are **not** separate products. They are modules inside one HEIRLOCK binary / monorepo, toggled in Settings → Skills.

### 4A.3 Skill contract (implementation shape)

Every Skill implements:

```
SkillManifest {
  id, name, version,
  defaultEnabled,
  requiredPillars: ['sosovalue'|'ssi'|'sodex'|'valuechain'|'soso'][],
  allowedModes: ['ALIVE'|'GUARDIAN'|'HEIR'][],
  tools: ToolSpec[],          // JSON-schema function tools for agents
  events: { emits, listens },
  ui: { routes[], widgets[] } // optional surfaces
}
```

**Permission Kernel** checks: `user.enabledSkills ∩ mode.allowedSkills ∩ tool.allowlist` before any tool call.

### 4A.4 Event bus (cross-Skill composition)

Examples:
- Research Skill emits `CatalystDetected` → Risk Skill may raise severity → Execution Skill proposes defensive rebalance (if SSI + SoDEX Skills ON).
- Macro Skill emits `FOMCWithin24h` → Execution Skill blocks risk-on.
- Guardian Skill emits `ModeEntered(GUARDIAN)` → Estate Skill arms claim prep; Yield Skill keeps vault earning; SoDEX Skill cancels risk-on.

### 4A.5 Why the OS layer wins judging

1. **Innovation 10/10** — platform abstraction competitors lack.
2. **User Value** — power users compose; novices keep Family Office defaults.
3. **Integration depth** — each Skill is a forced SoSoValue pillar binding.
4. **Demo** — toggling Skills live is a 15-second wow that proves architecture.
5. **Business** — Pro unlocks advanced Skills (Treasury, Tax packs, auto-bands).

---

## 5. Ecosystem Integration Plan

### 5.1 Pillar usage matrix (non-negotiable depth)

| Pillar | Living Mode | Guardian Mode | Heir Mode |
|---|---|---|---|
| **SoSoValue Terminal** | Continuous research, risk, briefs | Threat monitoring, defer risky actions | Tax lot context, market snapshot at transfer |
| **SSI Protocol** | Core allocation + Earn + boost | Shift to USSI / conservative mix | Hold / unwrap per heir policy |
| **SoDEX** | Rebalance, vault deposit, optional hedges | Defensive spot rebalance, cancel open risk | Liquidate to heir target assets |
| **ValueChain EVM** | Policy contracts, action logs, WSOSO fees | Freeze flags, guardian multisig hooks | Release + TRUST continuity NFT |
| **$SOSO** | Fee discount, gas, SSI boost, collateral | Maintain boost / fee tier | Fee settlement on claim |
| **Mirror Protocol** | Onboard external wealth | Freeze bridging out | Controlled withdrawal to heir chains |
| **SoPoints** | Optimize vault/trade activity for points | Preserve vault points passively | Transfer policy for points-eligible positions |
| **Vaults (sMAG7 / SLP)** | Dual yield core | Keep earning in safe wrappers | Exit per claim plan |

### 5.2 Integration priority (build order)

**P0 — must ship for Wave win**
1. SoSoValue: Currency, Index, ETF, Feeds, Macro (5 modules minimum in living loop)
2. SSI: mint/stake path for MAG7.ssi + USSI
3. SoDEX: EIP-712 spot rebalance + WS order updates
4. ValueChain: `WealthPolicy` + `ActionLog` contracts
5. AI: Research + Risk + Execution agents with confirm-before-execute

**P1 — stretch that separates #1 from #3**
6. Crypto Stocks + BTC Treasuries + Analysis Charts + Fundraising
7. sMAG7.ssi Vault dual yield
8. SOSO staking boost + SoDEX fee tier optimizer
9. SoPoints-aware activity planner
10. Guardian Mode full automation
11. `/track` verifiable performance + `/judges` + `/diag`

**P2 — Heir Mode (module, not hero)**
12. Attestation ladder
13. Claim + KYC
14. Tax pack (US/UK templates only)
15. ResearchHubVoting participation

### 5.3 "SoSoValue is the hero" demo rule

Every demo minute must name a SoSoValue artifact on screen:
- Minute 1: Terminal data (ETF + news + index)
- Minute 2: SSI allocation change
- Minute 3: SoDEX fill + ValueChain log
- Minute 4: Guardian or Heir state transition

No minute may be only email, PDF, or KYC.

---

## 6. AI Architecture

### 6.1 Design principles

1. **SoSoValue is the only market oracle** for core decisions (external prices only as drift-check, never as primary brain).
2. **Skills OS first** — agents do not own tools directly; they call Skill tools through the Permission Kernel.
3. **Role-separated agents** with typed tools and hard risk gates.
4. **Confirm-before-execute** for Living Mode; **policy-automatic** for Guardian; **multi-factor human** for Heir.
5. **Every reasoning trace** stored; hash committed to ValueChain `ActionLog` (and tagged with Skill IDs).
6. **Debate mode** only for ambiguous high-impact decisions (not for routine DCA).
7. **Disabled Skill = invisible tool** — the LLM never sees tools from Skills the user turned off.

### 6.2 Model routing

| Agent | Model tier | Why |
|---|---|---|
| Research Agent | Strong (Claude Sonnet / GPT-4.1-class) | Synthesis quality |
| Risk Agent | Strong | False negatives are expensive |
| Execution Agent | Fast + deterministic tools | Must not "creatively" size orders |
| Yield / Points Optimizer | Fast | Numeric optimization |
| Guardian Agent | Strong | State transition gravity |
| Heir Verifier | Fast + external KYC tools | Pipeline, not prose |
| Tax / Report Agent | Fast | Template fill |
| Debate Synthesizer | Strongest | Rare, high stakes |

### 6.3 Perception → Memory → Reason → Action → Audit

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PERCEPTION  │──▶│    MEMORY    │──▶│   REASONING  │
│ SoSoValue API│   │ PG + Redis   │   │ LangGraph    │
│ SoDEX WS     │   │ 7d news roll │   │ multi-agent  │
│ SSI on-chain │   │ portfolio    │   │ risk gates   │
└──────────────┘   └──────────────┘   └──────┬───────┘
                                             │
                     ┌───────────────────────┼───────────────────────┐
                     ▼                       ▼                       ▼
              ┌────────────┐          ┌────────────┐          ┌────────────┐
              │  ACTION    │          │  REPORTING │          │   AUDIT    │
              │ SoDEX EIP  │          │ Weekly FO  │          │ ValueChain │
              │ SSI mint   │          │ briefs     │          │ ActionLog  │
              │ Vault dep  │          │ /track     │          │ + IPFS     │
              └────────────┘          └────────────┘          └────────────┘
```

### 6.4 Verification gates (Living Mode) — non-negotiable

Inspired by SignalForge, adapted for family-office frequency:

| Gate | Rule (initial) |
|---|---|
| ETF Flow Gate | |net inflow| ≥ $50M OR 2-day consistent direction before risk-on shift |
| Macro Gate | No discretionary risk-on within 24h of FOMC/CPI unless user overrides |
| News Gate | Block rebalance if hot cluster tags portfolio assets with severity ≥ threshold |
| SSI Drift Gate | Rebalance only if allocation drift ≥ X% or thesis confidence ≥ Y |
| Book Depth Gate | SoDEX orderbook slippage estimate ≤ 1% or TWAP split |
| Correlation Gate | Crypto-stock / BTC treasury shock → reduce equity-beta sleeve |
| Mode Gate | Living ≠ Guardian ≠ Heir tool permissions enforced in code |
| Skill Gate | Tool's Skill must be enabled in Wealth Policy |

### 6.5 Skills → Agents binding

| Agent | Primary Skills it orchestrates |
|---|---|
| Research Agent | Research, Macro, Treasury (optional) |
| Portfolio Agent | Portfolio, SSI |
| Risk Agent | Risk, Macro |
| Execution Agent | Execution, SoDEX, SSI |
| Yield Agent | Yield, SoDEX (vault/SoPoints), SSI Earn |
| Report Agent | Research, Portfolio, Tax |
| Guardian Agent | Guardian, Risk, SoDEX (cancel/flatten), SSI |
| Continuity Agent | Estate, Tax, Portfolio |

The **OS Orchestrator** loads enabled Skill manifests, builds the tool registry for the current mode, then runs the agent graph. Family Office UX is a curated Skill preset, not a separate codebase.

---

## 7. Agent Architecture

### 7.1 Agent roster (8 agents, 3 modes) on top of Skills OS

Agents are **orchestrators**. Skills are **capabilities**. The Family Office app is the default Skill preset + UI shell.

#### Living Mode (primary product)

| # | Agent | Job | Tools |
|---|---|---|---|
| 1 | **Research Agent** | Daily/weekly market intelligence | `/news`, `/news/hot`, `/news/search`, `/macro/events`, `/analyses/*`, `/fundraising/*` |
| 2 | **Portfolio Agent** | Net-worth, drift, SSI allocation | `/currencies/*`, `/indices/*`, `/crypto-stocks/*`, `/btc-treasuries/*`, SSI balances |
| 3 | **Risk Agent** | VaR-lite, sector shock, ETF outflow, correlation | klines, sector-spotlight, ETF summary, pairs depth |
| 4 | **Execution Agent** | SoDEX spot orders, SSI mint/redeem/stake, vault deposit | SoDEX REST+WS, SSI contracts |
| 5 | **Yield Agent** | SSI Earn, SOSO boost, Vault APY, fee tier, SoPoints plan | Earn positions, SoDEX fee rate, vault state |
| 6 | **Report Agent** | Weekly FO brief, monthly report, tax lots | All snapshots + ActionLog |

#### Guardian Mode (inactivity)

| # | Agent | Job |
|---|---|---|
| 7 | **Guardian Agent** | Escalate contacts, freeze risk, defensive SSI mix, keep reports running |

#### Heir Mode (death / confirmed incapacity)

| # | Agent | Job |
|---|---|---|
| 8 | **Continuity Agent** | Claim verification, release, tax pack, beneficiary routing |

*(Former "Attestation / Trustee / Claim / Tax" agents collapse into Guardian + Continuity with clearer mode boundaries.)*

### 7.2 Orchestrator

- **LangGraph** state machine with explicit `mode` enum: `ALIVE | GUARDIAN | HEIR`.
- Mode transitions are **policy transactions** on ValueChain (not a backend boolean).
- Human-in-the-loop nodes: Living confirmations; Guardian trustee ping; Heir KYC review.

### 7.3 Permissions by mode

| Capability | Alive | Guardian | Heir |
|---|---|---|---|
| Research / reports | ✓ | ✓ | ✓ (read) |
| Risk-on rebalance | ✓ (confirm) | ✗ | ✗ |
| Risk-off rebalance | ✓ | ✓ (auto) | limited |
| Perps hedge | optional confirm | flatten only | flatten only |
| Bridge out | ✓ | ✗ | heir-approved |
| Beneficiary change | ✓ | ✗ | ✗ |
| Claim release | ✗ | ✗ | ✓ |

---

## 8. Product Flow

### 8.1 Three-state user journey

```
                 ┌─────────────────────────────────────────┐
                 │           ALIVE — Family Office         │
                 │  Research → Allocate → Execute → Earn   │
                 │  Weekly briefs · Risk · SoPoints · SOSO │
                 └───────────────┬─────────────────────────┘
                                 │ missed attestations /
                                 │ inactivity policy
                                 ▼
                 ┌─────────────────────────────────────────┐
                 │         GUARDIAN — Emergency Mode       │
                 │  Notify trustees · Freeze risk-on       │
                 │  Shift to USSI/conservative SSI         │
                 │  Keep dual yield · Keep reports         │
                 └───────────────┬─────────────────────────┘
                                 │ death / legal trigger /
                                 │ max escalation
                                 ▼
                 ┌─────────────────────────────────────────┐
                 │           HEIR — Continuity             │
                 │  Verify · Release · Tax · Transfer      │
                 └─────────────────────────────────────────┘
```

### 8.1A Skills onboarding (OS layer)

1. Connect wallet → create Wealth Policy.
2. Choose **Family Office preset** (recommended) or **Custom Skills**.
3. Family Office preset enables: Research, Portfolio, Risk, SSI, SoDEX, Yield, Macro, Execution, Guardian, Estate, Tax.
4. Advanced users may disable Macro/Treasury/Tax; cannot disable Risk + Execution if SoDEX Skill is ON (safety invariant).
5. Skills panel remains editable in Settings; changes emit `SkillsUpdated` and rebuild the agent tool registry within seconds.

### 8.2 Alive Mode — day in the life

1. User connects wallet (ValueChain + Base for SSI).
2. Mirror-deposit or SoDEX-balance import → HEIRLOCK portfolio graph.
3. Risk questionnaire → target SSI policy (Conservative / Balanced / Growth / Custom).
4. AI proposes initial allocation (e.g. 40% sMAG7.ssi vault, 40% USSI, 15% DEFI.ssi, 5% SOSO staked for boost+fees).
5. User confirms → Execution Agent mints/stakes/deposits via SSI + SoDEX.
6. Continuous loop:
   - Ingest Terminal data
   - Update risk + opportunity scores
   - Propose actions (rebalance, harvest, boost SOSO, vault shift)
   - User confirms (or auto within pre-approved bands)
   - Log to ValueChain
7. Friday: Weekly Family Office Brief (PDF + in-app), cited to endpoints.

### 8.3 Guardian Mode — trigger ladder

| Day | Action |
|---|---|
| 0 | Missed scheduled attestation |
| 3 | Push + email + Telegram |
| 7 | SMS + secondary contacts |
| 14 | Trustee human confirm request |
| 21 | **Guardian Mode on-chain**: cancel risk-on orders, flatten optional perps, rebalance to Guardian policy (default heavy USSI) |
| 21+ | Continue monitoring + weekly heir-prep reports to trustees |
| Policy max | Escalate to Heir Mode per user's deed |

### 8.4 Heir Mode — only then

1. Continuity Agent opens claim window.
2. Beneficiary verifies (KYC + pre-registered identity binding).
3. Dispute window (configurable).
4. Assets release per splits; tax pack generated.
5. Optional: heir onboarded as new Alive user (virality loop).

### 8.5 Setup time targets

| Flow | Target |
|---|---|
| Alive onboarding to first allocation | ≤ 8 minutes |
| Confirm a proposed rebalance | ≤ 30 seconds |
| Guardian simulation (demo) | ≤ 60 seconds |
| Heir claim happy path (demo) | ≤ 90 seconds |

---

## 9. Technical Architecture

### 9.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js App Router + wagmi/viem + Tailwind | Matches ecosystem; SIWE; Base + ValueChain |
| Platform Layer | Skill Registry + Permission Kernel + Event Bus | AI Financial OS runtime |
| Backend | FastAPI + Celery + Redis | Agent orchestration + cron + cache (30s TTL) |
| AI | LangGraph + tool calling | Multi-agent with mode graph over Skill tools |
| DB | Postgres (Neon) | Users, portfolios, briefs, skill flags, KYC references |
| Audit | ValueChain contracts + IPFS | Immutable decisions |
| Execution | SoDEX REST + WS; EIP-712 signer service | Official Go SDK patterns ported to Python/TS |
| SSI | Base contracts via viem | Mint/stake/redeem |
| Hosting | Vercel (FE) + Fly.io (BE) | Low latency pings |
| Observability | Sentry + Better Stack + `/diag` | Judge-visible health |

### 9.1A Platform Layer components

| Component | Responsibility |
|---|---|
| `SkillRegistry` | Load manifests; version Skills; expose tool schemas |
| `PermissionKernel` | Enforce enabled Skills × mode × tool allowlist |
| `EventBus` | Cross-Skill events (`CatalystDetected`, `ModeEntered`, …) |
| `AuditBus` | Normalize traces → ActionLog hashes |
| `PolicyStore` | Per-user Wealth Policy including `enabledSkills[]` |
| Family Office App | Default Skill preset + dashboard composition |

### 9.2 On-chain components (ValueChain EVM)

| Contract | Purpose |
|---|---|
| `WealthPolicy` | User policy: allocations, bands, guardian rules, beneficiaries, **enabledSkills bitmask** |
| `ModeController` | ALIVE / GUARDIAN / HEIR state; transition permissions |
| `ActionLog` | Append-only hash log of AI decisions + trade receipts |
| `AttestationRegistry` | Liveness / trustee confirmations |
| `ContinuityNFT` | Receipt of policy (no PII in metadata) |
| `FeeCollector` | AUM / performance fees in SOSO/WSOSO |

Proxy + timelock + 3-of-5 multisig admin. Align with SSI transparent proxy culture.

### 9.3 Off-chain services

- SoSoValue client (all 9 modules) with quota governor (20 rpm, 100k/mo)
- SoDEX signer worker (one API key per strategy process; atomic nonces)
- Brief generator (markdown → PDF)
- Notification bus (email / Telegram / SMS)
- KYC adapter (sandbox for demo; Sumsub/Persona)
- `/track` performance engine (NAV vs SSI buy-and-hold baselines)

### 9.4 Security boundaries

- Master wallet cold; trading via `addAPIKey` only
- Living Mode API key: trade + transfer-within-SoDEX; **no arbitrary withdraw** without user signature
- Guardian Mode key: risk-off + cancel only
- Heir release: ModeController + beneficiary signature + optional trustee

---

## 10. API Mapping

### 10.1 SoSoValue OpenAPI — full module map

| Module | Endpoints | HEIRLOCK use |
|---|---|---|
| **Currency & Pairs** | list, info, market-snapshot, klines, supply, pairs, sector-spotlight, token-economics, fundraising | Valuation, drift, depth/slippage proxy, sector risk, unlock pressure |
| **ETF** | summary-history, list, market-snapshot, history | Risk-on/off gates, weekly brief macro |
| **SoSoValue Index** | list, constituents, market-snapshot, klines | SSI allocation brain, NAV tracking, backtest |
| **Crypto Stocks** | list, market-snapshot, market-cap, klines, sector, sector-index | Holistic net worth, equity-beta sleeve |
| **BTC Treasuries** | list, purchase-history | Corporate BTC accumulation shocks → risk overlay |
| **Feeds** | news, hot, featured, search | Catalyst detection, brief citations |
| **Fundraising** | projects, detail | Opportunity / narrative risk for Growth policy |
| **Macro** | events, event-history | Calendar gates |
| **Analysis Charts** | list, chart-data | Trust/FO health visuals, long-form risk |

**Rule**: Living Mode must call ≥6 modules in the default weekly loop. Heir Mode may use fewer.

### 10.2 Rate-limit architecture

- Shared Redis cache 30s on snapshots; 5–15m on news clusters
- Per-user request budgets; global governor at 15 rpm steady (headroom under 20)
- Pre-aggregate morning brief job once; fan out to users
- Request quota increase early via developer dashboard (Wave precedent: limits were raised)

### 10.3 No CoinGecko in the core path

External price feeds allowed only as **Price Drift Gate** secondary check (SignalForge pattern). Primary marks = SoSoValue + SoDEX.

---

## 11. SSI Mapping

| SSI surface | HEIRLOCK mapping |
|---|---|
| `MAG7.ssi` | Core growth / beta sleeve |
| `DEFI.ssi` | Satellite DeFi sleeve |
| `MEME.ssi` | Optional high-risk satellite (Living only; banned in Guardian default) |
| `USSI` | Cash-like / Guardian default / Conservative |
| `sMAG7.ssi` etc. | Staked receipts for SSI Points |
| SSI Earn | Yield Agent primary venue |
| $SOSO stake | Boost multiplier + SoDEX fee discount coordination |
| ResearchHubVoting | Propose continuity-friendly indexes; vote as protocol citizen |
| Mint / redeem | Execution Agent via Router on Base |
| 14-day unstake cooldown | Guardian/Heir liquidity planning must respect cooldown |

### 11.1 Default policies

| Policy | Target mix (illustrative) |
|---|---|
| Conservative | 80% USSI / 20% sMAG7.ssi |
| Balanced | 40% sMAG7 vault / 40% USSI / 15% DEFI / 5% SOSO staked |
| Growth | 60% sMAG7 vault / 20% DEFI / 10% MEME / 10% USSI |
| Guardian Override | ≥70% USSI, 0% MEME, flatten perps, keep vault if sMAG7 already staked |

### 11.2 Dual yield path (signature Living feature)

`USDC → SoDEX spot → MAG7.ssi → stake sMAG7.ssi → deposit SoDEX sMAG7.ssi Vault`

This single path touches SSI + SoDEX + ValueChain + SoPoints + SOSO airdrop eligibility. **Demo this.**

---

## 12. SoDEX Mapping

| SoDEX surface | HEIRLOCK mapping |
|---|---|
| Spot REST `newOrder` | Rebalances, SSI entry/exit |
| Spot orderbook | Slippage / TWAP planner |
| Spot balances | Portfolio source of truth on ValueChain trading account |
| WS `account-order-updates` | Fill confirmation → ActionLog |
| WS mark price / tickers | Optional hedge monitoring |
| Perps (optional Living) | Soft hedges around macro events; **Guardian flattens** |
| TP/SL / OCO | Pre-approved risk bands |
| Fees + SOSO discount tiers | Yield Agent optimization (match 5–40% schedule) |
| Multi-Asset Margin | Advanced: SOSO/BTC/ETH collateral efficiency under caps |
| SLP / sMAG7.ssi Vault | Dual yield + SoPoints vault holdings |
| SoPoints | Weekly plan: trade vs vault vs referral — family-office-safe activity |
| KYT/KYA | Compliance narrative for Continuity module |
| `scheduleCancel` | Safety on agent disconnect |
| API keys (max 5) | Separate keys: Living exec / Guardian / research-readonly ops |

### 12.1 Signing non-negotiables (from SoDEX pitfalls)

- `X-API-Key` = **name**, not address
- Trading signed by API key, not master
- `0x01` prefix on signature
- Compact JSON + Go struct field order
- DecimalString fields as strings
- One API key per process; atomic nonces
- Domain `spot` vs `futures`; chainId `286623` mainnet

### 12.2 What we will not do in v1

- Market-making bot as core product (different archetype)
- Aggressive perps leverage (destroys family-office trust)
- Ignoring address-based rate limits / funding hour edges

---

## 13. ValueChain Mapping

| ValueChain element | HEIRLOCK mapping |
|---|---|
| Chain ID 286623 / RPC / WS | Deployment + reads |
| Native $SOSO gas | All policy txs; fee economics |
| WSOSO `0x5050…5050` | EVM escrow / fee collection |
| EVM syschain | Unified account layer with SoDEX appchains |
| Explorer `main-scan.valuechain.xyz` | Judge-visible audit links |
| Mirror Protocol | Deposit BTC/ETH/USDC/etc. → trading account → HEIRLOCK policy |
| D²APP narrative | Position HEIRLOCK as a Deterministic wealth D²APP pattern (policy + logs) |
| Testnet 138565 | CI + `/diag` safe execution mode |

### 13.1 Mirror onboarding story (demo gold)

"User holds BTC on Bitcoin + USDC on Base + MAG7.ssi on Base → Mirror + deposit → single HEIRLOCK policy on ValueChain → AI allocates → vault dual yield."

This is the moment judges understand why ValueChain exists.

---

## 14. Demo Story

### 14.1 Target: ≤ 4 minutes (winner pattern)

| Time | Beat | On-screen proof |
|---|---|---|
| 0:00–0:20 | Problem: crypto wealth has no operating system — and no continuity | Split visual: living chaos vs dead wallets |
| 0:20–0:35 | Hook: *AI Finance OS. On-chain.* | Platform Layer + Family Office app |
| 0:35–0:50 | **Skills wow**: toggle Treasury Skill ON; show tool registry rebuild | Settings → Skills |
| 0:50–1:40 | **Living wow**: AI brief from Terminal → propose SSI rebalance → user confirms → **real SoDEX mainnet fill** → ActionLog | ETF+news+index; order ID; SoDEX Portfolio link |
| 1:40–2:15 | **Earn wow**: Yield Skill — stake + sMAG7 vault dual yield + SOSO boost + SoPoints | Earn + vault screens |
| 2:15–2:45 | **Guardian Skill**: simulate inactivity → risk freeze → USSI shift | ModeController state change |
| 2:45–3:15 | **Estate Skill** (compressed): claim → release → tax PDF | Continuity flow |
| 3:15–3:40 | Architecture: OS → Skills → Agents → Terminal/SSI/SoDEX/ValueChain | One diagram |
| 3:40–4:00 | Ask: Wave grant + design partners; `/judges`, live app, GitHub | End card |

### 14.2 `/judges` script (60–90 seconds, unattended)

1. Click **Skills Panel** — show defaults; toggle one Skill; registry updates.
2. Click **Run Living Loop** — preloaded portfolio; shows 5+ Terminal modules hitting green.
3. Click **Approve Rebalance** — EIP-712 spot order on **mainnet**; fill badge; SoDEX Portfolio link.
4. Click **Simulate Guardian** — mode flip; defensive allocation.
5. Click **Open Estate Claim (sandbox)** — optional; clearly labeled Skill.
6. Open `/diag` — all integrations live; Skill health row.
7. Open `/track` — NAV vs MAG7.ssi buy-and-hold.

### 14.3 Honest scope banner (Mosaic pattern)

**Live (mainnet-first)**: SoSoValue API, SoDEX **mainnet** small-size capped orders, SSI read + mint/stake on Base, ValueChain logs, Skills OS.
**Sandbox**: KYC, legal PDF templates (US/UK), SMS.
**Not claimed**: multi-jurisdiction law practice, uncapped mainnet size, perps alpha as core.
**Dev-only**: testnet profile may exist for CI — never the demo default.

---

## 15. Business Model

### 15.1 Who pays

1. **Crypto-native households** (primary) — $50K–$5M liquid crypto
2. **HNWI / emerging family offices** — want continuity + reporting
3. **Heirs** — one-time claim success fee (module)
4. **Advisors / lawyers** — software + templates referral (not legal advice)

### 15.2 Why now

- SoSoValue has Terminal + SSI + SoDEX + ValueChain closed loop live
- Buildathon explicitly funds research-to-execution agents
- Generational crypto wealth is aging into estate reality — but **daily FO value** is what converts

### 15.3 Wedge → platform

1. Wedge: AI Family Office app on Skills OS (Living)
2. Expand: Guardian Skill automation
3. Moat: Estate / Continuity Skill
4. Platform: Skill presets + advisor white-label + policy marketplace

---

## 16. Monetization

| Stream | Model | Notes |
|---|---|---|
| Management fee | 0.5% AUM / year | Discounted via SOSO stake tiers aligned to SoDEX (5–40%) |
| Performance fee | 10% of alpha vs policy benchmark (e.g. MAG7.ssi) | Optional; opt-in |
| Continuity claim fee | 1.0–1.5% on release | Heir Mode only |
| Pro subscription | $49–$99 / year | Unlimited policies, advanced tax, priority briefs |
| Advisor seats | SaaS | White-label reporting |
| Vault referral / points coaching | Soft — avoid conflicting with SoDEX ToS | Transparency first |

**SOSO demand drivers (judge narrative)**:
- Pay fees in SOSO/WSOSO
- Stake SOSO for management-fee discount **and** SSI boost **and** SoDEX trading discount
- Gas on ValueChain for policy updates

---

## 17. Security

### 17.1 Smart contract

- SlowMist / BlockSec-style audit path (ecosystem-familiar)
- Transparent proxy + 24h timelock
- 3-of-5 multisig; bug bounty in SOSO
- ModeController invariants tested in Foundry (no Heir without Guardian escalation path, etc.)

### 17.2 Execution

- Scoped API keys; max 5; rotate
- Slippage caps, notion caps, daily loss limits
- `scheduleCancel` on agent heartbeats
- Macro/news gates
- Guardian cannot bridge out
- 24h Living circuit-breaker (user pause)

### 17.3 Continuity

- No PII on-chain; ContinuityNFT metadata scrubbed
- KYC data pass-through, not stored
- Dispute window before release
- Deepfake-resistant liveness optional at policy creation

### 17.4 Operational

- Secrets in vault; no API keys in frontend
- SIWE auth
- Rate-limit and nonce isolation per worker
- Public `/diag` without leaking secrets

### 17.5 Legal posture

- Software + automation + templates — **not law practice**
- Jurisdiction banners; "consult counsel"
- Ship US/UK templates only at first; others "preview"

---

## 18. Risk Controls

### 18.1 Portfolio risk

| Control | Mechanism |
|---|---|
| Policy bands | Max drift before mandatory propose |
| Sleeve caps | MEME / single-asset caps |
| Guardian override | Hard defensive template |
| Volatility brake | Realized vol from klines → reduce beta |
| ETF outflow brake | Large BTC ETF outflow → risk-off bias |
| Liquidity brake | pairs depth + SoDEX book |
| Cooldown awareness | SSI 14-day unstake in liquidity plans |

### 18.2 Agent risk

| Control | Mechanism |
|---|---|
| Tool allowlists per mode | Hard code |
| Confirm-before-execute | Living default |
| Debate threshold | Only above $X or irreversible mode change |
| Shadow mode | Paper executor first week per user |
| Kill switch | User + trustee |

### 18.3 Platform risk

| Risk | Mitigation |
|---|---|
| SoSoValue quota | Cache, batch briefs, quota raise request |
| SoDEX signing bugs | Conformance tests vs Go SDK vectors |
| SSI NAV oracle lag | Cross-check Index API vs constituents sum |
| Bridge loss (Mirror) | Min sizes; user education; staged deposits |
| Regulatory | FO software framing; Continuity module disclaimers |

### 18.4 Demo risk

- Default demo profile: **mainnet-limited** (real fills, hard notional cap)
- Paper mode for CI; testnet only as labeled fallback
- Pre-bake a recorded fallback clip if mainnet fill fails
- `/diag` red/green so judges see honesty

---

## 19. Final Winning Version

### 19.1 Product definition

**HEIRLOCK** is the **AI Financial Operating System** for the SoSoValue ecosystem.

Its **Platform Layer** provides a Skill Registry, Permission Kernel, Event Bus, and Audit Bus.

Its **flagship application** is an **AI Family Office / Wealth Continuity** experience that:
1. Researches with SoSoValue Terminal (Research / Macro / Treasury Skills)  
2. Allocates with SSI Protocol (SSI Skill)  
3. Executes with SoDEX (SoDEX / Execution Skills)  
4. Settles and audits on ValueChain  
5. Optimizes $SOSO / SoPoints / Vault yield (Yield Skill)  
6. Protects in Guardian Mode (Guardian Skill) when you cannot act  
7. Transfers in Heir Mode (Estate + Tax Skills) only when continuity demands it  

Inheritance is the **Estate Skill** — the moat — not the homepage. The OS is what makes HEIRLOCK category-defining.

### 19.2 One-sentence pitch

> HEIRLOCK is the on-chain AI financial operating system — a modular Skill platform whose family office manages your SoSoValue wealth while you live, guards it when you can't, and delivers it when you're gone.

### 19.3 Scoring target (post-redesign)

| Dimension | Target | How we hit it |
|---|---|---|
| User Value | 10/10 | Daily FO value + continuity moat |
| Innovation | 10/10 | Skills OS + life-cycle state machine + SSI/SoDEX FO |
| Technical Difficulty | 10/10 | Multi-agent + EIP-712 + dual-chain (Base+ValueChain) + mode contracts |
| AI | 10/10 | Research/risk/execution/yield agents with gates |
| UX | 10/10 | Alive-first UI; `/judges`; briefs; `/track` |
| Integration | 10/10 | All pillars load-bearing; 9 API modules in living loop |
| Demo | 10/10 | ≤4 min living→guardian→heir; real fills |
| Business | 10/10 | AUM + SOSO utility + advisor path |

### 19.4 Wave delivery plan (cut scope, not quality)

**Wave ship (P0)**  
- Alive Mode FO loop (Research, Portfolio, Risk, Execution, Report)  
- SSI Balanced policy + sMAG7 vault path  
- SoDEX EIP-712 spot + WS fills  
- ValueChain ActionLog + ModeController (Alive/Guardian minimum)  
- `/judges`, `/diag`, `/track`  
- Guardian simulation  

**Stretch (P1)**  
- Yield Agent (SOSO boost + fee tiers + SoPoints planner)  
- Crypto Stocks + BTC Treasuries + Macro gates  
- Mirror onboarding wizard  

**Module (P2 — present, not hero)**  
- Heir claim sandbox + US/UK tax PDF  
- Attestation ladder  

### 19.5 Explicit non-goals (for now)

- Practicing law / multi-jurisdiction probate automation as core
- High-frequency trading / copy-trading
- Building a general SoSoValue Terminal clone UI
- DAO treasury inheritance
- Promising mainnet size without caps

### 19.6 Success test (pre-implementation gate)

Before writing production code, this redesign must pass:

1. **Wishlist test**: Would Levi/Jazon recognize this as research→execution? **Yes.**  
2. **Portability test**: Remove SoSoValue — does it die? **Yes.**  
3. **Demo test**: Can a living user see value in 60 seconds without hearing the word death? **Yes.**  
4. **Moat test**: Do we still have a reason Mosaic/Consilium can't copy us next week? **Yes — Guardian/Heir state machine + continuity.**  
5. **Judge memory test**: Can they repeat the hook? **"AI Finance OS. On-chain."**
6. **OS test**: Can a judge disable a Skill and see the agent lose that capability live? **Yes.**

---

## Appendix A — Renamed information architecture

| Old (inheritance-first) | New (FO-first) |
|---|---|
| Trust creation wizard | Wealth Policy setup |
| SAFE MODE | Guardian Mode |
| Settlor | Principal |
| TRUST-NFT | Continuity NFT / Policy NFT |
| What if I died today? | Continuity Simulator (secondary) + Living "What if markets move?" |
| Attestation Agent | Guardian / Liveness (subsystem) |
| Homepage story: death | Homepage story: AI Finance OS → Family Office app |
| Monolithic agents | Skills OS + agent orchestrators |

## Appendix B — Competitive kill shot lines

- vs Mosaic: "Mosaic builds the basket. HEIRLOCK runs the family office — and the continuity plan."
- vs Consilium/sonar: "They optimize trades. We optimize decades — with modes for when you can't click confirm."
- vs generic dead-man switches: "They wait for death. We create value every week from SoSoValue data."

## Appendix C — Immediate next steps after approval

1. Lock P0 scope + demo storyboard  
2. Apply/raise SoSoValue API key; SoDEX testnet whitelist  
3. Scaffold monorepo: `apps/web`, `apps/api`, `packages/sosovalue`, `packages/sodex-signer`, `contracts/`  
4. Implement Living loop vertical slice (brief → propose → sign → log)  
5. Only then add Guardian; only then Heir module polish  

---

*End of PROJECT_REDESIGN.md — awaiting approval to implement.*
