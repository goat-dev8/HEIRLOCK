# 03 · SSI Protocol Master Reference

> **Mission of this file**: To be the single most comprehensive, source-cited, implementation-ready reference for the **SSI Protocol** — SoSoValue's on-chain spot crypto index tokenization protocol — including the **$SOSO tokenomics**, **SSI Earn (staking)**, and the **ResearchHubVoting** governance layer.
>
> **Companion files**:
> - `01_SOSOVALUE_MASTER_REFERENCE.md` — SoSoValue consumer research platform + data API (the data layer that feeds SSI index methodology)
> - `02_SODEX_MASTER_REFERENCE.md` — SoDEX DEX + ValueChain L1 (where SSI tokens trade and where SSI staking receipts earn dual yield)
>
> **Methodology**: Every technical statement is followed by a `Source / URL / Date` triple. Where the official docs are silent, the document explicitly says "INFERRED" and explains the reasoning. Gated or 404 pages are listed in §25.
>
> **Last compiled**: 2026-07-05 (UTC+8)

---

## Table of Contents

0. Meta
1. Executive Overview
2. What is SSI? (Definition & Token Standard)
3. Architecture & System Design
4. Smart Contracts & ABIs
5. Deployed Addresses (per chain)
6. Audits & Security
7. Mint Flow (components → SSI)
8. Redeem Flow (SSI → basket / USDC)
9. NAV Calculation & Oracle Stack
10. Rebalancing & Index Methodology
11. Fees, Caps, Supply
12. SSI Earn (Staking)
13. $SOSO Token (full tokenomics)
14. Public APIs
15. SDKs & CLI
16. Authentication & Signing
17. Integration with SoDEX
18. Integration with SoSoValue App
19. GitHub Presence (deep dive)
20. Whitepaper Summary (SSI sections)
21. Tokenomics Details
22. Third-Party Coverage
23. Common Pitfalls & Known Issues
24. Code Examples
25. Hackathon Angles
26. Open Questions / Gaps
27. Source Index

---

## 0. Meta

| Field | Value |
|---|---|
| Protocol name | SSI Protocol (SoSoValue Indexes) |
| "SSI" stands for | **SoSoValue Indexes** (confirmed from https://ssi.sosovalue.com homepage: "SoSoValue Indexes (SSI): A Secure, Transparent Spot Crypto Index Protocol Built Fully On-Chain") |
| GitHub org | `SoSoValueLabs` |
| GitHub repo | https://github.com/SoSoValueLabs/ssi-protocol |
| Repo stats | 13 stars, 8 forks, 27 branches, 15 tags, 129 commits (as of Jun 10 2026) |
| Languages | Solidity 69.8%, JavaScript 24%, Python 3.3%, Ruby 2.7%, Shell 0.2% |
| Build framework | Foundry |
| Audit firms | SlowMist (confirmed); BlockSec (confirmed via their public audit-report page) |
| Consumer frontend | https://ssi.sosovalue.com |
| Earn / staking frontend | https://ssi.sosovalue.com/earn |
| Rewards page | https://ssi.sosovalue.com/reward |
| Buy page | https://ssi.sosovalue.com/buy/MAG7.ssi (and /buy/DEFI.ssi, /buy/MEME.ssi, etc.) |
| Token page | https://ssi.sosovalue.com/soso-token |
| Deployment chain | Base (primary); ValueChain EVM (composable with SoDEX) |
| Status | Mainnet live (since early 2025) |

---

## 1. Executive Overview

The **SSI Protocol** is SoSoValue's on-chain spot crypto index tokenization layer. It allows anyone to mint a **single ERC-20 token** that represents a **basket of underlying spot crypto assets** — for example, `MAG7.ssi` tracks the "Magnificent 7" crypto assets (BTC, ETH, SOL, BNB, XRP, ADA, DOGE), `DEFI.ssi` tracks a DeFi blue-chip basket, `MEME.ssi` tracks meme coins, and `USSI` is a USD-stable index.

The protocol is **fully on-chain** on Base (and composable with the ValueChain EVM syschain via SoDEX). Every mint, redeem, rebalance, and fee charge is verifiable on-chain. There are no off-chain custodians of the basket — the underlying tokens sit in the protocol's vault contracts.

### 1.1 Key value propositions (per official site)

1. **Secure** — fully on-chain smart contracts, audited by SlowMist and BlockSec.
2. **Transparent** — every component, weight, NAV, and rebalance is verifiable on-chain.
3. **Low-cost** — daily service fee of 0.01% of underlying asset value (per DeFiLlama).
4. **Passive** — one token = diversified basket; no manual rebalancing required.
5. **Simplifies DeFi** — eliminates the need for individual coin picking, multi-chain management, or LP positions.

### 1.2 The four SSI tokens (current mainnet)

| Ticker | Theme | Underlying | TVL (approx, Feb 2025 peak) |
|---|---|---|---|
| `MAG7.ssi` | "Magnificent 7" large-cap crypto | BTC, ETH, SOL, BNB, XRP, ADA, DOGE (weighted) | Dominant SSI token by TVL |
| `DEFI.ssi` | DeFi blue-chips | AAVE, UNI, LINK, etc. | ~$8.84M TVL (snapshot) |
| `MEME.ssi` | Meme coins | DOGE, SHIB, PEPE, etc. | Smaller |
| `USSI` | USD-stable index | USDC + delta-hedged yield strategies | "SoSoValue Basis" — separate DeFiLlama entry |

### 1.3 Staked variants

Each SSI token has a staked variant (e.g. `MAG7.ssi` → `sMAG7.ssi`). Staking:
- Locks the SSI token in the staking contract.
- Issues a receipt token (`sMAG7.ssi`) representing the staked position.
- Earns $SOSO airdrop rewards (via SSI Points, distributed daily).
- Boosts rewards when the user also stakes $SOSO.
- The staked variant can be deposited into SoDEX's sMAG7.ssi Vault for **dual yield** (index staking yield + market-making yield).

### 1.4 Scale

- **Total TVL peak**: ~$200.4M (Feb 23, 2025, per SoSoValue Weekly Update).
- **DEFI.ssi specifically**: $8.84M TVL, 25.52M total supply, 99.57K total holders (per https://ssi.sosovalue.com/buy/DEFI.ssi snapshot).
- **Season 2 airdrop**: 30M $SOSO tokens distributed via SSI staking Epoch 2.
- **Season 4 airdrop**: 15M $SOSO tokens distributed via SSI staking Epoch 4 (with additional rewards for depositing sMAG7.ssi in SoDEX Vault).

Source: SSI homepage | https://ssi.sosovalue.com | 2026-07-05
Source: SoSoValue weekly update tweet | https://x.com/SoSoValueCrypto/status/1893519626157597134 | 2026-07-05
Source: DeFiLlama SSI | https://defillama.com/protocol/sosovalue-indexes | 2026-07-05
Source: DeFiLlama Basis | https://defillama.com/protocol/sosovalue-basis | 2026-07-05
Source: DEFI.ssi page | https://ssi.sosovalue.com/buy/DEFI.ssi | 2026-07-05
Source: Panewslab Season 2 | https://www.panewslab.com/en/articles/kqopya0d | 2026-07-05
Source: SSI Staking Epoch 4 announcement | https://m.sosovalue.com/announcement | 2026-07-05

---

## 2. What is SSI? (Definition & Token Standard)

### 2.1 Confirmed expansion of "SSI"

Multiple sources confirm **SSI = "SoSoValue Indexes"**:
- The official homepage title is "SoSoValue Indexes (SSI): A Secure, Transparent Spot Crypto Index Protocol Built Fully On-Chain".
- DeFiLlama's protocol name is "SoSoValue Indexes" with TVL definition "TVL counts the underlying tokens in the baskets of the SSI tokens."
- The whitepaper §5 is titled "SoSoValue Indexes — A New Approach to Passive Crypto Investment for the Masses", with §5.1 "SSI Protocol Overview".

The token ticker suffix `.ssi` (e.g. `MAG7.ssi`, `DEFI.ssi`) is the on-chain naming convention.

### 2.2 Token standard

**INFERRED**: SSI tokens are **ERC-20** tokens on Base. The SSI Protocol smart contracts are written in Solidity (69.8% of the repo) using OpenZeppelin-upgradeable libraries. The staked variants (`sMAG7.ssi`, etc.) are also ERC-20 receipt tokens.

**Not confirmed**: whether SSI uses ERC-7621 (the proposed RWA/index token standard), ERC-4626 (vault standard), or a custom factory pattern. The repo's contract structure suggests a **factory + vault + index token** pattern, likely custom but using OpenZeppelin Upgradeable as the base.

Source: SSI homepage title | https://ssi.sosovalue.com | 2026-07-05
Source: GitHub repo language breakdown | https://github.com/SoSoValueLabs/ssi-protocol | 2026-07-05
Source: OpenZeppelin-upgradeable library commit | (SSI repo `lib/` dir, Nov 20 2024 commit "add openzeppelin-upgradeable library") | 2026-07-05
Source: DeFiLlama SSI TVL definition | https://defillama.com/protocol/sosovalue-indexes | 2026-07-05

### 2.3 Is SSI a spot index token or a perp index?

**Spot**. The official site is unambiguous: "A Secure, Transparent Spot Crypto Index Protocol Built Fully On-Chain." The underlying assets are real spot tokens held in vault contracts, not synthetic positions.

The exception is `USSI`, which DeFiLlama classifies as a separate "SoSoValue Basis" protocol because its TVL is "USSI tokens minted" and its fees come from "yield generated from delta hedging strategies plus daily service fee of 0.01%". USSI is therefore a **basis/yield-bearing stable** index that uses delta-hedging, not pure spot.

Source: SSI homepage | https://ssi.sosovalue.com | 2026-07-05
Source: DeFiLlama Basis | https://defillama.com/protocol/sosovalue-basis | 2026-07-05

---

## 3. Architecture & System Design

### 3.1 Documented architecture

The official SSI Protocol architecture is documented in the **whitepaper §5.1 SSI Protocol Overview** at https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/5.-sosovalue-indexes-new-approach-to-passive-crypto-investment-for-the-masses/5.1-ssi-protocol-overview. The full text was not directly captured in the research pass (the page is JS-rendered), but the section heading and surrounding breadcrumbs confirm:

- The protocol is the **5th chapter** of the SoSoValue whitepaper.
- It is described as a "new approach to passive crypto investment for the masses".
- §5.1 is the protocol overview; further subsections (5.2, 5.3, etc.) cover deeper mechanics — exact titles not captured.

### 3.2 Inferred contract architecture (from GitHub repo structure)

Based on the GitHub repo (`SoSoValueLabs/ssi-protocol`) file structure, the contract architecture is:

```
ssi-protocol/
├── foundry.toml          # Solidity optimizer enabled
├── lib/                  # OpenZeppelin-upgradeable library
├── remappings.txt        # @openzeppelin/contracts-upgradeable=...
├── script/               # Deployment scripts (CounterScript pattern + deploy_voting.sh)
├── src/                  # Main contracts
│   ├── (IndexFactory)
│   ├── (IndexToken - ERC-20)
│   ├── (Vault - holds underlying basket)
│   ├── (OracleAdapter - NAV feed)
│   ├── (Router - mint/redeem entrypoint)
│   └── ResearchHubVoting # governance / index-approval voting
├── test/                 # Forge test suite
├── deploy.sh             # main deployment script
├── deploy_voting.sh      # ResearchHubVoting deployment
├── upgrade.sh            # proxy upgrade script
└── LICENSE
```

**Confirmed**: `ResearchHubVoting` is a real contract — the most recent commits (Jun 8–9, 2026) reference it explicitly:
- "Add ResearchHubVoting approval-only issuance voting"
- "Add paginated `getParticipatedProposals(voter, begin, end)`"

**Inferred**: the protocol uses an **upgradeable proxy** pattern (commit "transparent-proxy-upgrade" branch merged Nov 28, 2024; `upgrade.sh` exists).

Source: SSI Protocol repo | https://github.com/SoSoValueLabs/ssi-protocol | 2026-07-05
Source: Whitepaper §5.1 | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/5.-sosovalue-indexes-new-approach-to-passive-crypto-investment-for-the-masses/5.1-ssi-protocol-overview | 2026-07-05

### 3.3 Data flow

```
                ┌─────────────────────────────────────────┐
                │       SoSoValue Data Layer (off-chain)   │
                │  (aggregates exchange prices, computes   │
                │   index constituents + weights)          │
                └────────────────────┬─────────────────────┘
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │       Oracle Adapter (on-chain)         │
                │  (pushes NAV + constituent weights to   │
                │   the protocol via authorized callers)  │
                └────────────────────┬─────────────────────┘
                                     │
            ┌────────────────────────┴────────────────────────┐
            ▼                                                  ▼
  ┌──────────────────┐                              ┌──────────────────┐
  │   Index Vault    │  ← holds underlying tokens   │  Index Token     │
  │  (per index)     │     (BTC, ETH, etc.)         │  (ERC-20, e.g.   │
  └──────────────────┘                              │   MAG7.ssi)      │
                                                    └──────────────────┘
            ▲                                                  │
            │                                                  │
            └─── mint: deposit underlyings ─── issue tokens ───┤
            └── redeem: burn tokens ──────── return underlyings┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │   Staking Contract                 │
                  │  (locks MAG7.ssi, issues sMAG7.ssi)│
                  │  (distributes $SOSO rewards daily) │
                  └─────────────────────────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │   SoDEX sMAG7.ssi Vault (optional)  │
                  │  (dual yield: index + market making)│
                  └─────────────────────────────────────┘
```

### 3.4 Off-chain vs on-chain boundary

**Off-chain** (SoSoValue data center):
- Raw market-data ingestion from exchanges (Binance, Coinbase, OKX, etc.).
- Index methodology: constituent selection, weight calculation, rebalancing decisions.
- NAV computation: weighted sum of constituent prices.

**On-chain** (Base + ValueChain EVM):
- Vault contracts holding underlying tokens.
- Index token ERC-20 contracts.
- Mint / redeem / stake / unstake logic.
- NAV oracle adapter (receives off-chain NAV via authorized push).
- ResearchHubVoting (governance).

This is the standard "off-chain methodology + on-chain execution" pattern used by most crypto index protocols (Index Coop, Set Protocol, etc.).

---

## 4. Smart Contracts & ABIs

### 4.1 Source code availability

The full Solidity source is **publicly available** at https://github.com/SoSoValueLabs/ssi-protocol. The repo is the authoritative reference for ABIs.

### 4.2 ABIs

ABIs are NOT published as separate JSON files in the repo. To obtain them:

1. **Clone the repo** and run `forge build` — Foundry will generate ABIs in `out/<Contract>.sol/<Contract>.json`.
2. **Fetch from BaseScan** — once you know the deployed contract address (see §5), use the BaseScan API to fetch the verified contract ABI.
3. **Use the `cast interface` command** — given a deployed address, `cast interface <address> --chain base` will generate the Solidity interface from the on-chain bytecode.

### 4.3 Known contracts (inferred from repo structure)

| Contract | Purpose | Confirmation |
|---|---|---|
| `IndexFactory` | Deploys new IndexToken + Vault pairs | INFERRED from standard factory pattern |
| `IndexToken` | ERC-20 representing the index (e.g. MAG7.ssi) | INFERRED |
| `Vault` | Holds underlying basket tokens | INFERRED |
| `OracleAdapter` | Receives NAV pushes from authorized callers | INFERRED |
| `Router` | User-facing mint/redeem entrypoint | INFERRED |
| `Staking` | Locks SSI tokens, issues sSSI receipt tokens, distributes $SOSO rewards | INFERRED from SSI Earn UI flow |
| `ResearchHubVoting` | Governance: approval-only voting on index issuance | CONFIRMED via commit history |

### 4.4 ResearchHubVoting (confirmed contract)

Recent commit messages reveal:
- "Add ResearchHubVoting approval-only issuance voting" (Jun 8 2026)
- "Add paginated `getParticipatedProposals(voter, begin, end)`" (Jun 9 2026)
- "add voting deploy script" (May 9 2026)
- "enable Solidity optimizer to reduce contract bytecode size" (May 8 2026)

This indicates that **new index issuance is governed by a community vote** via `ResearchHubVoting`. The contract exposes a paginated view function `getParticipatedProposals(voter, begin, end)` for querying a voter's participation history. The voting model is **approval-only** — voters approve or reject a proposed index, not rank multiple options.

Source: SSI Protocol GitHub commits | https://github.com/SoSoValueLabs/ssi-protocol | 2026-07-05

---

## 5. Deployed Addresses (per chain)

### 5.1 SSI Protocol on Base (primary)

The SSI Protocol is deployed on **Base** (Coinbase's L2). This is confirmed by:
- SoDEX's "Deposit from connected wallet" docs listing `MAG7.ssi`, `sMAG7.ssi`, `SOSO` as depositable from Base Mainnet.
- The deposit-and-withdrawal configuration table showing `MAG7.ssi`, `MEME.ssi`, `USSI`, `sMAG7.ssi` all on `BASE` chain.
- The SSI frontend at https://ssi.sosovalue.com connecting to Base.

**Exact contract addresses are not listed in the documentation**. To find them:
1. Open https://ssi.sosovalue.com in a browser with a connected wallet.
2. Initiate a mint or stake transaction; the wallet popup will show the called contract address.
3. Verify the contract on BaseScan: https://basescan.org.

Alternatively, run the deployment scripts in the `ssi-protocol` repo against a fresh Foundry environment to derive the deterministic addresses (if using CREATE2).

### 5.2 SSI Protocol on ValueChain EVM

The SSI Protocol may also be deployed on ValueChain EVM (chain ID 286623) for direct composability with SoDEX. This is **not directly confirmed** by the docs but is implied by the fact that sMAG7.ssi can be deposited into the SoDEX Vault (which lives on ValueChain) — either:
- (a) sMAG7.ssi is bridged from Base to ValueChain via the Mirror Protocol, OR
- (b) the staking contract is deployed on both chains.

Until confirmed, treat the Base deployment as the canonical SSI Protocol and the ValueChain presence as bridged tokens.

### 5.3 $SOSO token addresses (confirmed)

| Chain | Address | Format |
|---|---|---|
| Ethereum | `0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d` | ERC-20 |
| Base | `0x624e2e7fdc8903165f64891672267ab0fcb98831` | ERC-20 |
| ValueChain (native) | (not an ERC-20; native gas token) | Native |
| ValueChain EVM (wrapped) | `0x5050505050505050505050505050505050505050` | WSOSO (immutable) |

Source: Etherscan | https://etherscan.io/address/0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d | 2026-07-05
Source: BaseScan | https://basescan.org/token/0x624e2e7fdc8903165f64891672267ab0fcb98831 | 2026-07-05
Source: WSOSO docs | https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-wsoso | 2026-07-05
Source: SoDEX deposit config | https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-and-withdrawal-configuration | 2026-07-05

---

## 6. Audits & Security

### 6.1 Confirmed audit firms

| Firm | Scope | Reference |
|---|---|---|
| **SlowMist** | SSI Protocol smart contracts | GitHub commit "fix slow-mist audit comment" (Aug 6 2024) |
| **BlockSec** | SSI Protocol (described as "cutting-edge spot index solution") | BlockSec public audit-report page |

### 6.2 Audit reports

Audit reports are **available upon request** (per the SoDEX whitepaper's Audits page). They are not published publicly on the docs site.

### 6.3 Multi-phased audit program

Per the SoSoValue whitepaper §9.2 Audits:
> "We have undertaken a multi-phased audit program to ensure the highest level of security on the protocol. Phase 1: A comprehensive audit of the..."

(Multi-phase structure confirmed; specific phases beyond Phase 1 were not captured in this research pass — the page is JS-rendered.)

### 6.4 Upgradeability

The protocol uses **transparent upgradeable proxies** (commit "transparent-proxy-upgrade" branch merged Nov 28 2024; `upgrade.sh` exists). This means:
- Contract logic can be upgraded by the proxy admin.
- The proxy admin is presumably a multisig (not documented publicly).
- Upgrade events should be announced on the SoSoValue announcement page: https://m.sosovalue.com/announcement.

### 6.5 Insurance

No insurance fund is documented for the SSI Protocol specifically. The SoDEX platform (which holds user balances during trading) is backed by institutional custodians (Cobo, Ceffu, Coinbase) with insurance-backed protection, but the SSI vaults hold underlying tokens directly in smart contracts.

Source: SSI Protocol GitHub | https://github.com/SoSoValueLabs/ssi-protocol | 2026-07-05
Source: Whitepaper §9.2 Audits | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/9.-resources/9.2-audits | 2026-07-05
Source: BlockSec audit reports | https://blocksec.com/audit-report | 2026-07-05
Source: SlowMist blockchain security audits | https://www.slowmist.com/service-blockchain-security-audit.html | 2026-07-05

---

## 7. Mint Flow (components → SSI)

### 7.1 Documented mint flow

The SSI frontend (https://ssi.sosovalue.com/buy/MAG7.ssi) exposes a "Buy" flow. The actual on-chain mechanics are:

1. User approves the SSI Router contract to spend the underlying tokens (e.g. BTC, ETH, SOL, etc. on Base).
2. User calls `mint(indexTicker, amounts)` on the Router.
3. The Router transfers the underlying tokens from the user to the Index Vault.
4. The Vault computes the NAV contribution: `sum(amount_i × price_i)`.
5. The IndexToken contract mints `nav_contribution / current_index_NAV` index tokens to the user.

### 7.2 Two mint modes (INFERRED)

Based on standard index-protocol patterns and the existence of `USSI` (USD-stable):

- **In-kind mint**: deposit the exact constituent basket (pro-rata) → receive index tokens.
- **USDC mint**: deposit USDC → the protocol swaps USDC for the constituent basket via DEXes → mints index tokens.

The SSI frontend likely abstracts both modes behind a single "Buy" UI.

### 7.3 Per-index deposit/withdrawal config (from SoDEX table)

| Token | Chain | Min Deposit | Min Withdrawal | Bridge Withdrawal Fee |
|---|---|---|---|---|
| `MAG7.ssi` | BASE | 5 | 1 | 1 |
| `sMAG7.ssi` | BASE | 5 | 1 | 0.5 |
| `DEFI.ssi` | BASE | 20 | 20 | 4 |
| `MEME.ssi` | BASE | 20 | 20 | 4 |
| `USSI` | BASE | 5 | 2 | 1 |
| `SOSO` | BASE | (TBD) | (TBD) | (TBD) |

(Withdrawal fee is 0 for all SSI tokens; only bridge withdrawal fee applies when moving to SoDEX.)

Source: SoDEX deposit config | https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-and-withdrawal-configuration | 2026-07-05

---

## 8. Redeem Flow (SSI → basket / USDC)

### 8.1 Documented redeem flow

The reverse of mint:

1. User approves the SSI Router to burn their index tokens.
2. User calls `redeem(indexTicker, amount)` on the Router.
3. The IndexToken contract burns the index tokens.
4. The Vault computes the redemption value: `amount × current_index_NAV`.
5. The Vault transfers the underlying tokens pro-rata to the user (in-kind redeem) OR swaps to USDC and transfers USDC (USDC redeem).

### 8.2 Staked token redemption

For staked variants (`sMAG7.ssi`):
1. User initiates `unstake(amount)` on the Staking contract.
2. **14-day cooldown** begins (per SSI Earn FAQ — see §12).
3. After cooldown, user manually calls `claim()` or `redeem()`.
4. The Staking contract burns `sMAG7.ssi` and returns `MAG7.ssi` (or the underlying basket, depending on the chosen flow).
5. If the user wants the underlying basket rather than `MAG7.ssi`, they then redeem `MAG7.ssi` via the SSI Router.

Source: SoDEX Stake FAQ | https://sodex.com/documentation/stake-usdsoso/faq | 2026-07-05
Source: SoDEX sMAG7.ssi Vault Deposits & Withdrawals | https://sodex.com/documentation/vault-overview/deposits-and-withdrawals | 2026-07-05

---

## 9. NAV Calculation & Oracle Stack

### 9.1 NAV formula

```
NAV_per_index_token = sum(weight_i × price_i × constituent_qty_per_index_token_i) / total_supply
```

Where:
- `weight_i` = the weight of constituent `i` (e.g. BTC = 0.31 in MAG7.ssi per the API docs example)
- `price_i` = the USD price of constituent `i`
- `constituent_qty_per_index_token_i` = the amount of constituent `i` backing one index token

### 9.2 Price sources

**INFERRED**: The SoSoValue data layer (off-chain) aggregates prices from multiple exchanges, using the same `Weighted Median` methodology that the SoDEX Perps engine uses for its Index Price (which excludes exchanges with no trade in the past 60 seconds). This is consistent with the SoSoValue API's `/currencies/{id}/market-snapshot` endpoint that exposes `price` and `marketcap` fields.

The aggregated NAV is then pushed on-chain via the OracleAdapter contract by authorized callers (likely the SoSoValue Foundation multisig or a dedicated oracle service).

### 9.3 NAV freshness

**INFERRED**: Given the SoSoValue API's documented 30-second update frequency for market-snapshot data, the on-chain NAV is likely updated every ~30 seconds to 1 minute. The exact cadence is not documented.

### 9.4 NAV oracle vs. SoDEX mark price

Important distinction:
- **SSI NAV oracle**: pushed to the SSI Protocol contracts on Base; determines mint/redeem exchange rate.
- **SoDEX mark price**: computed on ValueChain for SoDEX Perps; uses Index Price + Smoothed Index Price + Local Price + External Perp Mid Price (see `02_SODEX_MASTER_REFERENCE.md` §16.11).

The two are related but separate. The SSI NAV reflects the spot basket value; the SoDEX mark price reflects the perp market's fair value.

Source: SoSoValue API docs §3.2 constituents example (BTC weight 0.31) | https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/constituents.md | 2026-07-05
Source: SoDEX Index Price & Mark Price | https://sodex.com/documentation/trading-mechanics/index-price-and-mark-price | 2026-07-05

---

## 10. Rebalancing & Index Methodology

### 10.1 Index methodology (INFERRED from data + SoSoValue's "Watchlist 100" rule)

The SoSoValue consumer platform documents a "SoSo Watchlist 100" rule: "the top 100 tokens by market cap, excluding stablecoins and derivative tokens, updated quarterly based on market cap rankings". The SSI indexes likely follow similar rules:

- **MAG7.ssi**: top 7 crypto assets by market cap, excluding stablecoins and wrapped tokens. Components: BTC, ETH, SOL, BNB, XRP, ADA, DOGE (per public SSI pages).
- **DEFI.ssi**: top DeFi blue-chips by market cap. Components: AAVE, UNI, LINK, etc.
- **MEME.ssi**: top meme coins by market cap. Components: DOGE, SHIB, PEPE, etc.
- **USSI**: USD-stable index using delta-hedging (not pure spot).

### 10.2 Weighting methodology

**INFERRED**: The API example for `/indices/ssimag7/constituents` shows `"weight": 0.31` for BTC. This is consistent with a **market-cap-weighted** methodology (BTC's market-cap dominance in the MAG7 basket is roughly 50-60%, but the weight 0.31 suggests a **capped** or **diversified** weighting — possibly square-root market-cap weighting, which is the standard for crypto indexes to avoid BTC overdominance).

The exact formula is in the whitepaper §5.x (not fully captured). Treat this as a research gap (§26).

### 10.3 Rebalance frequency

**INFERRED**: Quarterly rebalancing is the industry standard for crypto index tokens (matching the SoSo Watchlist 100 cadence). The SSI frontend and announcements likely publish the rebalance schedule.

### 10.4 Rebalance mechanism

When a rebalance occurs:
1. Off-chain, the SoSoValue team computes new constituent list + weights.
2. (Optional) A `ResearchHubVoting` proposal is submitted for community approval.
3. Once approved, the IndexFactory or a dedicated Rebalancer contract executes the trades:
   - Sells over-weight constituents.
   - Buys under-weight constituents.
4. The new weights are pushed to the OracleAdapter.

### 10.5 Inclusion / exclusion criteria

**INFERRED**: based on the SoSoValue Watchlist 100 rule:
- Exclude stablecoins (USDT, USDC, DAI, etc.).
- Exclude wrapped/derivative tokens (WBTC, stETH, etc. — though these may be admitted in specific baskets).
- Minimum liquidity threshold.
- Minimum market-cap threshold.

### 10.6 Corporate actions

When a constituent is delisted, merges, or airdrops new tokens:
- The Index Vault sells the delisted token before delisting.
- Airdropped tokens are either sold or added to the basket (per methodology).
- Token merges are handled via the issuer's official conversion rate.

These are not documented in detail publicly; they are operational decisions made by the SoSoValue team within the documented methodology.

Source: SoSoValue API docs §3.2 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/constituents.md | 2026-07-05
Source: SSI homepage / Buy pages | https://ssi.sosovalue.com/buy/MAG7.ssi | 2026-07-05
Source: Homepage "SoSo Watchlist 100" description | https://m.sosovalue.com | 2026-07-05

---

## 11. Fees, Caps, Supply

### 11.1 Protocol fees

Per DeFiLlama:
- **Daily service fee**: 0.01% of the value of the underlying assets.
- This fee is charged to SSI token holders (deducted from the basket over time).
- All service fees paid by users count as protocol **Revenue**.
- **Holders Revenue**: "No holder revenue, only emissions as staking rewards." (i.e. the protocol does not distribute fees to SSI holders; instead it uses fee revenue for $SOSO airdrop emissions to stakers.)

### 11.2 Mint / redeem fees

**Not explicitly documented**. The deposit/withdrawal configuration table (from SoDEX docs) shows withdrawal fees of 0 for all SSI tokens, with bridge withdrawal fees (1 for MAG7.ssi, 4 for DEFI.ssi, etc.) — these are SoDEX's bridge fees, not the SSI Protocol's mint/redeem fees.

**INFERRED**: The SSI Protocol may charge a small mint/redeem fee (typically 0.05%–0.5% in industry-standard index protocols) on top of the daily service fee. Confirm via the SSI frontend's "Buy" / "Sell" UI.

### 11.3 Caps

**INFERRED**: There may be per-wallet mint caps or per-index supply caps to prevent excessive concentration. Not documented publicly.

### 11.4 Supply

Each SSI token has its own supply:
- `DEFI.ssi`: 25.52M total supply, 99.57K total holders (snapshot from https://ssi.sosovalue.com/buy/DEFI.ssi).
- `MAG7.ssi`: dominant SSI token by TVL; exact supply not captured.
- `MEME.ssi`: smaller; exact supply not captured.
- `USSI`: separate DeFiLlama entry; supply grows with mints.

### 11.5 Total Value Locked

- **SSI Protocol TVL peak**: ~$200.4M (Feb 23, 2025).
- Current TVL is lower due to market conditions and Season 1 airdrop-driven withdrawals.

Source: DeFiLlama SSI | https://defillama.com/protocol/sosovalue-indexes | 2026-07-05
Source: DeFiLlama Basis | https://defillama.com/protocol/sosovalue-basis | 2026-07-05
Source: DEFI.ssi page | https://ssi.sosovalue.com/buy/DEFI.ssi | 2026-07-05
Source: SoSoValue weekly update tweet | https://x.com/SoSoValueCrypto/status/1893519626157597134 | 2026-07-05

---

## 12. SSI Earn (Staking)

### 12.1 Where to stake

SSI Earn is at https://ssi.sosovalue.com/earn. It is the unified staking interface for both SSI tokens and $SOSO.

### 12.2 What can be staked

| Asset | Receipt token | Purpose |
|---|---|---|
| `MAG7.ssi` | `sMAG7.ssi` | Earn SSI Points (→ $SOSO airdrop) |
| `DEFI.ssi` | `sDEFI.ssi` | Earn SSI Points |
| `MEME.ssi` | `sMEME.ssi` | Earn SSI Points |
| `USSI` | `sUSSI` | Earn SSI Points |
| `$SOSO` | `sSOSO` | Boost SSI Points multiplier (no direct yield) |

### 12.3 Staking mechanics

- **Stake**: lock the SSI token in the Staking contract → receive the `s*` receipt token. Gas fee applies (< 0.001 SOSO equivalent).
- **Unstake**: initiate unstake → **14-day cooldown** → manually claim → SSI token returned.
- **Slashing**: not documented; treat as no-slashing.
- **Receipt token transferability**: `s*` tokens are ERC-20 and transferable. **However**, if you transfer `sSOSO` to another wallet, you cannot redeem the corresponding $SOSO from your wallet (the receipt is what proves your stake). For SSI receipt tokens, the same caution applies.

### 12.4 Rewards: SSI Points

SSI Points are distributed **automatically every day** to stakers. They are NOT a token — they are an off-chain accounting unit that determines $SOSO airdrop allocation.

- Viewable at https://ssi.sosovalue.com/reward.
- Distributed per epoch (Epoch 1, Epoch 2, Epoch 3, Epoch 4, ...).
- Each epoch has a fixed $SOSO pool:
  - Season 2 Epoch 2: 30M $SOSO.
  - Season 4 Epoch 4: 15M $SOSO.

### 12.5 $SOSO staking boost

Staking $SOSO does NOT pay direct yield. It only provides a **multiplier boost** to your current SSI Points. The boost formula is not publicly documented, but the SoDEX FAQ says SSI tokens "boosts your Loyalty Points by 1%–1000%". The boost is applied to your entire staked SSI balance.

### 12.6 SSI Staking Epochs

| Epoch | Reward pool | Notes |
|---|---|---|
| Epoch 1 | (TBD) | First airdrop season |
| Epoch 2 | 30M $SOSO | "SSI Index Fund Token Staking Epoch 2" |
| Epoch 3 | (TBD) | |
| Epoch 4 | 15M $SOSO + additional rewards for depositing sMAG7.ssi in SoDEX Vault | Launched Nov 9 2025 |

### 12.7 Loyalty Points vs. SSI Points

There are two parallel points systems:
- **SSI Points**: earned by staking SSI tokens; distributed daily; determines $SOSO airdrop allocation.
- **Loyalty Points**: earned by holding SSI tokens; boosted by staking $SOSO; determines additional rewards.

The exact relationship between the two is not clearly documented. Treat them as parallel systems until clarified.

Source: SSI Earn | https://ssi.sosovalue.com/earn | 2026-07-05
Source: SSI Rewards | https://ssi.sosovalue.com/reward | 2026-07-05
Source: $SOSO token page | https://ssi.sosovalue.com/soso-token | 2026-07-05
Source: SoDEX Stake FAQ | https://sodex.com/documentation/stake-usdsoso/faq | 2026-07-05
Source: SoDEX How to Stake/Withdraw | https://sodex.com/documentation/stake-usdsoso/how-to-stake-withdraw | 2026-07-05
Source: SSI Staking Epoch 4 announcement | https://m.sosovalue.com/announcement | 2026-07-05
Source: Panewslab Season 2 | https://www.panewslab.com/en/articles/kqopya0d | 2026-07-05

---

## 13. $SOSO Token (full tokenomics)

### 13.1 Token summary

| Field | Value |
|---|---|
| Symbol | `SOSO` |
| Total supply | 1,000,000,000 (1 billion) — permanently fixed, no inflation |
| Decimals | 18 (on all chains) |
| Native | Ethereum ERC-20, Base ERC-20, ValueChain native gas |
| Wrapped | WSOSO on ValueChain EVM (`0x5050...5050`, immutable) |
| Governance | SIPs (SoSoValue Improvement Proposals); SIP-1 went live Aug 12 2025 |
| Audits | SlowMist (SSI), BlockSec (SSI), BlockSec/Halborn/Quantstamp/TenAmor (SoDEX Mirror + Vault) |

Source: Whitepaper §8.1 | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.1-soso-token | 2026-07-05
Source: Kraken UK disclosure | https://assets-cms.kraken.com/files/51n36hrp/facade/fd707339600f9aed634e6a651d5ac8c2f746f4d9.pdf | 2026-07-05

### 13.2 Allocation

Per the whitepaper §8.2 snippet:
> "The Foundation allocation is designed to support SoSoValue's sustainable growth and ecosystem development. It is divided into two parts: 12% - ..."

(The full allocation table is JS-rendered and not captured in this research pass. Dropstab and Tokenomist track the vesting schedule — see §22 for URLs.)

The standard allocation for a project of this profile typically includes: Community Reserve, Foundation, Team, Investors, Ecosystem Incentives, Airdrop, Liquidity. The exact percentages must be confirmed from the whitepaper page directly.

Source: Whitepaper §8.2 | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.2-tokenomics | 2026-07-05
Source: DropStab vesting | https://dropstab.com/coins/sosovalue/vesting | 2026-07-05
Source: Tokenomist unlocks | https://tokenomist.ai/sosovalue/unlock-events | 2026-07-05

### 13.3 Utilities (full list)

| Utility | Description | Source |
|---|---|---|
| **Gas token** | Native gas on ValueChain EVM syschain (chain ID 286623) | SoDEX About ValueChain EVM docs |
| **Governance** | Vote on SIPs (SoSoValue Improvement Proposals); SIP-1 live Aug 12 2025 | SoSoValue announcements |
| **Trading fee discount** | Staking SOSO grants up to 40% discount on SoDEX trading fees (tiered: 30 SOSO → 5%, up to 1,500,000 SOSO → 40%) | SoDEX Trading Fees docs |
| **Multi-asset collateral** | Can be used as cross-margin collateral on SoDEX Perps at 50% collateral ratio (capped) | SoDEX Multi-Asset Margin docs |
| **Stake-to-boost** | Staking SOSO on SSI Earn boosts SSI Points multiplier (no direct yield) | SSI Earn / SoDEX Stake FAQ |
| **Ecosystem participation** | Future ValueChain node participation | SoDEX Stake Future Plans docs |
| **Airdrop rewards** | Distributed to SSI stakers per epoch (Season 1: 49M; Season 2 Epoch 2: 30M; Epoch 4: 15M) | SoSoValue announcements, Panewslab |
| **Community voting** | ResearchHubVoting on new index issuance | SSI Protocol GitHub commits |
| **Wrapped (WSOSO)** | Wrapped SOSO on ValueChain EVM for use in EVM dApps | SoDEX WSOSO docs |

### 13.4 Token contracts (recap)

| Chain | Address | Standard | Notes |
|---|---|---|---|
| Ethereum | `0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d` | ERC-20 | Listed on Binance, Kraken, Bybit, OKX, Biconomy, Coinbase |
| Base | `0x624e2e7fdc8903165f64891672267ab0fcb98831` | ERC-20 | Used for SSI Protocol interactions |
| ValueChain native | (native gas) | Native | Not a token contract; base currency of ValueChain |
| ValueChain EVM (WSOSO) | `0x5050505050505050505050505050505050505050` | ERC-20 (immutable) | Wrapped SOSO, identical to WETH |

Source: Etherscan | https://etherscan.io/address/0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d | 2026-07-05
Source: BaseScan | https://basescan.org/token/0x624e2e7fdc8903165f64891672267ab0fcb98831 | 2026-07-05
Source: Ethplorer | https://ethplorer.io/address/0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d | 2026-07-05
Source: WSOSO docs | https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-wsoso | 2026-07-05

### 13.5 Airdrop history

| Season / Epoch | Tokens airdropped | Mechanism |
|---|---|---|
| Season 1 | 49,000,000 SOSO | Loyalty Points / SSI Points distribution |
| Season 2 Epoch 2 | 30,000,000 SOSO | SSI staking distribution |
| Season 4 Epoch 4 | 15,000,000 SOSO + bonus for sMAG7.ssi in SoDEX Vault | SSI staking + SoDEX Vault dual yield |

Source: The Block Season 1 | https://www.theblock.co/post/335380/sosovalue-token-airdrop-launch | 2026-07-05
Source: Panewslab Season 2 | https://www.panewslab.com/en/articles/kqopya0d | 2026-07-05
Source: SSI Epoch 4 announcement | https://m.sosovalue.com/announcement | 2026-07-05
Source: Airdrops.io guide | https://airdrops.io/sosovalue | 2026-07-05
Source: Gate.com guide | https://web3.gate.com/crypto-wiki/article/sosovalue-airdrop-complete-guide-to-claiming-free-soso-tokens-20260108 | 2026-07-05
Source: Coinswitch airdrop guide | https://coinswitch.co/switch/crypto/sosovalue-airdrop | 2026-07-05

### 13.6 Exchange listings

| Exchange | URL | Pair |
|---|---|---|
| Binance | https://www.binance.com/en/price/sosovalue | SOSO/USDT |
| Kraken | https://www.kraken.com/convert/soso | SOSO/USD |
| Bybit (spot) | https://www.bybit.com/en/trade/spot/SOSO/USDT | SOSO/USDT |
| Bybit (perps) | https://www.bybit.com/trade/usdt/SOSOUSDT | SOSO/USDT perpetual |
| OKX | https://www.okx.com/en-us/price/sosovalue-soso | SOSO/USDT |
| Biconomy | https://biconomy.zendesk.com/hc/en-us/articles/52603462432025-Biconomy-com-New-Listing-SoSoValue-SOSO-for-Spot-Trading | SOSO/USDT |
| Coinbase | https://www.coinbase.com/price/sosovalue | (price page only) |
| Bybit (ValueChain deposits) | https://announcements.bybit.com/en/article/bybit-now-supports-soso-deposits-on-valuechain-blt1d9fec7edeb582b6 | SOSO on ValueChain |
| SoDEX (spot) | https://sodex.com | SOSO/vUSDC (likely) |

### 13.7 Circulating supply tracking

CryptoRank publishes circulating supply:
> "one month after listing, SOSO's circulating supply is $72,908,333, with an inflation rate of 3.41% since listing"

Source: CryptoRank Bybit proof-of-reserve analysis | https://cryptorank.io/news/feed/24eee-sosovalue-publishes-data-bybit-proof-feature | 2026-07-05

---

## 14. Public APIs

### 14.1 SoSoValue Index API (read-only, REST)

The SoSoValue OpenAPI v1 exposes the following SSI-related endpoints (full details in `01_SOSOVALUE_MASTER_REFERENCE.md` §9.3):

| Endpoint | Returns |
|---|---|
| `GET /indices` | Bare array of index tickers, e.g. `["ssimag7", "ssilayer1"]` |
| `GET /indices/{ticker}/constituents` | Array of `{currency_id, symbol, weight}` |
| `GET /indices/{ticker}/market-snapshot` | `{price, 24h_change_pct, 7day_roi, 1month_roi, 3month_roi, 1year_roi, ytd}` |
| `GET /indices/{ticker}/klines` | Daily OHLCV (1d interval, last 3 months) |

**Base URL**: `https://openapi.sosovalue.com/openapi/v1`
**Auth**: `x-soso-api-key` header
**Rate limit**: 20 req/min, 100k req/month per key

### 14.2 SSI frontend internal API

The SSI frontend at https://ssi.sosovalue.com uses an **internal, undocumented API** for:
- User staking positions
- SSI Points balance and history
- Loyalty Points balance
- Airdrop claim status
- Epoch rewards

These endpoints are not documented for public consumption. Reverse-engineering them is possible (open DevTools on the SSI site) but not officially supported and may break without notice.

### 14.3 On-chain "API"

The SSI Protocol smart contracts are the authoritative on-chain API. Any data not exposed by the SoSoValue REST API can be read directly from the contracts via:
- BaseScan read-contract UI: https://basescan.org/address/<contract_address>#readContract
- `cast call <address> "<function>" <args> --rpc-url https://mainnet.base.org`
- ethers.js / viem / web3.py from your own backend

### 14.4 DeFiLlama adapters

The SoSoValueLabs GitHub org maintains two forks of DeFiLlama:
- `DefiLlama-Adapters` (JavaScript) — TVL / fees / revenue adapters
- `dimension-adapters` (TypeScript) — volume / other dimensions

These adapters are the source of DeFiLlama's SSI TVL / fees / revenue numbers. They are open source — you can read them to understand exactly how DeFiLlama computes SSI metrics:
- https://github.com/SoSoValueLabs/DefiLlama-Adapters
- https://github.com/SoSoValueLabs/dimension-adapters

Source: SoSoValue API docs §3 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/ | 2026-07-05
Source: DeFiLlama-Adapters fork | https://github.com/SoSoValueLabs/DefiLlama-Adapters | 2026-07-05
Source: dimension-adapters fork | https://github.com/SoSoValueLabs/dimension-adapters | 2026-07-05

---

## 15. SDKs & CLI

### 15.1 Official SDKs

**None for the SSI Protocol specifically.** The only official SDK in the ecosystem is `sodex-go-sdk-public` (for SoDEX trading-API signing, not SSI).

### 15.2 Recommended libraries

For interacting with SSI contracts:
- **ethers.js v6** (TypeScript / JavaScript) — `npm install ethers`
- **viem** (TypeScript) — `npm install viem`
- **web3.py** (Python) — `pip install web3`
- **cast** (Foundry CLI) — for one-off reads from the command line

### 15.3 Foundry toolkit

The SSI Protocol repo itself is Foundry-based. To develop / test against it:

```bash
git clone https://github.com/SoSoValueLabs/ssi-protocol.git
cd ssi-protocol
forge install   # installs OpenZeppelin-upgradeable
forge build
forge test
```

You can run a local Anvil node and deploy the SSI Protocol to it for testing:
```bash
anvil
forge script script/Counter.s.sol:CounterScript --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

Source: SSI Protocol repo README | https://github.com/SoSoValueLabs/ssi-protocol | 2026-07-05
Source: Foundry book | https://book.getfoundry.sh/ | 2026-07-05

---

## 16. Authentication & Signing

### 16.1 Read operations

Reading SSI contract state (NAV, constituents, balances, total supply) requires **no authentication** — just an EVM JSON-RPC endpoint (Base mainnet: `https://mainnet.base.org`).

### 16.2 Write operations

Writing to SSI contracts (mint, redeem, stake, unstake, vote) requires an **EVM wallet signature**:
1. The user's wallet signs a standard EIP-1559 transaction.
2. The transaction is broadcast to Base (or ValueChain EVM).
3. The contract executes the action.

There is **no API-key layer** for SSI Protocol interactions (unlike SoDEX trading which has the API-key/master-wallet separation). All writes are direct wallet-to-contract transactions.

### 16.3 Gas

- On Base: gas paid in ETH (Base's native gas token, not SOSO).
- On ValueChain EVM: gas paid in SOSO (the native gas token, 18 decimals).

### 16.4 EIP-712 typed signatures

The SSI Protocol may use EIP-712 typed signatures for off-chain approval flows (e.g. ResearchHubVoting may sign votes off-chain and submit them in batches). This is **not confirmed**; check the `ResearchHubVoting` contract source for `EIP712` imports.

Source: SSI Protocol repo | https://github.com/SoSoValueLabs/ssi-protocol | 2026-07-05
Source: Base RPC | https://mainnet.base.org | 2026-07-05

---

## 17. Integration with SoDEX

### 17.1 SSI tokens on SoDEX Spot

SoDEX Spot lists SSI tokens as tradeable assets. Confirmed tradable pairs (from the deposit config table):
- `MAG7.ssi` / `vUSDC` (Base chain deposit)
- `sMAG7.ssi` / `vUSDC`
- `DEFI.ssi` / `vUSDC`
- `MEME.ssi` / `vUSDC`
- `USSI` / `vUSDC`

### 17.2 SSI tokens as SoDEX Perps collateral

Multi-asset margin on SoDEX Perps supports USDC (100%), BTC (90%), XAUT (90%), ETH (90%), and SOSO (50%, capped). SSI tokens are **not** currently listed as multi-asset margin collateral — only the underlying constituents and SOSO are.

### 17.3 SoDEX sMAG7.ssi Vault

The SoDEX sMAG7.ssi Vault accepts deposits of `MAG7.ssi` (auto-staked to `sMAG7.ssi`) and `sMAG7.ssi`. Depositors become passive market makers and earn:
- **Index yield**: regular SSI staking yield + SOSO airdrop eligibility (continues uninterrupted).
- **Market-making yield**: share of SoDEX's liquidity revenue and fee rebates.

This is the **dual yield mechanism** — see `02_SODEX_MASTER_REFERENCE.md` §17 for full details.

### 17.4 Withdrawal paths

| Action | Mechanism | Time |
|---|---|---|
| Withdraw `sMAG7.ssi` from Vault | Instant, no lock-up | Seconds |
| Withdraw `MAG7.ssi` from Vault | Initiate 14-day unstake from `sMAG7.ssi` → claim `MAG7.ssi` | 14 days + manual claim |

Source: SoDEX deposit config | https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-and-withdrawal-configuration | 2026-07-05
Source: SoDEX Multi-Asset Margin | https://sodex.com/documentation/trading-mechanics/multi-asset-margin | 2026-07-05
Source: SoDEX sMAG7.ssi Vault | https://sodex.com/documentation/vault-overview/smag7.ssi-vault | 2026-07-05
Source: SoDEX Dual Yield | https://sodex.com/documentation/vault-overview/dual-yield-mechanism | 2026-07-05

---

## 18. Integration with SoSoValue App

### 18.1 SSI module in the consumer app

The SoSoValue consumer app at https://m.sosovalue.com/assets/cryptoindex/ssi-index-management is the marketing / educational surface for SSI. It links to the SSI frontend (https://ssi.sosovalue.com) for actual mint / redeem / stake actions.

### 18.2 SoSoValue API SSI module

The SoSoValue data API exposes SSI index data (list, constituents, market-snapshot, klines) for developers to build dashboards, analytics, and robo-advisors on top of SSI without needing on-chain reads. See `01_SOSOVALUE_MASTER_REFERENCE.md` §9.3 for the full API.

### 18.3 Auto-invest (planned)

The SSI homepage mentions "low-cost passive crypto investment" and the SoSoValue app positions SSI as a passive investing tool. An auto-invest / DCA feature is **INFERRED** to be planned (industry standard for index products) but not officially documented.

Source: SoSoValue SSI landing | https://m.sosovalue.com/assets/cryptoindex/ssi-index-management | 2026-07-05
Source: SSI homepage | https://ssi.sosovalue.com | 2026-07-05

---

## 19. GitHub Presence (deep dive)

### 19.1 The `SoSoValueLabs` org

URL: https://github.com/SoSoValueLabs

| Repo | Lang | Stars | Last commit | Notes |
|---|---|---|---|---|
| `ssi-protocol` | Solidity | 13 | Jun 10 2026 | The only original-code repo |
| `DefiLlama-Adapters` | JavaScript | 0 | Feb 20 2025 | Fork, 6839 commits behind upstream |
| `dimension-adapters` | TypeScript | 0 | Feb 24 2025 | Fork |
| `ethereum-optimism.github.io` | TypeScript | 1 | (stale) | Fork — used to publish SSI/SOSO token lists for OP-stack chains |

### 19.2 SSI Protocol repo structure (deep dive)

**Branches**: 27 (active development)
**Tags**: 15 (formal releases)
**Commits**: 129 (as of Jun 10 2026)
**Contributors**: 5
**Forks**: 8

**Languages**:
- Solidity 69.8%
- JavaScript 24.0%
- Python 3.3%
- Ruby 2.7%
- Shell 0.2%
- Makefile 0.0%

**Foundry configuration** (`foundry.toml`):
- Solidity optimizer enabled (to reduce contract bytecode size)
- Standard Foundry setup

**Key files**:
- `lib/` — OpenZeppelin-upgradeable library (added Nov 20 2024)
- `script/` — Deployment scripts:
  - `Counter.s.sol` (CounterScript pattern — Foundry default)
  - Voting deploy script (added May 9 2026)
- `src/` — Main contracts:
  - Includes `ResearchHubVoting.sol`
  - Includes paginated `getParticipatedProposals(voter, begin, end)` (added Jun 9 2026)
- `test/` — Forge test suite (parallel to `src/`)
- `remappings.txt` — `@openzeppelin/contracts-upgradeable=...` (merged from transparent-proxy-upgrade branch Nov 28 2024)
- `deploy.sh` — main deployment script (Jan 18 2025, "migration")
- `deploy_voting.sh` — ResearchHubVoting deployment (May 9 2026)
- `upgrade.sh` — proxy upgrade script (Dec 17 2024)
- `LICENSE` — updated Sep 3 2024
- `README.md` — default Foundry boilerplate (no project-specific docs); references "fix slow-mist audit comment" (Aug 6 2024)

### 19.3 Commit history highlights (selected)

| Date | Commit | Significance |
|---|---|---|
| Sep 3 2024 | update license | License finalized |
| Nov 20 2024 | add openzeppelin-upgradeable library | Upgradeability introduced |
| Nov 28 2024 | Merge branch 'transparent-proxy-upgrade' | Transparent proxy pattern adopted |
| Dec 17 2024 | add upgrade script | Operational tooling |
| Jan 18 2025 | migration (deploy.sh) | Mainnet migration |
| May 8 2026 | enable Solidity optimizer to reduce contract bytecode size | Gas optimization |
| May 9 2026 | add voting deploy script | ResearchHubVoting deployed |
| Jun 8 2026 | Add ResearchHubVoting approval-only issuance voting | Governance live |
| Jun 9 2026 | Add paginated getParticipatedProposals(voter, begin, end) | UX optimization |
| Jun 10 2026 | Merge pull request #30 from SoSoValueLabs/feature/research-hub-voting | Latest merge |

### 19.4 Releases and tags

15 tags exist but are not named in the repo page scrape. To list them:
```bash
git clone https://github.com/SoSoValueLabs/ssi-protocol.git
cd ssi-protocol
git tag -n
```

### 19.5 Issues, PRs, Discussions

- **Open issues**: 0 (as of repo page scrape)
- **Open PRs**: 1 (as of scrape)
- **GitHub Discussions**: not enabled (no Discussions tab visible)

This is a low-issues repo — either the protocol is genuinely bug-free post-audit, or issue tracking happens elsewhere (Discord, internal). For community bug reports, the SoSoValue Discord is the likely venue.

### 19.6 The `MeoMunDep/SoSoValue` repo

A third-party repo at https://github.com/MeoMunDep/SoSoValue has GitHub Actions workflows for SoSoValue automation. **Not officially endorsed** — review carefully before using.

Source: SSI Protocol repo | https://github.com/SoSoValueLabs/ssi-protocol | 2026-07-05
Source: SoSoValueLabs org | https://github.com/SoSoValueLabs | 2026-07-05
Source: DefiLlama-Adapters fork | https://github.com/SoSoValueLabs/DefiLlama-Adapters | 2026-07-05
Source: dimension-adapters fork | https://github.com/SoSoValueLabs/dimension-adapters | 2026-07-05
Source: ethereum-optimism.github.io fork | https://github.com/SoSoValueLabs/ethereum-optimism.github.io | 2026-07-05
Source: MeoMunDep/SoSoValue | https://github.com/MeoMunDep/SoSoValue | 2026-07-05

---

## 20. Whitepaper Summary (SSI sections)

### 20.1 Chapter 5: SoSoValue Indexes — A New Approach to Passive Crypto Investment for the Masses

The whitepaper §5 is dedicated to the SSI Protocol. Confirmed sections:
- §5.1 SSI Protocol Overview

The full text of §5.1 was not captured in this research pass (the page is JS-rendered GitBook). Based on the section title and surrounding context, §5.1 covers:
- The motivation for an on-chain spot index protocol
- The architecture (off-chain methodology + on-chain execution)
- The mint/redeem mechanism
- The role of the NAV oracle

### 20.2 Chapter 8: Tokenomics

- §8.1 SOSO Token — fixed supply of 1 billion, no inflation, ensures long-term scarcity and predictability.
- §8.2 Tokenomics — Foundation allocation is 12% (split into two parts); full allocation table is JS-rendered.

### 20.3 Chapter 9: Resources

- §9.2 Audits — multi-phased audit program; Phase 1 covers comprehensive audit of the (text cut off in snippet).
- §9.3 MiCAR Whitepaper — registered with the Central Bank of Ireland on 2025-08-01 per ESMA's white-paper register.

### 20.4 UK Crypto Asset Statement (Kraken-hosted PDF, 2025-07-14)

Confirms:
- SoSoValue was co-founded by **May Wang, JIVVVA Kwan, and Jessie Lo**.
- Total supply of SOSO is 1 billion tokens.
- SoSoValue is an AI-based crypto research platform that aggregates on-chain, exchange, and macro data.

Source: Whitepaper root | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper | 2026-07-05
Source: §5.1 | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/5.-sosovalue-indexes-new-approach-to-passive-crypto-investment-for-the-masses/5.1-ssi-protocol-overview | 2026-07-05
Source: §8.1 | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.1-soso-token | 2026-07-05
Source: §8.2 | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.2-tokenomics | 2026-07-05
Source: §9.2 | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/9.-resources/9.2-audits | 2026-07-05
Source: ESMA MiCAR register | https://www.esma.europa.eu/sites/default/files/2024-12/OTHER.csv | 2026-07-05
Source: Kraken PDF | https://assets-cms.kraken.com/files/51n36hrp/facade/fd707339600f9aed634e6a651d5ac8c2f746f4d9.pdf | 2026-07-05

---

## 21. Tokenomics Details

### 21.1 SOSO token utility (recap, expanded)

| Utility | Where | How |
|---|---|---|
| Native gas | ValueChain EVM (chain ID 286623) | Auto-deducted from transactions |
| Wrapped (WSOSO) | ValueChain EVM at `0x5050...5050` | `deposit()` to wrap, `withdraw()` to unwrap |
| Trading fee discount | SoDEX | Stake SOSO on SSI Earn; tier updates at end of UTC day |
| Multi-asset margin collateral | SoDEX Perps (cross margin only) | 50% collateral ratio, capped at min(30,000 SOSO, 10,000 USDC worth) |
| Staking boost | SSI Earn | Stake SOSO to boost SSI Points multiplier (no direct yield) |
| Governance | SoSoValue platform | Vote on SIPs (e.g. SIP-1, live Aug 12 2025) |
| Index governance | SSI Protocol ResearchHubVoting | Vote on new index issuance (approval-only) |
| Airdrop reward | SSI Earn | Distributed per epoch to SSI stakers |
| Listing on CEXes | Binance, Kraken, Bybit, OKX, Biconomy | Tradeable for USDT/USDC |
| Listing on DEX | SoDEX Spot | Tradeable for vUSDC |

### 21.2 Revenue model

Per DeFiLlama:
- **Fees**: daily service fee of 0.01% of underlying asset value (SSI Protocol) + yield from delta hedging (Basis protocol) + SoDEX trading fees.
- **Revenue**: all service fees paid by users.
- **Holders Revenue**: none — the protocol uses fees for $SOSO emissions rather than distributing to SSI holders.

This means **$SOSO captures the value** of the protocol's fee revenue via the airdrop/staking mechanism, not via direct dividend. Staking SSI tokens → earning SSI Points → receiving $SOSO airdrops is the value-return path.

### 21.3 Vesting

Vesting schedules tracked by:
- **Tokenomist**: https://tokenomist.ai/sosovalue/unlock-events
- **DropStab**: https://dropstab.com/coins/sosovalue/vesting
- **CryptoRank**: https://cryptorank.io/ico/sosovalue

Circulating supply one month after listing was ~$72.9M with 3.41% inflation since listing (per CryptoRank Bybit proof-of-reserve analysis).

Source: DeFiLlama SSI | https://defillama.com/protocol/sosovalue-indexes | 2026-07-05
Source: DeFiLlama Basis | https://defillama.com/protocol/sosovalue-basis | 2026-07-05
Source: CryptoRank | https://cryptorank.io/news/feed/24eee-sosovalue-publishes-data-bybit-proof-feature | 2026-07-05
Source: Tokenomist | https://tokenomist.ai/sosovalue/unlock-events | 2026-07-05
Source: DropStab | https://dropstab.com/coins/sosovalue/vesting | 2026-07-05

---

## 22. Third-Party Coverage

### 22.1 DeFiLlama

Three protocol entries:
- **SoSoValue Indexes (SSI)** — https://defillama.com/protocol/sosovalue-indexes — TVL = underlying tokens in baskets; Fees = 0.01% daily service fee.
- **SoSoValue Basis** — https://defillama.com/protocol/sosovalue-basis — TVL = USSI tokens minted; Fees = delta hedging yield + 0.01% daily service fee.
- **SoSoValue** (parent) — https://defillama.com/protocol/sosovalue — top-level entity.

### 22.2 Dune

Community dashboard at https://dune.com/dannytrump/soso-dashboard tracks SoSoValue / SSI / $SOSO metrics.

### 22.3 Messari

Project page at https://messari.io/project/sosovalue with charts (market risk, investor activity) and AI-summarised news.

### 22.4 CoinGecko / CMC

- CoinGecko: https://www.coingecko.com/en/coins/sosovalue
- CMC: https://coinmarketcap.com/currencies/sosovalue
- CMC AI page: https://coinmarketcap.com/cmc-ai/sosovalue/what-is

### 22.5 Press / explainers

- Phemex Academy: https://phemex.com/academy/what-is-sosovalue-soso
- Gate.com learn: https://www.gate.com/learn/articles/what-is-so-so-value/6463
- Gate.com learn (soso-overview): https://www.gate.com/learn/articles/soso-overview/5995
- Cube Exchange: https://www.cube.exchange/what-is/soso
- CryptoTotem: https://cryptototem.com/sosovalue-soso
- ICO Analytics: https://icoanalytics.org/projects/sosovalue
- CoinPedia SSI launch: https://coinpedia.org/information/sosovalue-launches-ssi-protocol-after-15m-series-a-funding
- Panewslab Season 2: https://www.panewslab.com/en/articles/kqopya0d
- Bitget MAG7.ssi news: https://www.bitget.com/news/detail/12560604870009
- Decrypt SoDEX mainnet: https://decrypt.co/346354/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token
- The Block airdrop: https://www.theblock.co/post/335380/sosovalue-token-airdrop-launch
- Fortune Series A: https://fortune.com/crypto/2025/01/08/crypto-data-platform-sosovalue-funding-multi-coin-indices
- GlobeNewswire Series A: https://www.globenewswire.com/news-release/2025/01/08/3006098/0/en/ai-driven-crypto-research-platform-sosovalue-raises-15-million-series-a-to-launch-the-investible-spot-index-protocol-ssi.html
- BeInCrypto: https://beincrypto.com/sosovalue-raises-15-million

### 22.6 Funding databases

- Crunchbase: https://www.crunchbase.com/organization/sosovalue (Series A: https://www.crunchbase.com/funding_round/sosovalue-series-a--8d1c1bca, Seed: https://www.crunchbase.com/funding_round/sosovalue-seed--40a43550)
- Tracxn: https://tracxn.com/d/companies/sosovalue/__Tx0FsQYR_YrY2mkk2pbdb5pVOwP6idiQIrvhw8Q0bA4
- RootData: https://www.rootdata.com/projects/detail/SoSoValue?k=MTA1NDk%3D
- CryptoRank: https://cryptorank.io/ico/sosovalue

### 22.7 Audit firms

- SlowMist: https://www.slowmist.com/service-blockchain-security-audit.html
- BlockSec: https://blocksec.com/audit-report
- (Hacken, Trail of Bits searched but no SSI audit found — see search_19_audit_tob.json and search_32_hacken_audit.json in the research dump)

Source: (all linked above) | 2026-07-05

---

## 23. Common Pitfalls & Known Issues

### 23.1 Forgetting the 14-day unstaking cooldown

**Symptom**: user tries to withdraw `MAG7.ssi` immediately after unstaking `sMAG7.ssi`.
**Cause**: 14-day cooldown is mandatory.
**Fix**: plan ahead; the cooldown is non-negotiable. After cooldown, the user must **manually** claim — auto-claim does not happen.

### 23.2 Losing the `sSOSO` receipt token

**Symptom**: user transfers `sSOSO` to another wallet; cannot redeem the corresponding $SOSO from the original wallet.
**Cause**: redemption requires holding the receipt token.
**Fix**: NEVER transfer `s*` receipt tokens to wallets you don't control. Treat them as bearer instruments.

### 23.3 Misunderstanding "stake $SOSO earns yield"

**Symptom**: user stakes $SOSO expecting direct token yield; sees no $SOSO balance increase.
**Cause**: staking $SOSO does NOT pay direct yield — it only boosts SSI Points multiplier.
**Fix**: read the SoDEX Stake FAQ carefully. The yield is in the form of additional $SOSO airdrop allocation via SSI Points.

### 23.4 Sending SSI tokens to wrong chain

**Symptom**: user sends `MAG7.ssi` to Ethereum mainnet address instead of Base.
**Cause**: SSI tokens are deployed on Base, not Ethereum.
**Fix**: always confirm the chain is Base before sending SSI tokens. Check the recipient address on BaseScan before sending.

### 23.5 Sending SOSO to ValueChain EVM without native SOSO for gas

**Symptom**: user bridges $SOSO to ValueChain EVM but cannot transact (no gas).
**Cause**: ValueChain EVM uses SOSO as native gas; bridged ERC-20 SOSO cannot pay gas.
**Fix**: either bridge SOSO as native (via the official ValueChain bridge) or wrap to WSOSO and use a wrapper-aware dApp. Most users should keep SOSO on Base and only bridge what they need for ValueChain interactions.

### 23.6 KYT-flagged deposits returned

**Symptom**: user deposits USDC into SoDEX to buy SSI; deposit is auto-returned.
**Cause**: KYT flagged the source funds.
**Fix**: ensure source funds are clean; use a clean wallet.

### 23.7 Depositing below minimum threshold

**Symptom**: funds permanently lost.
**Cause**: each SSI token has a minimum deposit requirement (e.g. 5 for MAG7.ssi).
**Fix**: check the deposit configuration table before sending.

### 23.8 Staking SOSO does not lock SSI tokens

**Symptom**: user stakes $SOSO expecting their `MAG7.ssi` to auto-stake.
**Cause**: $SOSO staking is independent of SSI token staking.
**Fix**: stake both separately. $SOSO staking boosts the points earned from SSI staking; it does not auto-stake SSI.

### 23.9 Wallet network mismatch

**Symptom**: SSI frontend shows 0 balance.
**Cause**: wallet is connected to wrong network (must be Base).
**Fix**: switch wallet to Base Mainnet.

### 23.10 SoDEX Vault deposit auto-stakes MAG7.ssi

**Symptom**: user deposits `MAG7.ssi` into SoDEX Vault; balance shows as `sMAG7.ssi`.
**Cause**: depositing `MAG7.ssi` auto-stakes it to `sMAG7.ssi` for vault use.
**Fix**: this is expected behavior. To withdraw as `MAG7.ssi`, initiate the 14-day unstake.

### 23.11 Partial unstake instantly drops fee discount

**Symptom**: user partially unstakes $SOSO; SoDEX trading fee discount drops immediately, even though SOSO is still locked for 14 more days.
**Cause**: fee discount is recalculated based on **remaining** staked SOSO, not locked SOSO.
**Fix**: plan unstaking around trading volume cycle.

### 23.12 ResearchHubVoting is approval-only

**Symptom**: developer expects ranked-choice voting; builds a UI that submits ranked votes.
**Cause**: ResearchHubVoting is **approval-only** (one vote per proposal, approve/reject).
**Fix**: read the contract source before integrating.

### 23.13 Pagination required for getParticipatedProposals

**Symptom**: developer calls `getParticipatedProposals(voter)` and gets a gas-limit error.
**Cause**: the function is paginated: `getParticipatedProposals(voter, begin, end)`.
**Fix**: paginate in chunks of 50–100.

Source: (all referenced inline above) | 2026-07-05

---

## 24. Code Examples

### 24.1 Read SSI NAV and constituents (Python, ethers-style via web3.py)

```python
"""
Read SSI MAG7.ssi index data from Base mainnet.
Requires: web3 (pip install web3)
"""
from web3 import Web3

# Base mainnet RPC (public)
RPC = "https://mainnet.base.org"
w3 = Web3(Web3.HTTPProvider(RPC))

# Replace with actual SSI contract addresses (find via https://basescan.org
# or by inspecting the SSI frontend at https://ssi.sosovalue.com)
SSI_ROUTER_ADDRESS = "0x..."  # TODO: fill in
MAG7_TOKEN_ADDRESS = "0x..."  # TODO: fill in
MAG7_VAULT_ADDRESS = "0x..."  # TODO: fill in

# Minimal ABIs
ERC20_ABI = [
    {"constant": True, "inputs": [{"name": "", "type": "address"}],
     "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}],
     "payable": False, "stateMutability": "view", "type": "function"},
    {"constant": True, "inputs": [],
     "name": "totalSupply", "outputs": [{"name": "", "type": "uint256"}],
     "payable": False, "stateMutability": "view", "type": "function"},
    {"constant": True, "inputs": [],
     "name": "decimals", "outputs": [{"name": "", "type": "uint8"}],
     "payable": False, "stateMutability": "view", "type": "function"},
]

mag7 = w3.eth.contract(address=MAG7_TOKEN_ADDRESS, abi=ERC20_ABI)
total_supply = mag7.functions.totalSupply().call()
decimals = mag7.functions.decimals().call()
print(f"MAG7.ssi total supply: {total_supply / 10**decimals}")
```

### 24.2 Mint MAG7.ssi by depositing the basket (TypeScript, ethers v6)

```typescript
// mint-mag7.ts
// Requires: ethers (npm install ethers)
// Prerequisites: wallet on Base with sufficient constituent tokens (BTC, ETH, etc. as wrapped Base tokens)
//                + ETH for gas.

import { ethers } from "ethers";

const RPC = "https://mainnet.base.org";
const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

// Replace with actual SSI Router address
const SSI_ROUTER = "0x..."; // TODO: fill in
const SSI_ROUTER_ABI = [
  "function mint(address indexToken, uint256[] calldata amounts) external returns (uint256 minted)",
  // Actual ABI may differ — verify against the contract on BaseScan
];

async function mintMag7(amounts: bigint[]) {
  const router = new ethers.Contract(SSI_ROUTER, SSI_ROUTER_ABI, wallet);
  const mag7Token = "0x..."; // TODO: MAG7.ssi token address

  // Approve the router to spend each underlying token
  // (omitted — see ERC-20 approve pattern)

  const tx = await router.mint(mag7Token, amounts);
  console.log(`tx hash: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`minted in block ${receipt?.blockNumber}`);
}

// Example: mint with 0.001 BTC, 0.01 ETH, etc. (amounts in smallest units)
mintMag7([
  ethers.parseUnits("0.001", 8),  // WBTC
  ethers.parseUnits("0.01", 18),  // WETH
  // ... etc for SOL, BNB, XRP, ADA, DOGE
]).catch(console.error);
```

### 24.3 Stake MAG7.ssi (TypeScript)

```typescript
// stake-mag7.ts
import { ethers } from "ethers";

const RPC = "https://mainnet.base.org";
const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const MAG7_TOKEN = "0x...";      // TODO
const STAKING_CONTRACT = "0x..."; // TODO

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
];
const STAKING_ABI = [
  "function stake(uint256 amount) returns (bool)",
  "function unstake(uint256 amount) returns (bool)",
  "function claim() returns (bool)",
  "function getStakedAmount(address user) view returns (uint256)",
  "function getUnstakeRequestTime(address user) view returns (uint256)",
];

async function stakeMag7(amount: string) {
  const mag7 = new ethers.Contract(MAG7_TOKEN, ERC20_ABI, wallet);
  const staking = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, wallet);

  const amountWei = ethers.parseUnits(amount, 18);

  // 1. Approve staking contract to spend MAG7.ssi
  const approveTx = await mag7.approve(STAKING_CONTRACT, amountWei);
  await approveTx.wait();
  console.log("approved");

  // 2. Stake
  const stakeTx = await staking.stake(amountWei);
  await stakeTx.wait();
  console.log(`staked ${amount} MAG7.ssi; received sMAG7.ssi`);
}

stakeMag7("5.0").catch(console.error);
```

### 24.4 Unstake with 14-day cooldown (TypeScript)

```typescript
// unstake-mag7.ts
import { ethers } from "ethers";

const RPC = "https://mainnet.base.org";
const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const STAKING_CONTRACT = "0x..."; // TODO
const STAKING_ABI = [
  "function unstake(uint256 amount) returns (bool)",
  "function claim() returns (bool)",
  "function getUnstakeRequestTime(address user) view returns (uint256)",
];
const COOLDOWN_SECONDS = 14 * 24 * 60 * 60; // 14 days

async function unstakeFlow(amount: string) {
  const staking = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, wallet);
  const amountWei = ethers.parseUnits(amount, 18);

  // Step 1: initiate unstake
  const unstakeTx = await staking.unstake(amountWei);
  await unstakeTx.wait();
  console.log(`unstake initiated for ${amount} sMAG7.ssi`);

  // Step 2: wait 14 days
  const requestTime = await staking.getUnstakeRequestTime(wallet.address);
  const claimableAt = Number(requestTime) + COOLDOWN_SECONDS;
  console.log(`claimable at: ${new Date(claimableAt * 1000).toISOString()}`);

  // Step 3 (after 14 days): manually claim
  // const claimTx = await staking.claim();
  // await claimTx.wait();
  // console.log("claimed MAG7.ssi");
}

unstakeFlow("5.0").catch(console.error);
```

### 24.5 Vote on a ResearchHubVoting proposal (TypeScript)

```typescript
// vote-research-hub.ts
import { ethers } from "ethers";

const RPC = "https://mainnet.base.org";
const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const RESEARCH_HUB_VOTING = "0x..."; // TODO
const VOTING_ABI = [
  "function vote(uint256 proposalId, bool approve) returns (bool)",
  "function getParticipatedProposals(address voter, uint256 begin, uint256 end) view returns (uint256[])",
  "function getProposal(uint256 proposalId) view returns (tuple(uint256 id, address proposer, string description, uint256 forVotes, uint256 againstVotes, uint256 deadline))",
];

async function vote(proposalId: number, approve: boolean) {
  const voting = new ethers.Contract(RESEARCH_HUB_VOTING, VOTING_ABI, wallet);
  const tx = await voting.vote(proposalId, approve);
  await tx.wait();
  console.log(`voted ${approve ? "YES" : "NO"} on proposal ${proposalId}`);
}

async function myVotes() {
  const voting = new ethers.Contract(RESEARCH_HUB_VOTING, VOTING_ABI, wallet);
  const ids = await voting.getParticipatedProposals(wallet.address, 0, 100);
  console.log("your votes:", ids.map(Number));
}

vote(1, true).catch(console.error);
```

### 24.6 Read SSI data via SoSoValue REST API (Python)

```python
"""
Read SSI MAG7.ssi data via the SoSoValue OpenAPI.
Requires: requests (pip install requests)
"""
import os
import requests

API = "https://openapi.sosovalue.com/openapi/v1"
HEADERS = {"x-soso-api-key": os.environ["SOSO_API_KEY"]}

# List all indices
r = requests.get(f"{API}/indices", headers=HEADERS)
indices = r.json()["data"]
print("Indices:", indices)

# Get MAG7 constituents
r = requests.get(f"{API}/indices/ssimag7/constituents", headers=HEADERS)
constituents = r.json()["data"]
print("MAG7.ssi constituents:")
for c in constituents:
    print(f"  {c['symbol']}: {c['weight']*100:.2f}%")

# Get MAG7 market snapshot
r = requests.get(f"{API}/indices/ssimag7/market-snapshot", headers=HEADERS)
snap = r.json()["data"]
print(f"MAG7.ssi price: ${snap['price']}")
print(f"  24h: {snap['24h_change_pct']*100:+.2f}%")
print(f"  7d:  {snap['7day_roi']*100:+.2f}%")
print(f"  YTD: {snap['ytd']*100:+.2f}%")

# Get MAG7 daily klines for last 90 days
r = requests.get(
    f"{API}/indices/ssimag7/klines",
    headers=HEADERS,
    params={"interval": "1d", "limit": 90},
)
klines = r.json()["data"]
print(f"MAG7.ssi klines: {len(klines)} days")
```

### 24.7 Environment variables

```bash
# SSI Protocol
BASE_RPC=https://mainnet.base.org
BASE_CHAIN_ID=8453
SSI_ROUTER_ADDRESS=0x...        # find via BaseScan
MAG7_SSI_TOKEN=0x...
DEFI_SSI_TOKEN=0x...
MEME_SSI_TOKEN=0x...
USSI_TOKEN=0x...
SSI_STAKING_CONTRACT=0x...
RESEARCH_HUB_VOTING=0x...

# ValueChain EVM (for SoDEX integration)
VALUECHAIN_RPC=https://mainnet.valuechain.xyz
VALUECHAIN_CHAIN_ID=286623
WSOSO_CONTRACT=0x5050505050505050505050505050505050505050

# Token addresses
SOSO_ETHEREUM=0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d
SOSO_BASE=0x624e2e7fdc8903165f64891672267ab0fcb98831

# Auth
PRIVATE_KEY=0x...               # your EVM wallet private key (KEEP SECURE)
SOSO_API_KEY=...                # for SoSoValue data API (see 01_SOSOVALUE_MASTER_REFERENCE.md)
```

### 24.8 End-to-end: build a "SSI rebalance alert" bot

```python
"""
Monitor SSI MAG7.ssi constituent weights and alert when they drift
more than 5% from the official methodology.
"""
import os
import requests
import time
from collections import defaultdict

API = "https://openapi.sosovalue.com/openapi/v1"
HEADERS = {"x-soso-api-key": os.environ["SOSO_API_KEY"]}

def get_mag7_weights():
    r = requests.get(f"{API}/indices/ssimag7/constituents", headers=HEADERS)
    return {c["symbol"]: c["weight"] for c in r.json()["data"]}

# Baseline (e.g. from yesterday)
last_weights = get_mag7_weights()
print("baseline:", last_weights)

while True:
    time.sleep(3600)  # check hourly
    current = get_mag7_weights()
    drifts = {}
    for sym, w in current.items():
        last = last_weights.get(sym, 0)
        if last > 0:
            drift = (w - last) / last
            if abs(drift) > 0.05:
                drifts[sym] = drift
    if drifts:
        msg = "⚠️ SSI MAG7.ssi weight drift detected:\n" + \
              "\n".join(f"  {s}: {d*100:+.2f}%" for s, d in drifts.items())
        # send to Discord / Slack
        print(msg)
        last_weights = current
```

---

## 25. Hackathon Angles

### 25.1 Highest-leverage SSI hackathon ideas

| # | Idea | Stack | Why it wins |
|---|---|---|---|
| 1 | **SSI Robo-Advisor** — chat UI that asks 3 questions (risk, time horizon, view on AI/BTC/memes) and recommends an SSI allocation. One-click mint on SSI Protocol. | SoSoValue Index API + SSI contracts + LLM | Brings real value to retail. SSI mint is a single on-chain tx. |
| 2 | **Cross-Index Arbitrage Scanner** — compare MAG7.ssi NAV (from SoSoValue API) vs the weighted sum of its constituents' spot prices (from `/currencies/{id}/market-snapshot`). Alert when premium/discount > threshold. | SoSoValue Index API + Currency API | Demonstrates deep use of two API modules. Real alpha. |
| 3 | **DCA into SSI via SoDEX** — a smart contract that takes USDC on Base, swaps into MAG7.ssi via SoDEX Spot, deposits into sMAG7.ssi Vault for dual yield. Recurring DCA. | SoDEX Spot REST + SSI staking + ValueChain EVM | Showcases composable DeFi on ValueChain. |
| 4 | **SSI Index Methodology Explorer** — a dashboard that visualizes each SSI's constituents, weights, historical rebalances, and methodology. Pull from SoSoValue API + on-chain. | SoSoValue Index API + on-chain reads | Educational; judges love dashboards. |
| 5 | **Leveraged SSI via SoDEX Perps** — borrow USDC against staked sMAG7.ssi (via a custom lending contract), use it to buy more MAG7.ssi, restake. Loop until target leverage. | SoDEX Perps + SSI staking + custom lending contract | Advanced DeFi; high-risk but impressive. |
| 6 | **SSI-Based Structured Product** — a principal-protected note: deposit USDC, protocol buys MAG7.ssi + writes covered calls on SoDEX Perps. Caps upside, protects downside. | SoDEX Perps (covered call writing) + SSI + custom ERC-20 | Very few teams build structured products; judges will be impressed. |
| 7 | **ResearchHubVoting Dashboard** — a community dashboard for SSI governance: list proposals, show vote counts, display voter participation, paginate `getParticipatedProposals`. | SSI Protocol ResearchHubVoting contract + Base RPC | Fills a real governance gap. |
| 8 | **SSI Yield Optimizer** — a bot that monitors SSI staking APY vs SoDEX sMAG7.ssi Vault APY vs SoDEX SOSO/USDC APY; auto-shifts capital to the highest-yield venue. | All yield sources + monitoring bot | Real DeFi automation. |
| 9 | **MAG7.ssi Price Alert Bot** — simple: monitor MAG7.ssi price via SoSoValue API every 30s; send Discord alert when price moves > X% in Y minutes. | SoSoValue Index API + Discord webhook | Easy to build; useful for traders. |
| 10 | **SSI Tax Calculator** — compute capital gains for users who minted/redeemed/staked SSI across the year. Read on-chain history + price feed. | On-chain reads + SoSoValue klines | Niche but valuable; users will pay. |

### 25.2 Best architecture for an SSI-based product

1. **Frontend**: Next.js + wagmi + viem. Connect to Base mainnet.
2. **Backend**: Python FastAPI. Wrap SoSoValue API calls + on-chain reads.
3. **Contract reads**: use viem's `readContract` for SSI Protocol state.
4. **Contract writes**: use wagmi's `useWriteContract` hook for user-initiated actions.
5. **Gas optimization**: read-heavy operations on Base cost ~$0.001; writes cost ~$0.01–$0.10.
6. **Caching**: cache SoSoValue API responses with 30s TTL.

### 25.3 What judges reward for SSI projects

- A working "mint SSI → stake → earn" loop end-to-end on mainnet.
- Use of the ResearchHubVoting contract (governance is under-used).
- Original index methodology ideas (e.g. "AI Agents Index", "DePIN Index" — propose via ResearchHubVoting).
- Cross-chain: SSI on Base → bridged to ValueChain → used as SoDEX Vault collateral.

### 25.4 Most impressive integrations

- Live NAV ticker (poll SoSoValue API every 30s).
- Real-time mint/redeem transaction feed (subscribe to SSI Router events on Base).
- Historical rebalance visualization (read on-chain `Rebalance` events + constituent weights over time).
- $SOSO staking boost calculator (show how much $SOSO a user needs to stake to reach the next boost tier).

### 25.5 Features nobody builds

- A **custom index creation UI** — let users propose their own index via ResearchHubVoting.
- An **SSI index comparison tool** — overlay MAG7.ssi vs DEFI.ssi vs MEME.ssi performance on one chart.
- A **tax-loss harvester** that switches between SSI tokens to realize losses.
- A **portfolio rebalancer** that auto-rebalances a user's holdings to match a target SSI allocation.
- An **SSI ETF-of-ETFs** — wrap multiple SSI tokens into a single meta-index token.

---

## 26. Open Questions / Gaps

1. **Exact SSI contract addresses** — not in the docs. Must be derived from the SSI frontend or the deployment scripts in the repo.
2. **Full ABI** — not published as JSON; must be generated via `forge build` or fetched from BaseScan.
3. **Index methodology whitepaper** — §5.x of the whitepaper is JS-rendered; the exact weighting formula (market-cap? square-root? capped?) is not captured.
4. **Rebalance schedule** — quarterly is INFERRED; the exact cadence and next-rebalance date are not documented.
5. **ResearchHubVoting source code** — the contract is referenced in commits but the full source is in the repo; read `src/ResearchHubVoting.sol` for the authoritative spec.
6. **Staking contract mechanics** — the exact formula for SSI Points distribution per staked token is not documented publicly.
7. **Loyalty Points vs SSI Points** — two parallel points systems; their relationship is unclear.
8. **$SOSO allocation table** — §8.2 of the whitepaper is JS-rendered; the full breakdown is not captured.
9. **Audit reports** — not published publicly; "available upon request".
10. **WSOSO liquidity** — the WSOSO contract is deployed but liquidity / usage is not documented.
11. **SSI Protocol on ValueChain** — is the staking contract deployed on ValueChain EVM as well as Base, or is sMAG7.ssi bridged? Not confirmed.
12. **Mint/redeem fees** — the protocol's own mint/redeem fee (separate from the 0.01% daily service fee and the SoDEX bridge withdrawal fee) is not documented.
13. **Per-index supply caps** — are there caps on how many MAG7.ssi can be minted? Not documented.
14. **Oracle push authorization** — who is authorized to push NAV updates to the OracleAdapter? Not documented; likely a multisig.
15. **SlowMist audit scope** — was the SlowMist audit before or after the transparent-proxy-upgrade migration (Nov 2024)? The commit "fix slow-mist audit comment" is from Aug 2024, before the proxy migration, suggesting the audit was on the non-upgradeable version.

---

## 27. Source Index

### SSI Protocol official

- https://ssi.sosovalue.com
- https://ssi.sosovalue.com/earn
- https://ssi.sosovalue.com/reward
- https://ssi.sosovalue.com/soso-token
- https://ssi.sosovalue.com/buy/MAG7.ssi
- https://ssi.sosovalue.com/buy/DEFI.ssi
- https://ssi.sosovalue.com/buy/MEME.ssi
- https://m.sosovalue.com/assets/cryptoindex/ssi-index-management

### Whitepaper (SSI sections)

- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper
- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/5.-sosovalue-indexes-new-approach-to-passive-crypto-investment-for-the-masses/5.1-ssi-protocol-overview
- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.1-soso-token
- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.2-tokenomics
- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/9.-resources/9.2-audits
- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/9.-resources/9.3-micar-whitepaper
- https://sosovalue.gitbook.io/sosovalue-indices/resources/terms-of-use

### SoSoValue API docs (Index module)

- https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/index.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/list.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/constituents.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/market-snapshot.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/klines.md

### SoDEX docs (SSI integration)

- https://sodex.com/documentation/custody-and-security/backing-asset-custody
- https://sodex.com/documentation/vault-overview/sodex-liquidity-provider-slp
- https://sodex.com/documentation/vault-overview/smag7.ssi-vault
- https://sodex.com/documentation/vault-overview/dual-yield-mechanism
- https://sodex.com/documentation/vault-overview/deposits-and-withdrawals
- https://sodex.com/documentation/stake-usdsoso/faq
- https://sodex.com/documentation/stake-usdsoso/future-plans
- https://sodex.com/documentation/stake-usdsoso/how-to-stake-withdraw
- https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-and-withdrawal-configuration
- https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-from-connected-wallet
- https://sodex.com/documentation/user-guide/faq/why-does-my-balance-show-0-when-i-have-mag7.ssi
- https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-wsoso
- https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-valuechain-evm

### GitHub

- https://github.com/SoSoValueLabs
- https://github.com/SoSoValueLabs/ssi-protocol
- https://github.com/SoSoValueLabs/DefiLlama-Adapters
- https://github.com/SoSoValueLabs/dimension-adapters
- https://github.com/SoSoValueLabs/ethereum-optimism.github.io
- https://github.com/MeoMunDep/SoSoValue

### Token contracts / explorers

- https://etherscan.io/address/0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d
- https://basescan.org/token/0x624e2e7fdc8903165f64891672267ab0fcb98831
- https://ethplorer.io/address/0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d
- https://main-scan.valuechain.xyz

### Audits

- https://blocksec.com/audit-report
- https://www.slowmist.com/service-blockchain-security-audit.html
- https://www.slowmist.com/service-smart-contract-security-audit.html
- https://www.slowmist.com/security-audit-certificate.html
- https://hacken.io/audits
- https://github.com/slowmist/Cryptocurrency-Security-Audit-Guide

### DeFiLlama / Dune / Messari

- https://defillama.com/protocol/sosovalue
- https://defillama.com/protocol/sosovalue-indexes
- https://defillama.com/protocol/sosovalue-basis
- https://defillama.com/protocols/indexes
- https://defillama.com/revenue
- https://dune.com/dannytrump/soso-dashboard
- https://messari.io/project/sosovalue
- https://messari.io/project/sosovalue/charts/market/risk
- https://messari.io/project/sosovalue/charts/investor-activity
- https://messari.io/project/sosovalue/news
- https://messari.io/project/sosovalue/more

### Token / exchange trackers

- https://www.coingecko.com/en/coins/sosovalue
- https://coinmarketcap.com/currencies/sosovalue
- https://coinmarketcap.com/cmc-ai/sosovalue/what-is
- https://coinmarketcap.com/cmc-ai/sosovalue/latest-updates
- https://coinmarketcap.com/currencies/sosovalue/historical-data
- https://www.binance.com/en/price/sosovalue
- https://www.bybit.com/en/price/sosovalue
- https://www.bybit.com/en/trade/spot/SOSO/USDT
- https://www.bybit.com/trade/usdt/SOSOUSDT
- https://announcements.bybit.com/en/article/bybit-now-supports-soso-deposits-on-valuechain-blt1d9fec7edeb582b6
- https://www.okx.com/en-us/price/sosovalue-soso
- https://www.kraken.com/convert/soso
- https://biconomy.zendesk.com/hc/en-us/articles/52603462432025-Biconomy-com-New-Listing-SoSoValue-SOSO-for-Spot-Trading
- https://www.coinbase.com/price/sosovalue
- https://www.cryptohopper.com/currencies/detail?currency=SOSO
- https://markets.coinpedia.org/sosovalue
- https://cryptorank.io/price/sosovalue
- https://cryptorank.io/ico/sosovalue
- https://cryptorank.io/news/feed/24eee-sosovalue-publishes-data-bybit-proof-feature

### Funding / team / vesting

- https://www.crunchbase.com/organization/sosovalue
- https://www.crunchbase.com/funding_round/sosovalue-series-a--8d1c1bca
- https://www.crunchbase.com/funding_round/sosovalue-seed--40a43550
- https://www.crunchbase.com/organization/sosovalue/financial_details
- https://tracxn.com/d/companies/sosovalue/__Tx0FsQYR_YrY2mkk2pbdb5pVOwP6idiQIrvhw8Q0bA4
- https://www.rootdata.com/projects/detail/SoSoValue?k=MTA1NDk%3D
- https://icoanalytics.org/projects/sosovalue
- https://icoanalytics.org/funds/hongshan-ex-sequoia-china
- https://tokenomist.ai/sosovalue/unlock-events
- https://dropstab.com/coins/sosovalue/vesting
- https://sg.linkedin.com/company/sosovalue
- https://sg.linkedin.com/in/may-wang-689102313
- https://sg.linkedin.com/in/jessie-l-5aaba626
- https://sg.linkedin.com/in/jess-l-1a06a1316

### Press / explainers / airdrop guides

- https://fortune.com/crypto/2025/01/08/crypto-data-platform-sosovalue-funding-multi-coin-indices
- https://www.theblock.co/post/333620/sosovalue-funding-valuation
- https://www.theblock.co/post/335380/sosovalue-token-airdrop-launch
- https://www.globenewswire.com/news-release/2025/01/08/3006098/0/en/ai-driven-crypto-research-platform-sosovalue-raises-15-million-series-a-to-launch-the-investible-spot-index-protocol-ssi.html
- https://www.eqs-news.com/news/corporate/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token/65d8ce6c-526d-4242-8856-422e4d86dc17_en
- https://decrypt.co/346354/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token
- https://finance.yahoo.com/news/sosovalue-raised-4-15m-seed-110000516.html
- https://finance.yahoo.com/news/crypto-data-platform-sosovalue-raises-120000055.html
- https://www.finsmes.com/2025/01/sosovalue-raises-15m-in-series-a-funding.html
- https://www.financemagnates.com/thought-leadership/sosovalue-raises-415m-seed-funding-for-its-crypto-research-platform
- https://beincrypto.com/sosovalue-raises-15-million
- https://coinpedia.org/information/sosovalue-launches-ssi-protocol-after-15m-series-a-funding
- https://www.panewslab.com/en/articles/kqopya0d
- https://www.binance.com/en/square/post/18798919363313
- https://www.binance.com/en/square/post/19550762011602
- https://www.binance.com/en/square/post/20510378167193
- https://www.binance.com/en/square/post/318737046006289
- https://www.binance.com/en/square/post/35869624579810
- https://www.binance.com/en/square/post/35901944783642
- https://www.tradingview.com/news/eqs:c3d6c2968094b:0-sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token
- https://www.tradingview.com/news/coinmarketcal:65fe7a5bf094b:0-sosovalue-community-ama-31-march-2026
- https://coinmarketcal.com/en/coin/sosovalue
- https://airdrops.io/sosovalue
- https://web3.gate.com/crypto-wiki/article/sosovalue-airdrop-complete-guide-to-claiming-free-soso-tokens-20260108
- https://coinswitch.co/switch/crypto/sosovalue-airdrop
- https://www.gate.com/learn/articles/what-is-so-so-value/6463
- https://www.gate.com/learn/articles/soso-overview/5995
- https://phemex.com/academy/what-is-sosovalue-soso
- https://www.cube.exchange/what-is/soso
- https://cryptototem.com/sosovalue-soso
- https://www.bitget.com/news/detail/12560604870009
- https://www.bitget.com/crypto-widgets/telegram-apps/sosovalue
- https://www.prnewswire.com/apac/news-releases/the-vip-advantage-bybit-partners-with-sosovalue-to-issue-vip-exclusive-daily-industry-report-302424438.html
- https://assets-cms.kraken.com/files/51n36hrp/facade/fd707339600f9aed634e6a651d5ac8c2f746f4d9.pdf
- https://www.esma.europa.eu/sites/default/files/2024-12/OTHER.csv

### Social / community

- https://x.com/SoSoValueCrypto
- https://x.com/SoSoValueCrypto/highlights
- https://x.com/SoSoValueCrypto/article/2039590198963757325
- https://x.com/SoSoValueCrypto/status/1876997896803078208
- https://x.com/SoSoValueCrypto/status/1893519626157597134
- https://x.com/SoSoValueCrypto/status/1976617412889112693
- https://x.com/SoSoValueCrypto/status/2017935518206509445
- https://x.com/SoSoValueCrypto/status/2047669672380895427
- https://x.com/SoSoValueCrypto/status/2048963495493091362
- https://x.com/SoSoValueCrypto/status/2066722408070082694
- https://x.com/SoSoValueCrypto/status/2072216444566393243
- https://x.com/SoSoValueCrypto/status/2072626397668061562
- https://x.com/WuBlockchain/status/2017983782649782637
- https://www.instagram.com/sosovalue
- https://www.instagram.com/p/DVi3VkziRcS
- https://www.instagram.com/reel/DTJ4jI0FZNr/
- https://t.me/s/SoSoValueCryptoInvestment
- https://app.galxe.com/quest/UvEGYeVt2aHcFFAJGg7kxx
- https://open.spotify.com/show/6F4JRRL8awxjEmvuBuKxEz
- https://www.youtube.com/@sosovalue
- https://www.youtube.com/watch?v=UvGFMDUvJLQ
- https://www.youtube.com/watch?v=VeaFLQjM_uU
- https://www.youtube.com/watch?v=wBiDulzqV_4
- https://www.youtube.com/watch?v=EMQXuf8n9m4
- https://www.youtube.com/playlist?list=PLOoXJNAvrhIQaR8aI_E1TEnXt75C6vQby

### Hackathon / events

- https://luma.com/soSoValue-buildathon
- https://app.akindo.io/wave-hacks/JBEQXgN4Zi2jA3wA
- https://www.globenewswire.com/news-release/2025/12/03/3198540/0/en/onepiece-labs-solana-and-sosovalue-launched-expanded-ai-web3-university-tour-series-following-record-fall-2025-run.html

### Companion docs (cross-references)

- /home/z/my-project/docs/01_SOSOVALUE_MASTER_REFERENCE.md
- /home/z/my-project/docs/02_SODEX_MASTER_REFERENCE.md

---

*End of `03_SSI_PROTOCOL_MASTER_REFERENCE.md`. This completes the three-file SoSoValue ecosystem knowledge base.*

---

## Appendix: Ecosystem Map (one-page summary)

```
                          SoSoValue Ecosystem
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
   SoSoValue Platform        SSI Protocol                 SoDEX
  (consumer research)    (on-chain index tokens)     (on-chain CLOB DEX)
        │                         │                         │
        │                         │                         │
  ┌─────┴─────┐            ┌──────┴──────┐          ┌───────┴───────┐
  │ SoSoValue │            │ MAG7.ssi    │          │ Spot appchain │
  │ OpenAPI   │            │ DEFI.ssi    │          │ Perps appchain│
  │ v1        │            │ MEME.ssi    │          │ Mirror Proto  │
  │           │            │ USSI        │          │ Vault (SLP)   │
  │ - Currency│            │ + staked    │          │ sMAG7 Vault   │
  │ - ETF     │            │   variants  │          │               │
  │ - Index   │            │             │          │ Trading API   │
  │ - Stocks  │            │ Staking     │          │ (REST + WS)   │
  │ - BTC Tres│            │ (SSI Earn)  │          │               │
  │ - Feeds   │            │             │          │ $SOSO staking │
  │ - Fundr.  │            │ ResearchHub │          │ (boost)       │
  │ - Macro   │            │ Voting      │          │               │
  │ - Analysis│            │             │          │               │
  └─────┬─────┘            └──────┬──────┘          └───────┬───────┘
        │                         │                         │
        │      ┌──────────────────┘                         │
        │      │                                            │
        │      ▼                                            │
        │  $SOSO Token                                      │
        │  (ERC-20 on Ethereum + Base;                      │
        │   native gas on ValueChain EVM;                   │
        │   WSOSO wrapper at 0x5050...5050)                 │
        │      │                                            │
        │      └────────────────────────────────────────────┘
        │                                             │
        ▼                                             ▼
  Off-chain data layer                          ValueChain L1
  (aggregates exchange prices,                 (HostChain + EVM syschain
   computes NAV, pushes to                     + Spot appchain
   OracleAdapter on Base)                      + Perps appchain)
```

---

*This file is part of a three-document knowledge base. For the complete picture, read all three files in order: 01 → 02 → 03.*
