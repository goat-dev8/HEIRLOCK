# 02 · SoDEX Master Reference

> **Mission of this file**: To be the single most comprehensive, source-cited, implementation-ready reference for **SoDEX** — the SoSoValue-incubated high-performance on-chain CLOB DEX — and its underlying **ValueChain Layer-1** and **Mirror Protocol** bridge.
>
> **Companion files**:
> - `01_SOSOVALUE_MASTER_REFERENCE.md` — SoSoValue consumer research platform + data API
> - `03_SSI_PROTOCOL_MASTER_REFERENCE.md` — SSI on-chain spot index protocol + $SOSO tokenomics
>
> **Methodology**: Every technical statement is followed by a `Source / URL / Date` triple. Where the official docs are silent, the document explicitly says "INFERRED" and explains the reasoning. Gated or 404 pages are listed in §22.
>
> **Last compiled**: 2026-07-05 (UTC+8)

---

## Table of Contents

0. Meta
1. Executive Overview
2. Product Surface & Feature Matrix
3. Architecture — ValueChain L1
4. SoDEX Orderbook Engine
5. Mirror Protocol (Cross-Chain Bridge)
6. Custody & Security
7. Audits
8. Trading API Endpoints
9. Authentication & EIP-712 Signing
10. Nonces
11. Go SDK
12. Rate Limits
13. REST API — Spot
14. REST API — Perps
15. WebSocket API
16. Trading Mechanics
   - Orderbook
   - Order Types
   - Fees & Fee Tiers
   - Margining
   - Margin Tiers
   - Multi-Asset Margin
   - Liquidations
   - Auto-Deleveraging
   - Funding
   - Index Price & Mark Price
   - Entry Price & PnL
   - TP/SL
   - Contract Specifications
17. Vaults (SLP, sMAG7.ssi Vault, Dual Yield)
18. SoPoints (Points / Airdrop Program)
19. Stake $SOSO
20. User Guides (deposit / withdraw / onboarding / FAQ)
21. Common Pitfalls & Known Issues
22. Code Examples
23. Hackathon Angles
24. Open Questions / Gaps
25. Source Index

---

## 0. Meta

| Field | Value |
|---|---|
| Product | SoDEX (Spot + Perpetuals on-chain CLOB DEX) |
| Parent | SoSoValue (incubated) |
| Chain | ValueChain L1 (proprietary) |
| Website | https://sodex.com |
| Documentation | https://sodex.com/documentation |
| Mainnet launch | October 2025 |
| Testnet | Live (whitelisted) |
| Asset coverage | Spot: ~30+ tokens (BTC, ETH, SOL, XRP, USDC, MAG7.ssi, sMAG7.ssi, SOSO, USSI, DEFI.ssi, MEME.ssi, TSLA, NVDA, AAPL, etc.). Perps: ~50+ contracts including crypto, RWA (gold/silver), and tokenized equities (US500, USTECH100, MSTR, TSLA, COIN, etc.) |
| Orderbook model | On-chain CLOB, price-time priority, tick/lot size precision |
| Custody | Multi-custodian: Cobo, Ceffu, Coinbase |
| Audit firms | BlockSec, Halborn, Quantstamp, TenAmor |
| Native token | $SOSO (also ValueChain gas + governance) |
| Twitter | https://x.com/SoSoValueCrypto (SoSoValue handle) |
| Telegram | https://t.me/sodex_official |
| App Store / Play | via SoSoValue apps (id 6739542818 / com.sosovalue.app) |
| Status | Mainnet live |

---

## 1. Executive Overview

SoDEX is a **high-performance on-chain order-book decentralized exchange** built on top of **ValueChain** — a custom Layer-1 designed for deterministic, high-frequency financial computation. It is the third pillar of the SoSoValue ecosystem, alongside the SoSoValue consumer research platform and the SSI spot index protocol.

SoDEX's defining design choices:

1. **On-chain CLOB, not AMM**. Limit orders, market orders, stop orders, OCO/TP-SL, post-only (GTX), IOC, GTC — the full professional order-book vocabulary. Matching is **price-time priority** with strict tick/lot precision.
2. **Two appchains, one chain**. ValueChain hosts a **Spot appchain** and a **Perps appchain** as parallel "guest chains" inside a single HostChain. Each appchain is a Deterministic Decentralized Application (D²APP). An EVM syschain serves as the unified account layer.
3. **Self-custodial + institutional custody hybrid**. User assets sit in non-custodial wallets but the off-chain custodians (Cobo, Ceffu, Coinbase) back the Mirror-Protocol-minted tokens 1:1. KYT/KYA screening on every deposit/withdrawal.
4. **USDC-margined, USDT-denominated quanto perps**. PnL is computed in USDT but settled in USDC.
5. **EIP-712 typed signing** for every trading action, with a strict API-key / master-wallet separation. Designed to feel like a CEX API (Binance/Hyperliquid-style) but with self-custody.
6. **No gas for end users**. Trading is "gas-free" from the user's perspective; gas is abstracted by the platform.

SoDEX launched on mainnet in **October 2025** alongside the upgrade of $SOSO to ValueChain's native gas + governance token. Within ~2 months of mainnet, the platform reported **140,000 users and 100+ trading pairs** spanning crypto and RWA assets.

Source: How SoDEX Works | https://sodex.com/documentation/about-sodex/how-sodex-works | 2026-07-05
Source: SoDEX mainnet announcement | https://www.eqs-news.com/news/corporate/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token/65d8ce6c-526d-4242-8856-422e4d86dc17_en | 2026-07-05
Source: Decrypt mainnet coverage | https://decrypt.co/346354/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token | 2026-07-05
Source: Community Call #1 AMA | https://x.com/SoSoValueCrypto/article/2039590198963757325 | 2026-07-05
Source: Schema.org JSON-LD on sodex.com homepage | (embedded in homepage HTML) | 2026-07-05

### 1.1 The SoDEX FAQ (from sodex.com schema.org markup)

| Q | A |
|---|---|
| What is SoDEX? | A professional DEX orderbook exchange that provides CEX-like trading experience with DeFi transparency. Unified liquidity, real-time market data, institutional-grade tools on ValueChain blockchain. |
| How does SoDEX differ from traditional DEXs? | Unlike traditional DEXs with fragmented liquidity, SoDEX provides a unified orderbook with deeper markets and tighter spreads. Combines the familiar interface of centralized exchanges with the transparency and security of blockchain. |
| What trading pairs are available? | Major cryptocurrency trading pairs including BTC/USDT, ETH/USDT, and many others. Both spot and futures trading are available with professional orderbook functionality. |
| Is SoDEX safe? | Yes, operates on ValueChain blockchain with full transparency. All trades are verifiable on-chain, users maintain self-custody throughout the trading process. |

Source: sodex.com homepage schema.org FAQPage JSON-LD | https://sodex.com | 2026-07-05

---

## 2. Product Surface & Feature Matrix

### 2.1 Trading products

| Product | Appchain | Margin model | Asset examples |
|---|---|---|---|
| Spot | SoDEX Spot appchain | No margin; trader owns the asset | BTC, ETH, SOL, XRP, BNB, ADA, AVAX, LINK, LTC, SUI, TON, XLM, XMR, ZEC, BCH, DOGE, NEAR, AAVE, UNI, WLD, ENA, ONDO, PUMP, FARTCOIN, HYPE, BERA, FIL, ETC, DASH, AXS, MON, PENGU, VIRTUAL, WIF, WLFI, ASTER, AAPL, AMZN, MSFT, NVDA, GOOGL, META, TSLA, COIN, HOOD, INTC, ORCL, PLTR, MU, MSTR, TSM, SNDK, SKHX, SAMSUNG, EWY, CRCL, BASED, TON, USDC, USDT, XAUT, MAG7.ssi, sMAG7.ssi, DEFI.ssi, MEME.ssi, USSI, SOSO |
| Perpetual Futures | SoDEX Perps appchain | Cross or Isolated, USDC-margined, USDT-denominated (quanto) | BTC-USD, ETH-USD, SOL-USD, plus RWA/equity perps: XAUT, SILVER, US500, USTECH100, CL, COPPER, plus tokenized stock perps: AAPL, NVDA, TSLA, MSTR, COIN, etc. |

### 2.2 Order types (full list)

| Order type | Description |
|---|---|
| Market | Immediate execution at best available price. Default slippage tolerance: **1%**. Taker. |
| Limit | Buy/sell at specified price or better. Maker. |
| Stop Market | Triggered at stop price → market order. |
| Stop Limit | Triggered at stop price → limit order. |
| Take Profit (TP) | Triggered by Mark Price → market order to close position. |
| Stop Loss (SL) | Triggered by Mark Price → market order to limit loss. |
| OCO (One-Cancels-Other) | TP+SL pair attached to a parent order. Child TP/SL orders are placed only when the parent is **fully filled** (with one exception: if the parent is partially filled then canceled due to insufficient margin, the TP/SL is activated for the filled portion). |

### 2.3 Order options (time-in-force + modifiers)

| Option | Description |
|---|---|
| GTC (Good-Til-Canceled) | Default. Stays on book until filled or manually canceled. |
| FOK (Fill-or-Kill) | **Not supported yet** per the schema docs. |
| IOC (Immediate-or-Cancel) | Fills what it can, cancels the rest. |
| GTX (Post-Only) | Expires if it would match immediately. |
| Reduce-Only | Perps only. Cannot increase position size. |

### 2.4 Vaults & earning

| Vault | Mechanism |
|---|---|
| SoDEX Liquidity Provider (SLP) | Community-owned market-making pool; deposit eligible assets, share in liquidity revenue + fee rebates. |
| sMAG7.ssi Vault | Deposit sMAG7.ssi → become passive market maker. Dual yield (index staking yield + market-making yield). |
| Stake $SOSO | Redirects to https://ssi.sosovalue.com/earn. 14-day unstaking cooldown. Earns SSI Points multiplier (no direct yield). |

Source: How SoDEX Works | https://sodex.com/documentation/about-sodex/how-sodex-works | 2026-07-05
Source: Orders Types | https://sodex.com/documentation/trading-mechanics/orders-types | 2026-07-05
Source: Order Type | https://sodex.com/documentation/trading-mechanics/order-type | 2026-07-05
Source: TP/SL | https://sodex.com/documentation/trading-mechanics/take-profit-and-stop-loss-orders-tp-sl | 2026-07-05
Source: SLP | https://sodex.com/documentation/vault-overview/sodex-liquidity-provider-slp | 2026-07-05
Source: sMAG7.ssi Vault | https://sodex.com/documentation/vault-overview/smag7.ssi-vault | 2026-07-05
Source: Dual Yield | https://sodex.com/documentation/vault-overview/dual-yield-mechanism | 2026-07-05

---

## 3. Architecture — ValueChain L1

### 3.1 Why ValueChain exists

SoDEX could not be built on any existing chain because it required all of:
- Nasdaq-grade throughput for order-book transactions
- Visa-level transaction concurrency for end users
- Native on-chain order book + modular execution environments
- Composability with EVM smart contracts
- Decentralization, transparency, accessibility

No existing chain delivered all of these. SoSoValue built ValueChain from scratch.

Source: Why We Built ValueChain | https://sodex.com/documentation/about-valuechain/why-we-built-valuechain | 2026-07-05

### 3.2 Containerized Blockchain Architecture

ValueChain's core architectural innovation is the **Containerized Blockchain** model:

- A **HostChain** is produced by the consensus algorithm and serves as the foundational host layer.
- The HostChain accommodates multiple **guest chains**:
  - **EVM syschain** (system chain) — full EVM compatibility, manages overall system state.
  - **Application chains (appchains)** — each one runs a specific high-throughput application.
- Guest chains are **logically independent** but their data is **physically colocated** in HostChain blocks. This enables fast, reliable message-passing channels within the HostChain — instant interoperability between guest chains.

ValueChain currently consists of:
1. A **spot order-book appchain** powering SoDEX Spot
2. A **perpetual order-book appchain** powering SoDEX Perpetuals
3. An **EVM System Chain** serving as the unified account for all appchains
4. Future customized appchains — RWA, stablecoins, lending protocols, etc.

### 3.3 D²APPs (Deterministic Decentralized Applications)

In decentralized systems every node must deterministically arrive at the same result. ValueChain formalizes this with **D²APPs** — Deterministic Decentralized Applications.

ValueChain positions itself as the "NVIDIA CUDA of D²APPs": a generalized public infrastructure optimized for them, with a modular execution framework, MegaBlock architecture that treats each subchain as a specialized zone, and an SDK for developers to transform traditional apps into verifiable D²APPs.

Hyperliquid is cited as the prior-art single-application proof of this model; ValueChain is the first generalized platform.

### 3.4 ValueChain EVM (syschain)

The EVM syschain:
- Manages overall system state of ValueChain
- Provides full EVM compatibility for dApps
- Acts as the unified account system for all appchains
- Uses **$SOSO as the native gas token** (18 decimals on both mainnet and testnet)
- Uses the **Pectra hardfork without blobs**
- Implements **EIP-1559** — but with a critical difference: **base fees are NOT burned**; they are sent together with priority fees to the block builder.
- Supports the same JSON-RPC endpoints as Ethereum.
- No official frontend; users add the chain to their wallet manually via RPC URL + chain ID.

#### Network parameters

| Network | Chain ID | JSON-RPC | WebSocket | Explorer |
|---|---|---|---|---|
| Mainnet | **286623** | `https://mainnet.valuechain.xyz` | `wss://mainnet-ws.valuechain.xyz` | `https://main-scan.valuechain.xyz` |
| Testnet | **138565** | `https://testnet-v2.valuechain.xyz` | `wss://testnet-v2-ws.valuechain.xyz` | `https://test-scan.valuechain.xyz` |

#### MetaMask manual-add config

```
Network Name: ValueChain
RPC URL: https://mainnet.valuechain.xyz
Chain ID: 286623
Currency Symbol: SOSO
Block Explorer: https://main-scan.valuechain.xyz
```

Source: How ValueChain Works | https://sodex.com/documentation/about-valuechain/how-valuechain-works | 2026-07-05
Source: About D2APP | https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-d2app | 2026-07-05
Source: About ValueChain EVM | https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-valuechain-evm | 2026-07-05
Source: JSON RPC | https://sodex.com/documentation/about-valuechain/how-valuechain-works/json-rpc | 2026-07-05
Source: How to add ValueChain to MetaMask | https://sodex.com/documentation/user-guide/faq/how-do-i-add-the-valuechain-network | 2026-07-05

### 3.5 WSOSO (Wrapped SOSO)

A canonical **WSOSO** contract is deployed at the vanity address `0x5050505050505050505050505050505050505050` on the ValueChain EVM syschain. It is **immutable** and has the same source code as WETH on Ethereum (only the name/symbol differ).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract WrappedSOSO {
    string public constant name = "Wrapped SOSO";
    string public constant symbol = "WSOSO";
    uint8 public constant decimals = 18;

    event Approval(address indexed src, address indexed guy, uint wad);
    event Transfer(address indexed src, address indexed dst, uint wad);
    event Deposit(address indexed dst, uint wad);
    event Withdrawal(address indexed src, uint wad);

    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    receive() external payable { deposit(); }

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint wad) public {
        require(balanceOf[msg.sender] >= wad);
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    function totalSupply() public view returns (uint) {
        return address(this).balance;
    }

    function approve(address guy, uint wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    function transfer(address dst, uint wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(address src, address dst, uint wad) public returns (bool) {
        require(balanceOf[src] >= wad);
        if (src != msg.sender && allowance[src][msg.sender] != type(uint256).max) {
            require(allowance[src][msg.sender] >= wad);
            allowance[src][msg.sender] -= wad;
        }
        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        emit Transfer(src, dst, wad);
        return true;
    }
}
```

Source: About WSOSO | https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-wsoso | 2026-07-05

---

## 4. SoDEX Orderbook Engine

The SoDEX order book functions with the **identical mechanics of a centralized exchange** but with fully decentralized, on-chain execution.

Key invariants:
- Prices must be integer multiples of the **tick size**.
- Sizes must be integer multiples of the **lot size**.
- Matching strictly follows **price-time priority** (best price first, then earliest entry time).
- No additional liquidation fee for the order-book liquidation step.
- Estimated liquidation price is a UI estimate, not a guarantee — actual liquidation outcome depends on mark price, order-book liquidity, funding payments, cross-position PnL, and changing margin tiers.

Source: Orderbook | https://sodex.com/documentation/trading-mechanics/orderbook | 2026-07-05
Source: Liquidations | https://sodex.com/documentation/trading-mechanics/liquidations | 2026-07-05

---

## 5. Mirror Protocol (Cross-Chain Bridge)

The Mirror Protocol is the **interoperability layer** that brings external assets into ValueChain. It is one of the three core pillars of the SoDEX stack (alongside SoDEX itself and ValueChain).

### 5.1 How it works

1. Users deposit native assets from external networks (BTC from Bitcoin, USDC from Base, etc.).
2. The protocol verifies the deposit (off-chain for non-EVM, on-chain for EVM).
3. Once verified, Mirror Protocol **mints an equivalent amount of a mirror token** on the SoDEX EVM chain. Mirror token naming convention: `vBTC`, `vUSDC`, `vETH`, etc.
4. Mirror tokens trade freely on SoDEX Spot and Perps.
5. Withdrawal reverses the process: mirror tokens are burned, native assets are released on the original chain.

### 5.2 Validator architecture

Mirror Protocol uses an **MPC + TEE-based validator architecture** (similar to leading cross-chain systems like Thorchain or Wormhole):
- A set of secure, distributed nodes equipped with **Trusted Execution Environments (TEE)** collectively validate deposit and withdrawal events.
- Consensus is required before minting or redemption.
- No single point of failure can compromise bridge security.

### 5.3 Mirror token examples

| Native asset | Mirror token | Source chain |
|---|---|---|
| BTC | vBTC | Bitcoin |
| ETH | vETH | Ethereum / Base / Arbitrum |
| USDC | vUSDC | Ethereum / Base / BSC / Polygon / Solana / Arbitrum |
| USDT | vUSDT | Ethereum / BSC / Arbitrum / Solana |
| SOL | vSOL | Solana |
| XRP | vXRP | XRP Ledger |
| ADA | vADA | Cardano |
| BNB | vBNB | BSC |
| AVAX | vAVAX | Avalanche |
| DOGE | vDOGE | Dogecoin |
| LTC | vLTC | Litecoin |
| SUI | vSUI | Sui |
| TON | vTON | TON |
| XLM | vXLM | Stellar |
| XMR | vXMR | Monero |
| ZEC | vZEC | Zcash |
| XAUT | vXAUT | Ethereum |
| HYPE | vHYPE | HyperEVM |
| AAPL/NVDA/TSLA/etc. | vAAPL, vNVDA, vTSLA, etc. | Solana (tokenized stocks) |
| MAG7.ssi / sMAG7.ssi | (direct deposit, no mirror) | Base |
| SOSO | (direct deposit, no mirror) | Base / Ethereum / ValueChain native |

Source: How SoDEX Works (Mirror Protocol section) | https://sodex.com/documentation/about-sodex/how-sodex-works | 2026-07-05
Source: Deposit from external wallet | https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-from-external-wallet | 2026-07-05

### 5.4 Bridge withdrawal fees (sample)

| Token | Chain | Withdrawal Fee | Bridge Withdrawal Fee | Min Deposit | Min Withdrawal |
|---|---|---|---|---|---|
| BTC | BTC | 0.00006 | 0 | 0.00005 | 0.0005 |
| ETH | BASE | 0.0005 | 0 | 0.002 | 0.0005 |
| ETH | ETH | 0.0005 | 0 | 0.002 | 0.002 |
| USDC | BASE | 1 | 0 | 5 | 5 |
| USDC | ETH | 1 | 0 | 5 | 5 |
| USDC | SOL | 1 | 0 | 5 | 5 |
| USDT | ETH | 1.5 | 0 | 5 | 2 |
| SOL | SOL | 0.012 | 0 | 0.03 | 0.012 |
| XRP | XRP | 0.8 | 0 | 3 | 2 |
| MAG7.ssi | BASE | 0 | 1 | 5 | 1 |
| sMAG7.ssi | BASE | 0 | 0.5 | 5 | 1 |
| DEFI.ssi | BASE | 0 | 4 | 20 | 20 |
| MEME.ssi | BASE | 0 | 4 | 20 | 20 |
| USSI | BASE | 0 | 1 | 5 | 2 |
| SOSO | BASE | 0 | (TBD) | (TBD) | (TBD) |
| XAUT | ETH | 0.0002 | 0 | 0.002 | 0.002 |
| ZEC | ZEC | 0 | 0 | 0.01 | 0.01 |
| AAPL | SOL | 0.004 | 0 | 0.0185 | 0.01 |
| NVDA | SOL | 0.005 | 0 | 0.03 | 0.01 |
| TSLA | SOL | 0.0025 | 0 | 0.0125 | 0.005 |

(Full table has ~30+ rows; see Source for the complete list.)

Source: Deposit and Withdrawal Configuration | https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-and-withdrawal-configuration | 2026-07-05

---

## 6. Custody & Security

### 6.1 Multi-custodian model

SoDEX partners with three institutional custodians: **Cobo**, **Ceffu**, and **Coinbase**. All user deposits are held in **segregated custody accounts** managed by these providers. The multi-custodian design provides redundancy and risk dispersion.

Practices employed by the custodians:
- **MPC key management** (multi-party computation)
- **Qualified trust structures**
- **Insurance-backed protection**

### 6.2 On-chain transparency via Mirror Protocol

Mirror assets are tokenized 1:1 on ValueChain. The mirrored tokens serve as on-chain representations of custodied assets and can be verified in real time on `https://main-scan.valuechain.xyz`.

### 6.3 KYT / KYA screening

| Stage | Screening | Purpose |
|---|---|---|
| Deposit | KYT (Know Your Transaction) | Detect funds linked to illicit or high-risk activity (money laundering, sanction evasion). Tainted deposits are auto-returned to the source address. |
| Withdrawal | KYA (Know Your Address) | Block transfers to high-risk or sanctioned destination addresses. |

### 6.4 Non-custodial trading

Despite the institutional custody layer for *backing* assets, the *trading account* is non-custodial: users hold their own EVM wallet private key (or use email-login with an embedded wallet). Trades settle on-chain to the user's account, not to a SoDEX hot wallet.

Source: Backing Asset Custody | https://sodex.com/documentation/custody-and-security/backing-asset-custody | 2026-07-05
Source: Deposit and Withdrawal Guidance | https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance | 2026-07-05

---

## 7. Audits

| Component | Auditors | Status |
|---|---|---|
| Mirror Protocol | BlockSec, Halborn, Quantstamp, TenAmor | All reported issues fully remediated and revalidated in follow-up assessments. |
| Vault Protocol | BlockSec, Quantstamp, TenAmor | All reported issues fully remediated and revalidated. |

Audit reports are **available upon request** (not published publicly on the docs site). The SSI Protocol smart contracts were additionally audited by **SlowMist** (referenced in the `ssi-protocol` GitHub repo commit history: "fix slow-mist audit comment" Aug 6 2024). BlockSec's public audit-report page also lists "The SoSoValue Index Protocol" as a cutting-edge spot index solution they reviewed.

Source: Audits | https://sodex.com/documentation/custody-and-security/audits | 2026-07-05
Source: SSI Protocol GitHub | https://github.com/SoSoValueLabs/ssi-protocol | 2026-07-05
Source: BlockSec audit reports | https://blocksec.com/audit-report | 2026-07-05
Source: Whitepaper §9.2 Audits | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/9.-resources/9.2-audits | 2026-07-05

---

## 8. Trading API Endpoints

### 8.1 REST endpoints

| Environment | Scope | URL |
|---|---|---|
| Mainnet | Public (shared) | `https://mainnet-gw.sodex.dev/api/v1` |
| Mainnet | Spot | `https://mainnet-gw.sodex.dev/api/v1/spot` |
| Mainnet | Perps | `https://mainnet-gw.sodex.dev/api/v1/perps` |
| Testnet | Public (shared) | `https://testnet-gw.sodex.dev/api/v1` |
| Testnet | Spot | `https://testnet-gw.sodex.dev/api/v1/spot` |
| Testnet | Perps | `https://testnet-gw.sodex.dev/api/v1/perps` |

### 8.2 WebSocket endpoints

| Environment | Scope | URL |
|---|---|---|
| Mainnet | Spot | `wss://mainnet-gw.sodex.dev/ws/spot` |
| Mainnet | Perps | `wss://mainnet-gw.sodex.dev/ws/perps` |
| Testnet | Spot | `wss://testnet-gw.sodex.dev/ws/spot` |
| Testnet | Perps | `wss://testnet-gw.sodex.dev/ws/perps` |

Source: Trading API Overview | https://sodex.com/documentation/trading-api/trading-api | 2026-07-05
Source: REST API v1 | https://sodex.com/documentation/trading-api/rest-v1 | 2026-07-05
Source: WebSocket API v1 | https://sodex.com/documentation/trading-api/websocket-v1 | 2026-07-05

---

## 9. Authentication & EIP-712 Signing

This is the single most important section to get right. SoDEX's auth model is intentionally CEX-like but with self-custody. Misunderstanding it is the #1 source of integration bugs.

### 9.1 Key terminology (pinned)

| Term | What it is | Example |
|---|---|---|
| Master wallet | The EVM wallet that owns the SoDEX account. Signs `addAPIKey` / `revokeAPIKey`. | `0xAbC...123` |
| Master wallet private key | 32-byte ECDSA private key of the master wallet. Stays offline; used only for one-time `addAPIKey` setup and revocation. | `0x1234...cdef` |
| API key | A named, revocable signing credential attached to the master account (or a sub-account) via `addAPIKey`. Each master account can hold up to **5 API keys**. Used for signing trading actions only — cannot query account data. | name=`api-key-01`, publicKey=`0x3d45...8256` |
| API key name | Human-readable string identifying one API key. Must match `^[0-9a-zA-Z_-]{1,36}$` and cannot be `default`. Passed in the `X-API-Key` HTTP header. **Despite the header's name, the value is the key name, not a public key or private key.** | `api-key-01` |
| API key public key | The EVM address registered for that API key. Stored on-chain when you call `addAPIKey`; echoed in query responses. | `0x3d4595c8742d0a58173a9963c05755b59a8f8256` |
| API key private key | 32-byte ECDSA private key whose public address matches the API key's public key. Held by the client; signs every request that presents that API key's name in `X-API-Key`. | `0xabcd...7890` |

### 9.2 Which key signs what

| Action | Who signs | Which private key |
|---|---|---|
| `addAPIKey` / `revokeAPIKey` | Master wallet | Master wallet's private key |
| All other trading actions (`newOrder`, `cancelOrder`, `transferAsset`, `updateLeverage`, `updateMargin`, `updateCollateral` (testnet only), `scheduleCancel`) | A registered API key | That API key's private key |

**Recommended workflow**: use the master wallet's private key only to register and revoke API keys. For all normal trading requests, sign with a dedicated API key's private key. This lets you keep the master wallet offline and rotate signing credentials without moving funds.

### 9.3 Header naming caveat (CRITICAL)

The HTTP header `X-API-Key` carries the **name** of the key, **not the key value**. The corresponding private key is used to produce `X-API-Sign`; the private key itself is never sent over the wire.

### 9.4 Default request headers

| Header | Type | Required | Description |
|---|---|---|---|
| `Content-Type` | string | true | `application/json` |
| `Accept` | string | true | `application/json` |
| `X-API-Key` | string | true (for writes) | Name of the API key (e.g. `api-key-01`). Omit to sign with the master wallet directly (the "default key"). |
| `X-API-Sign` | HexString | true (for writes) | EIP-712 typed signature. Must be prepended with byte `0x01`. |
| `X-API-Nonce` | uint64 | true (for writes) | Recommended: current Unix-ms timestamp. Must be within `(T - 2 days, T + 1 day)` window. |

### 9.5 Typed signature

SoDEX uses **EIP-712** for typed structured data hashing and signing, with **different domains for different actions**:

| Action class | `domain.name` | `domain.chainId` (mainnet) | `domain.chainId` (testnet) |
|---|---|---|---|
| Spot trading actions | `spot` | 286623 | 138565 |
| Perps trading actions | `futures` | 286623 | 138565 |
| addAPIKey / revokeAPIKey (universal) | (uses `EIP712_UNIVERSAL` signature type) | 286623 | 138565 |

After computing the EIP-712 signature `sig` (65 bytes: r || s || v), **prepend byte `0x01`** to produce the value of `X-API-Sign`.

Example: if your signed signature is `0x789a6bcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab`, the correct typed signature is `0x01789a6bcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab`.

### 9.6 How to compute `payloadHash`

```
payloadHash = Keccak256(json.Marshal(payload))
```

The payload is a JSON object with two fields: `type` (the action type string) and `params` (the action parameters object).

Action types:
- Spot: `newOrder`, `cancelOrder`, `transferAsset`, `scheduleCancel`, `revokeAPIKey`, and more.
- Perps: `newOrder`, `cancelOrder`, `updateLeverage`, `updateMargin`, `updateCollateral` (testnet only), `transferAsset`, `scheduleCancel`, `revokeAPIKey`, and more.

### 9.7 Critical rules for a correct `payloadHash`

1. **Compact JSON** — no whitespace or newlines. Use `json.Marshal` in Go or `JSON.stringify(obj)` without extra arguments in JS.
2. **Key order must match the Go struct field order** — the server re-marshals via `json.Marshal` after parsing into Go structs. If your JSON keys are in a different order, the hash will differ and signature verification will fail.
3. **Refer to the struct definitions in `sodex-go-sdk-public`** for the authoritative field order. Example: `PerpsOrderItem` fields must appear in this order: `clOrdID`, `modifier`, `side`, `type`, `timeInForce`, `price`, `quantity`, `funds`, `stopPrice`, `stopType`, `triggerType`, `reduceOnly`, `positionSide`.
4. **DecimalString fields are JSON strings, not numbers** — fields typed as `DecimalString` in the schema (`price`, `quantity`, `funds`, `stopPrice`) must be serialized as quoted strings (e.g. `"quantity":"0.001"`, not `"quantity":0.001`). The HTTP request body uses the same format.
5. **`omitempty` fields must be omitted when unset** — optional pointer fields (those with `json:",omitempty"`) must NOT appear in the JSON when they have no value. Non-optional fields (e.g. `modifier`, `reduceOnly`, `positionSide`) must always be present, even with zero values.

### 9.8 End-to-end signing example

To sign a `newOrder` action with a registered API key:

1. **Prerequisite**: you have already called `addAPIKey` (signed by the master wallet) and hold the API key's private key locally.
2. Compute `payloadHash` as described above.
3. EIP-712-sign the `ExchangeAction{payloadHash, nonce}` struct with the API key's private key under domain `{name:"futures", chainId:286623, verifyingContract:0x00…00}` (for perps mainnet).
4. Prepend byte `0x01` to the 65-byte signature → this is the value of `X-API-Sign`.
5. Send the request with `X-API-Key` set to the name of the API key (e.g. `api-key-01`) and `X-API-Nonce` set to a current Unix-ms timestamp.
6. The server looks up the API key named `api-key-01` on `accountID=12345`, recovers the signer address from `X-API-Sign`, and verifies it equals the API key's registered `publicKey` (`0x3d45…8256`).

### 9.9 Common signing pitfalls

1. **Putting the API key's EVM address (`0x3d45…8256`) in `X-API-Key`** — wrong. Use the name string.
2. **Signing the payload with the master wallet's private key** — wrong for trading actions; the server verifies against the API key's registered public key and will reject the signature. Exception: `addAPIKey` / `revokeAPIKey` MUST be signed by the master wallet.
3. **Forgetting the `0x01` prefix** — the server rejects un-typed raw 65-byte signatures.
4. **Wrong JSON key order** — most common bug when porting from JS to Python or vice versa. Always mirror the Go SDK struct order.
5. **Number vs string for DecimalString fields** — using `0.001` instead of `"0.001"` will fail signature verification.

Source: Trading API Overview (Auth section) | https://sodex.com/documentation/trading-api/trading-api | 2026-07-05
Source: REST API v1 (Auth section) | https://sodex.com/documentation/trading-api/rest-v1 | 2026-07-05
Source: Schema | https://sodex.com/documentation/trading-api/rest-v1/schema | 2026-07-05

---

## 10. Nonces

SoDEX uses a Hyperliquid-style nonce model.

- **The 100 highest nonces are stored per signing address.**
- Every new transaction must have a nonce larger than the smallest nonce in this set and must never have been used before.
- Nonces are tracked per signing address:
  - For trading actions: the API key's public key (EVM address).
  - For `addAPIKey` / `revokeAPIKey`: the master wallet's address (independent nonce counter).
- Nonces must be within `(T - 2 days, T + 1 day)`, where `T` is the Unix millisecond timestamp on the block of the transaction.

### 10.1 Recommended pattern for automated strategies

1. Use a **separate API key per trading process**. Two sub-accounts that both sign with the same API key share a single nonce tracker — concurrent strategies on each sub-account will race on the nonce. Create one API key per sub-account to avoid this.
2. The trading logic tasks send orders and cancels to a batching task.
3. For each batch of orders or cancels, fetch and increment an **atomic counter** that ensures a unique nonce for the address. The atomic counter can be fast-forwarded to current Unix milliseconds if needed.
4. This structure is robust to out-of-order transactions within 2 seconds, which should be sufficient for an automated strategy geographically near an API server.

Source: Trading API Overview (Nonces section) | https://sodex.com/documentation/trading-api/trading-api | 2026-07-05

---

## 11. Go SDK

The official **`sodex-go-sdk-public`** SDK is the only official SDK in the SoSoValue ecosystem. GitHub: https://github.com/sosovalue-tech/sodex-go-sdk-public (referenced in Go SDK Signing Guide docs — note: this URL points to a `sosovalue-tech` org, not `SoSoValueLabs`; verify before cloning).

### 11.1 What the SDK covers

- EIP-712 domain construction
- `payloadHash` generation
- signature-type prefixes (the `0x01` byte)
- spot and perps signer helpers

### 11.2 What the SDK does NOT cover

- HTTP clients
- WebSocket clients
- retries and reconnects
- rate-limit scheduling
- key storage

You must build those yourself.

### 11.3 Core entry points

```
common/signer/evm_signer.go
spot/signer/signer.go
perps/signer/signer.go
```

Use the **spot signer** for the spot domain and the **perps signer** for the futures domain.

### 11.4 Notes

- The returned signature already includes the SoDEX signature-type prefix (`0x01`).
- All nonces must still satisfy the gateway nonce rules (§10).
- The SDK marshals the request payload before hashing, so your custom clients should avoid mutating field order or names when reimplementing signing outside the SDK.

Source: Go SDK Signing Guide | https://sodex.com/documentation/trading-api/go-sdk-signing-guide | 2026-07-05

---

## 12. Rate Limits

### 12.1 IP-based REST rate limits

All REST API requests consume **weight** from a fixed 1-minute window. Once the total weight consumed within the window reaches the limit, subsequent requests are rejected until the window resets.

- **Default weight per unmatched endpoint**: 20
- **Overall limit**: 1200 weight per minute per IP

### 12.2 Public endpoints

| Endpoint | Weight |
|---|---|
| `GET /api/v1/user/{userAddress}/ratelimit` (query user rate limits) | 20 |

### 12.3 Spot market endpoints

| Endpoint | Weight |
|---|---|
| Query symbols / coins / tickers / mini tickers / book tickers | 2 |
| Query order book (depth ≤100 → 5, 101–500 → 10, >500 → 20) | 5–20 |
| Query candles / klines | 20 |
| Query recent trades | 20 |

### 12.4 Spot account endpoints

| Endpoint | Weight |
|---|---|
| Query balances / open orders / state for frontend / API Keys | 5 |
| Query fee rate | 2 |
| Query order history / user trades | 20 + 1 per 20 items returned |
| Transfer asset to EVM or perps | 10 |

### 12.5 Spot trading endpoints

| Endpoint | Weight |
|---|---|
| Place / cancel / replace multiple orders | 1 + floor(N/40), where N = number of orders |
| Schedule cancel orders | 1 |

### 12.6 Perps market endpoints

Same as Spot, plus:

| Endpoint | Weight |
|---|---|
| Query mark prices | 2 |

### 12.7 Perps account endpoints

Same as Spot, plus:

| Endpoint | Weight |
|---|---|
| Query open positions | 5 |
| Query position history | 20 + 1 per 20 items returned |
| Query funding history | 20 + 1 per 20 items returned |

### 12.8 Perps trading endpoints

| Endpoint | Weight |
|---|---|
| Place / cancel / replace multiple orders | 1 + floor(N/40) |
| Modify TP/SL order | 1 |
| Schedule cancel orders | 1 |
| Update leverage | 1 |
| Update isolated margin | 1 |

### 12.9 Dynamic weight rules

**Orderbook depth**:
| Depth (limit) | Weight |
|---|---|
| ≤ 100 (default) | 5 |
| 101 – 500 | 10 |
| > 500 | 20 |

**Batch order formula**:
| Batch size | Weight |
|---|---|
| 1 – 39 | 1 |
| 40 – 79 | 2 |
| 80 – 119 | 3 |

**History extra weight**: history endpoints incur additional weight after the response, based on items returned.

**Kline cache miss extra weight**: kline requests have a base weight of 20. Additional weight may apply based on the number of rows returned.

### 12.10 Order placement limits (separate from weight budget)

| Client type | Limit | Scope |
|---|---|---|
| API key | 600 orders / minute AND 20 orders / second | per account |
| Web (no key) | 60 orders / minute | per account |

For batched requests, the number of orders counted against these limits is the batch length: `order_count = len(batch)`.

### 12.11 WebSocket limits

| Limit | Value |
|---|---|
| Concurrent connections per IP | 10 |
| New connections per IP per minute | 30 |
| Subscriptions per IP (all connections) | 1000 |
| Unique users per IP | 10 |
| Messages per IP per minute | 2000 |
| Messages per connection per minute | 2000 |
| Inflight requests per IP | 100 |

### 12.12 Address-based rate limits

Address-based limits apply **per user address** and only affect **actions** (order placement, cancellation, etc.), not info/query requests.

- The rate-limiting logic allows **1 request per 1 USDC traded** cumulatively since address inception.
- Example: with an order value of 100 USDC, this requires a fill rate of 1%.
- Each address starts with an **initial buffer of 10,000 requests**.
- When rate-limited, an address is allowed **1 request every 10 seconds**.
- Cancels have a higher cumulative limit to ensure open orders can always be wound down (where `limit` is the default limit for other actions).
- Each user has a default open-order limit of **1000 across all symbols combined** (spot + perps).

### 12.13 Batched request counting

| Dimension | Counted as |
|---|---|
| IP-based weight | 1 request (weight per the batch formula) |
| Address-based limit | N requests (one per order/cancel in the batch) |

Source: API Rate Limits | https://sodex.com/documentation/trading-api/api-rate-limits | 2026-07-05

---

## 13. REST API — Spot

All endpoints below are under `${SPOT_ENDPOINT}` = `https://mainnet-gw.sodex.dev/api/v1/spot` (mainnet) or `https://testnet-gw.sodex.dev/api/v1/spot` (testnet).

### 13.1 Market endpoints (public, unsigned)

| # | Method | Path | Notes |
|---|---|---|---|
| 1 | GET | `/markets/symbols` | Optional `symbol` query param (e.g. `vBTC_vUSDC`). Returns `Array<SpotSymbol>`. |
| 2 | GET | `/markets/coins` | Optional `coin` query param (e.g. `vBTC`). Returns `Array<SpotCoin>`. |
| 3 | GET | `/markets/tickers` | 24h rolling stats. Optional `symbol`. Returns `Array<SpotTicker>`. |
| 4 | GET | `/markets/miniTickers` | Compact 24h stats. Returns `Array<MiniTicker>`. |
| 5 | GET | `/markets/bookTickers` | Best bid/ask. Returns `Array<BookTicker>`. |
| 6 | GET | `/markets/{symbol}/orderbook` | `limit` query param (uint32, default 10, max 1000). Returns `OrderBook`. |
| 7 | GET | `/markets/{symbol}/klines` | `interval` (case-sensitive): `1m, 3m, 5m, 15m, 30m, 1h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M` (day/week lowercase, month uppercase). `startTime`/`endTime` (uint64 ms). `limit` (default 500, max **1500**). Returns `Array<RPCKline>`. |
| 8 | GET | `/markets/{symbol}/trades` | `limit` (default 50, max 500). Returns `Array<Trade>`. |

### 13.2 Account endpoints (signed)

| # | Method | Path | Notes |
|---|---|---|---|
| 9 | GET | `/accounts/{userAddress}/balances` | Optional `accountID`. Returns `SpotAccountBalances`. |
| 10 | GET | `/accounts/{userAddress}/orders` | Open orders. Optional `symbol`, `accountID`. |
| 11 | GET | `/accounts/{userAddress}/state` | Comprehensive state for UI: balances, positions, open orders, sync metadata. Returns `WsSpotState`. |
| 12 | GET | `/accounts/{userAddress}/api-keys` | List API keys. |
| 13 | GET | `/accounts/{userAddress}/feeRate` | Fee rate. |
| 14 | GET | `/accounts/{userAddress}/orderHistory` | Order history. Paginated; 1 extra weight per 20 items returned. |
| 15 | GET | `/accounts/{userAddress}/trades` | User trades. Paginated. |
| 16 | POST | `/accounts/{userAddress}/transferAsset` | Transfer asset to EVM or perps. Weight 10. |

### 13.3 Trading endpoints (signed)

| # | Method | Path | Notes |
|---|---|---|---|
| 17 | POST | `/accounts/{userAddress}/orders` | Place multiple orders. Weight: 1 + floor(N/40). |
| 18 | DELETE | `/accounts/{userAddress}/orders` | Cancel multiple orders. Weight: 1 + floor(N/40). |
| 19 | PUT | `/accounts/{userAddress}/orders` | Replace multiple orders. Weight: 1 + floor(N/40). |
| 20 | POST | `/accounts/{userAddress}/scheduleCancel` | Schedule cancel. Weight: 1. |

### 13.4 Public API key endpoint

| # | Method | Path |
|---|---|---|
| 21 | POST | `/accounts/{userAddress}/addAPIKey` (signed by master wallet, `EIP712_UNIVERSAL`) |
| 22 | POST | `/accounts/{userAddress}/revokeAPIKey` (signed by master wallet) |

Source: Spot REST API | https://sodex.com/documentation/trading-api/rest-v1/sodex-rest-spot-api | 2026-07-05

---

## 14. REST API — Perps

All endpoints below are under `${PERPS_ENDPOINT}` = `https://mainnet-gw.sodex.dev/api/v1/perps` (mainnet) or `https://testnet-gw.sodex.dev/api/v1/perps` (testnet).

### 14.1 Market endpoints (public, unsigned)

| # | Method | Path | Notes |
|---|---|---|---|
| 1 | GET | `/markets/symbols` | Optional `symbol` (e.g. `BTC-USD`). Returns `Array<PerpsSymbol>`. |
| 2 | GET | `/markets/coins` | Optional `coin` (e.g. `vUSDC`). Returns `Array<PerpsCoin>`. |
| 3 | GET | `/markets/tickers` | 24h rolling stats. Returns `Array<PerpsTicker>`. |
| 4 | GET | `/markets/miniTickers` | Compact stats. Returns `Array<MiniTicker>`. |
| 5 | GET | `/markets/mark-prices` | Mark price + funding rate. Returns `Array<MarkPriceTicker>`. |
| 6 | GET | `/markets/bookTickers` | Best bid/ask. Returns `Array<BookTicker>`. |
| 7 | GET | `/markets/{symbol}/orderbook` | `limit` (default 10, max 1000). Returns `OrderBook`. |
| 8 | GET | `/markets/{symbol}/klines` | `interval` (case-sensitive): `1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M`. **Note**: perps supports a smaller set than spot — `3m, 2h, 6h, 8h, 12h, 3d` are NOT available. `limit` (default 500, max 1000). Returns `Array<RPCKline>`. |
| 9 | GET | `/markets/{symbol}/trades` | `limit` (default 50, max 500). Returns `Array<Trade>`. |

### 14.2 Account endpoints (signed)

| # | Method | Path | Notes |
|---|---|---|---|
| 10 | GET | `/accounts/{userAddress}/balances` | Returns `PerpsAccountBalance`. |
| 11 | GET | `/accounts/{userAddress}/orders` | Open orders. |
| 12 | GET | `/accounts/{userAddress}/positions` | Open positions. Returns `PerpsAccountOpenPosition`. |
| 13 | GET | `/accounts/{userAddress}/state` | Comprehensive state. Returns `WsPerpsState`. |
| 14 | GET | `/accounts/{userAddress}/api-keys` | List API keys. |
| 15 | GET | `/accounts/{userAddress}/feeRate` | Fee rate. |
| 16 | GET | `/accounts/{userAddress}/orderHistory` | Order history. Paginated. |
| 17 | GET | `/accounts/{userAddress}/positionHistory` | Position history. Paginated. |
| 18 | GET | `/accounts/{userAddress}/trades` | Trades. Paginated. |
| 19 | GET | `/accounts/{userAddress}/fundingHistory` | Funding history. Paginated. |
| 20 | POST | `/accounts/{userAddress}/transferAsset` | Transfer asset to spot. Weight 10. |

### 14.3 Trading endpoints (signed)

| # | Method | Path | Notes |
|---|---|---|---|
| 21 | POST | `/accounts/{userAddress}/orders` | Place multiple orders. |
| 22 | DELETE | `/accounts/{userAddress}/orders` | Cancel multiple orders. |
| 23 | PUT | `/accounts/{userAddress}/orders` | Replace multiple orders. |
| 24 | POST | `/accounts/{userAddress}/orders/tpsl` | Modify TP/SL order. Weight 1. |
| 25 | POST | `/accounts/{userAddress}/scheduleCancel` | Schedule cancel. Weight 1. |
| 26 | POST | `/accounts/{userAddress}/leverage` | Update leverage. Weight 1. |
| 27 | POST | `/accounts/{userAddress}/margin` | Update isolated margin. Weight 1. |
| 28 | POST | `/accounts/{userAddress}/collateral` | Update collateral (testnet only). |

### 14.4 PerpsOrderItem field order (CRITICAL for signing)

When constructing a perps order payload for EIP-712 signing, the `PerpsOrderItem` fields MUST appear in this exact order:

```
clOrdID, modifier, side, type, timeInForce, price, quantity, funds,
stopPrice, stopType, triggerType, reduceOnly, positionSide
```

DecimalString fields (`price`, `quantity`, `funds`, `stopPrice`) must be JSON **strings**, not numbers.

Source: Perps REST API | https://sodex.com/documentation/trading-api/rest-v1/sodex-rest-perps-api | 2026-07-05

---

## 15. WebSocket API

### 15.1 Connection management

- **Auto-disconnect on idle**: if no subscription is established or no data has been pushed for **more than 60 seconds**, the connection is broken automatically.
- **Ping/pong heartbeat**: set a timer of N seconds (N < 60) on every received message. If the timer triggers (no new message), send `{"op":"ping"}` and expect `{"op":"pong"}` within N seconds. If no pong, raise an error or reconnect.
- **User-specific streams do not require auth**: any client may subscribe to any user's data; API-key auth is NOT required for subscriptions.

### 15.2 Subscription message format

```ts
interface SubscribeRequest {
  op: "subscribe";
  id: number | null; // Optional client originated request identifier sent as ack
  params: <SubscriptionParams>;
}
```

### 15.3 Subscription result (ack)

```ts
interface SubscriptionResult {
  op: "subscribe";
  id: number | null;
  result: <SubscriptionResult> | null;
  success: boolean;
  connID: string;
  error: string | null; // present if success is false
  time_in: number; // ms when subscription was received on the wire
  time_out: number; // ms when ack was sent on the wire
}
```

### 15.4 Unsubscribe message

```ts
interface UnsubscribeRequest {
  op: "unsubscribe";
  id: number | null;
  params: <SubscriptionParams>; // must match original subscribe
}
```

Unsubscribing from one feed does not affect other active subscriptions. To unsubscribe multiple feeds, send multiple unsubscribe messages.

### 15.5 Available streams

| Stream | Scope | Update speed | Notes |
|---|---|---|---|
| Ticker | Per-symbol | Per block | 24h rolling stats |
| All Tickers | All symbols | Per block | Only changed tickers in array |
| Mini Ticker | Per-symbol | Per block | Compact stats |
| All Mini Tickers | All symbols | Per block | Only changed tickers |
| Book Ticker | Per-symbol | Per block | Best bid/ask updates |
| All Book Tickers | All symbols | Per block | Only changed tickers |
| Mark Price | Per-symbol (perps only) | Per block, throttled to ≥1s since last push | Mark price + funding rate |
| All Mark Prices | All symbols (perps only) | Per block, throttled to ≥1s | Only changed tickers |
| L2 Book | Per-symbol | Per block | Order-book depth, level 2 |
| L4 Book | Per-symbol | Per block | Order-book depth, level 4 |
| Candles (OHLC) | Per-symbol, per-interval | Per block | Kline updates |
| Market Trades | Per-symbol | Per block | Public trades |
| Account Frontend State | Per-user | Per block | Full state for UI |
| Account Updates | Per-user | Per block | Balance / position updates |
| Account Order Updates | Per-user | Per block | Order created / status changed |
| Account Trades | Per-user | Per block | Fast trade stream (TRADE execution type only, fewer fields) |
| Account Events | Per-user | Per block | Liquidations (perps only) and other events |

Source: WebSocket API v1 | https://sodex.com/documentation/trading-api/websocket-v1 | 2026-07-05
Source: Account Events | https://sodex.com/documentation/trading-api/websocket-v1/account-events | 2026-07-05
Source: Account Order Updates | https://sodex.com/documentation/trading-api/websocket-v1/account-order-updates | 2026-07-05
Source: Account Trades | https://sodex.com/documentation/trading-api/websocket-v1/account-trades | 2026-07-05
Source: Account Updates | https://sodex.com/documentation/trading-api/websocket-v1/account-updates | 2026-07-05
Source: All Book Tickers | https://sodex.com/documentation/trading-api/websocket-v1/all-book-tickers | 2026-07-05
Source: All Mark Prices | https://sodex.com/documentation/trading-api/websocket-v1/all-mark-prices | 2026-07-05
Source: Book Ticker | https://sodex.com/documentation/trading-api/websocket-v1/book-ticker | 2026-07-05
Source: Candles | https://sodex.com/documentation/trading-api/websocket-v1/candles | 2026-07-05
Source: L2 Book | https://sodex.com/documentation/trading-api/websocket-v1/l2book | 2026-07-05
Source: L4 Book | https://sodex.com/documentation/trading-api/websocket-v1/l4book | 2026-07-05
Source: Mark Price | https://sodex.com/documentation/trading-api/websocket-v1/mark-price | 2026-07-05
Source: Market Trade | https://sodex.com/documentation/trading-api/websocket-v1/market-trade | 2026-07-05
Source: Ticker | https://sodex.com/documentation/trading-api/websocket-v1/ticker | 2026-07-05
Source: Mini Ticker | https://sodex.com/documentation/trading-api/websocket-v1/mini-ticker | 2026-07-05
Source: Account Frontend State | https://sodex.com/documentation/trading-api/websocket-v1/account-frontend-state | 2026-07-05

---

## 16. Trading Mechanics

### 16.1 Order Types (recap)

| Type | Description | Primary use case |
|---|---|---|
| Market | Immediate at best available price. Default slippage tolerance: **1%**. | Fast entry/exit. Taker. |
| Limit | At specified price or better. | Maker. |
| Stop Market | Triggered at stop price → market order. | Stop-loss / breakout entry. |
| Stop Limit | Triggered at stop price → limit order. | Loss-limiting with price protection. |

### 16.2 Order Options

| Option | Description |
|---|---|
| Reduce-Only | Perps only. Decreases existing position; cannot open new. |
| GTC | Default. Stays until filled or canceled. |
| IOC | Fills what it can, cancels rest. |
| TP / SL | Triggered by Mark Price → market order. |

### 16.3 Fees (testnet historical)

On testnet originally:
- Spot: 0.1% taker, 0.05% maker
- Futures: 0.05% taker, 0.02% maker

Source: Fees (legacy) | https://sodex.com/documentation/trading-mechanics/fees | 2026-07-05

### 16.4 Trading Fees (current mainnet, since 2025-03-13)

Fees are determined by **rolling 14-day volume**, re-evaluated daily at end of UTC day. Perps + spot volume is combined with spot double-weighted:

```
14D weighted volume = (14D perps volume) + 2 × (14D spot volume)
```

#### Perps fee tiers

| Tier | 14D Volume (USD) | Perps Taker | Perps Maker |
|---|---|---|---|
| 0 | ≤ $5,000,000 | 0.040% | 0.012% |
| 1 | > $5,000,000 | 0.036% | 0.010% |
| 2 | > $25,000,000 | 0.032% | 0.006% |
| 3 | > $100,000,000 | 0.028% | 0.002% |
| 4 | > $500,000,000 | 0.026% | 0.000% |
| 5 | > $2,000,000,000 | 0.024% | 0.000% |
| 6 | > $7,000,000,000 | 0.022% | 0.000% |

#### Spot fee tiers

| Tier | 14D Volume (USD) | Spot Taker | Spot Maker |
|---|---|---|---|
| 0 | ≤ $5,000,000 | 0.065% | 0.035% |
| 1 | > $5,000,000 | 0.055% | 0.025% |
| 2 | > $25,000,000 | 0.045% | 0.015% |
| 3 | > $100,000,000 | 0.035% | 0.005% |
| 4 | > $500,000,000 | 0.03% | 0.00% |
| 5 | > $2,000,000,000 | 0.025% | 0.00% |
| 6 | > $7,000,000,000 | 0.02% | 0.00% |

#### Staking Fee Discount

Staking $SOSO grants a fee discount applied to the volume-based fee. Updates at end of UTC day.

| Fee Discount | SOSO Staked |
|---|---|
| 0% | 0 SOSO |
| 5% | ≥ 30 SOSO |
| 10% | ≥ 300 SOSO |
| 15% | ≥ 3,000 SOSO |
| 20% | ≥ 30,000 SOSO |
| 30% | ≥ 300,000 SOSO |
| 40% | ≥ 1,500,000 SOSO |

`Effective fee = Base fee × (1 - Staking discount)`

Tip: when you initiate partial unstaking, despite the 14-day unstaking period, your fee discount will be **instantly recalculated** based only on your remaining staked SOSO.

#### Maker Rebates

If your 14D maker volume share reaches a threshold, you qualify for **Maker Rebates** — a negative fee rate where the platform pays you.

| Tier | 14D Maker Volume Share | Maker |
|---|---|---|
| 1 | > 0.50% | -0.001% |
| 2 | > 1.50% | -0.002% |
| 3 | > 3.00% | -0.003% |

Rebates are paid continuously on each trade directly to your trading wallet.

Source: Trading Fees | https://sodex.com/documentation/trading-mechanics/trading-fees | 2026-07-05

### 16.5 Margining

SoDEX margin calculations align with standard CEX formulas.

**Margin modes**:
- **Cross Margin**: liquidation based on total cross portfolio value vs total maintenance margin for cross positions. PnL from other cross positions affects liquidation risk. Additional cross collateral delays liquidation. Leverage at order entry does NOT by itself determine final liquidation price.
- **Isolated Margin**: liquidation based only on equity assigned to that position vs maintenance margin for that position. Other positions do not protect it. Losses limited to isolated collateral.

**Maintenance Margin** (tiered system):

```
Maintenance Margin = Notional Position Value × Maintenance Margin Rate − Maintenance Deduction
```

Both Maintenance Margin Rate and Maintenance Deduction are determined **solely by the margin tier** — independent of the specific asset.

```
Maintenance Margin Rate (Tier=n) = Initial Margin Rate at Max Leverage (Tier=n) / 2
```

For example: max leverage 20x → initial margin rate 5% → maintenance margin rate 2.5%.

Maintenance Deduction is calculated recursively to ensure continuity across tier boundaries:

```
Maintenance Deduction (Tier=0) = 0
Maintenance Deduction (Tier=n) = Maintenance Deduction (Tier=n-1)
  + Notional Position Lower Bound (Tier=n)
    × (Maintenance Margin Rate (Tier=n) − Maintenance Margin Rate (Tier=n-1))
```

Source: Margining | https://sodex.com/documentation/trading-mechanics/margining | 2026-07-05

### 16.6 Margin Tiers by Asset

| Asset | Tier 1 (max lev) | Tier 2 | Tier 3 |
|---|---|---|---|
| BTC | 0–4M: 40x | 4M–1B: 10x | >1B: 1x |
| ETH, XAUT | 0–4M: 25x | 4M–1B: 10x | >1B: 1x |
| USTECH100 | 0–250k: 25x | 250k–100M: 10x | >100M: 1x |
| SOL | 0–4M: 20x | 4M–1B: 10x | >1B: 1x |
| SILVER | 0–500k: 20x | 500k–1B: 10x | >1B: 1x |
| US500 | 0–250k: 20x | 250k–100M: 10x | >100M: 1x |
| CL, COPPER | 0–125k: 20x | 125k–100M: 10x | >100M: 1x |
| BCH, DOGE, NEAR, XRP, ZEC | 0–2M: 10x | 2M–1B: 5x | >1B: 1x |
| 1000BONK, 1000PEPE, 1000SHIB, AAVE, ADA, AVAX, BNB, ENA, FARTCOIN, HYPE, LINK, LTC, ONDO, PUMP, SUI, UNI, WLD, XPL | 0–1M: 10x | 1M–1B: 5x | >1B: 1x |
| AAPL, AMD, AMZN, BASED, COIN, CRCL, EWY, GOOGL, HOOD, INTC, META, MSFT, MSTR, MU, NVDA, ORCL, PLTR, SAMSUNG, SKHX, SNDK, TON, TSLA, TSM | 0–125k: 10x | 125k–100M: 5x | >100M: 1x |
| ASTER, AXS, BERA, DASH, ETC, FIL, MON, PENGU, VIRTUAL, WIF, WLFI, XMR | 0–1M: 5x | 1M–1B: 2x | >1B: 1x |
| APT, ARB, CHZ, HBAR, LIT, OP, TRUMP, TRX, XLM | 0–250k: 5x | 250k–1B: 2x | >1B: 1x |

Source: Margin Tiers | https://sodex.com/documentation/trading-mechanics/margin-tiers | 2026-07-05

### 16.7 Multi-Asset Margin

Multi-Asset Margin lets you use selected non-USDC assets as collateral for futures trading on SoDEX. Applies to **Cross Margin mode only**. Isolated positions must be margined with USDC.

| Asset | Collateral Ratio | Role |
|---|---|---|
| USDC | 100% | Primary margin (no haircut) |
| BTC | 90% | Multi-asset collateral |
| XAUT | 90% | Multi-asset collateral |
| ETH | 90% | Multi-asset collateral |
| SOSO | 50% | Multi-asset collateral (capped) |

```
Multi-Asset Margin contribution = Asset Balance × Index Price × Collateral Ratio
```

Example: 1 BTC at $100,000 index price with 90% collateral ratio contributes $90,000 of margin.

#### Deposit cap

- Account-level cap: **$500,000 USD** total collateral value (after collateral ratios). Checked at moment of deposit; price-driven increases above the cap do not force-sell.
- SOSO-specific sub-cap: `min(30,000 SOSO, 10,000 USDC worth of SOSO)` valued at index price. Checked at deposit; rejected in full if exceeded.

#### Withdrawal check

```
Collateral Value (after withdrawal) + Unrealized Losses ≥ Total Initial Margin
```

Unrealized profit doesn't increase withdrawable amount — close the position first to free up collateral backed by profits.

Source: Multi-Asset Margin | https://sodex.com/documentation/trading-mechanics/multi-asset-margin | 2026-07-05

### 16.8 Liquidations

#### Triggers

A position becomes eligible for liquidation when portfolio margin falls below required maintenance margin.

- **Cross**: based on total cross portfolio value vs total maintenance margin for cross positions.
- **Isolated**: based only on equity assigned to that position vs maintenance margin for that position.

SoDEX uses the **mark price** for liquidation checks, not the last traded price.

#### Stage 1: Order-Book Liquidation

SoDEX first tries to reduce/close the position through the public order book via market execution. **No additional liquidation fee** is charged at this stage.

**Large position handling** (position > 100,000 USDC):
1. First attempt sends only **20%** of the position.
2. **30-second cooldown** (does not pause liquidation risk).
3. After cooldown, if still liquidatable, the system may send the **entire remaining position** rather than another partial.

#### Stage 2: Backstop Liquidation

If order-book liquidation is insufficient AND portfolio value falls below **two-thirds of the maintenance margin requirement**, the position enters backstop liquidation.

- Cross: all cross positions + all cross collateral transferred.
- Isolated: only that position + its isolated collateral transferred.
- Maintenance margin is **NOT** returned to the trader.

#### Stage 3 (extreme): Auto-Deleveraging (ADL)

If account value becomes negative, SoDEX uses ADL. See §16.9.

#### Estimated liquidation price

```
liq_price = price - side × margin_available / position_size / (1 - l × side)
```

Where:
- `price` = average entry price
- `side` = +1 long, -1 short
- `position_size` = base asset position size
- `l` = maintenance leverage at the liquidation price
- `margin_available`:
  - Cross: `account_value - maintenance_margin`
  - Isolated: `isolated_margin`

Source: Liquidations | https://sodex.com/documentation/trading-mechanics/liquidations | 2026-07-05

### 16.9 Auto-Deleveraging (ADL)

ADL strictly ensures platform solvency. When a user's account value or isolated position value becomes negative, users on the **opposite side** are ranked based on unrealized PnL and leverage. Backstop-liquidated positions receive no special treatment in the ADL queue.

Positions are closed at the **previous mark price** against the underwater user, preventing bad debt for the platform.

**Critical invariant**: under all circumstances, users with **no open positions will not bear any platform losses**.

Source: Auto-Deleveraging | https://sodex.com/documentation/trading-mechanics/auto-deleveraging | 2026-07-05

### 16.10 Funding

Funding rates align perpetual contract prices with the underlying spot price. Funding is **peer-to-peer** — SoDEX collects no fees from these payments.

| Funding Rate | Contract Status | Payment Direction |
|---|---|---|
| Positive (>0) | Premium (higher than Spot) | Longs pay Shorts |
| Negative (<0) | Discount (lower than Spot) | Shorts pay Longs |

- **Frequency**: every **1 hour**.
- **Cap**: maximum funding rate is **4% per hour** (significantly less aggressive than many CEXes).

#### Funding Rate Calculation

Standard 8-hour formula, divided by 8 for hourly rate:

```
Funding Rate (8-hour) = Average Premium Index (P) + clamp(Interest Rate - P, -0.05%, 0.05%)
```

- **Interest Rate**: fixed at 0.03% per day = 0.01% per 8-hour period.
- **Premium Index (P)**: measures contract's deviation from Oracle Price based on order book liquidity.
  - **Impact Notional**: `200 USD × Max Leverage of the specific asset`.
  - **Impact Price**: average execution price to fill Impact Notional on bid and ask sides.
  - **Premium** = `Impact Price Difference / Oracle Price`
  - **Impact Price Difference** = `max(0, Impact Bid Price - Oracle Price) - max(0, Oracle Price - Impact Ask Price)`
- **Averaging**: premium sampled every **5 seconds**; simple average → Average Premium Index (P).

#### Funding Fee Payment

```
Funding Payment = Position Size × Oracle Price × Hourly Funding Rate
```

Note: Oracle Price (not mark price) is used to convert position size to notional value for this calculation.

Source: Funding | https://sodex.com/documentation/trading-mechanics/funding | 2026-07-05
Source: Funding (Legacy) | https://sodex.com/documentation/trading-mechanics/funding-legacy | 2026-07-05

### 16.11 Index Price & Mark Price

#### Index Price

Represents fair market value of underlying spot asset, aggregated from multiple high-liquidity exchanges.

- Any exchange price excluded if no trade in past 60 seconds.
- Computed as **weighted median** of mid-prices across all valid spot exchanges.
- Weights based on relative trading volume and reliability of each exchange.

```
Index Price = Weighted Median(P_1, P_2, ..., P_n)
Valid(P_i) = true if last trade ≤ 60s, false otherwise
```

#### Mark Price

Manipulation-resistant reference price used for:
- Margin requirements (margining)
- Liquidation triggers
- TP/SL activation
- Unrealized PnL

```
Mark Price = Median(Index Price, Smoothed Index Price, Local Price, External Perp Mid Price)
```

Where:
- **Index Price** (see above)
- **Smoothed Index Price** = `Index Price + EMA_150s(Index Price - Mid Price)` — stability-enhanced
- **SoDEX Local Price** = `Median(Best Bid, Best Ask, Last Trade Price)`
- **External Perp Mid Price** = `(Ext Best Bid + Ext Best Ask) / 2` — reference from leading derivatives exchanges

If only two price sources are valid, **Smoothed Local Price** = `EMA_30s(Local Price)` is added to maintain stability.

Mark price updates whenever validators submit new oracle price updates — both mark and oracle prices refresh approximately every **3 seconds**.

Source: Index Price & Mark Price | https://sodex.com/documentation/trading-mechanics/index-price-and-mark-price | 2026-07-05

### 16.12 Entry Price & PnL

#### Trade types

| Trade Type | Definition | Effect on Position Size |
|---|---|---|
| Opening Trade | Increases absolute size of existing position (buying more Long, selling more Short) | Increases |
| Closing Trade | Decreases absolute size (selling Long, buying back Short) | Decreases |

#### Entry Price Calculation

- **Opening Trade**: weighted average of previous entry price and new trade price, based on notional sizes.
- **Closing Trade**: entry price of remaining open position **remains unchanged**.

#### PnL Formulas

**Unrealized PnL** (open positions, based on current Mark Price):
```
Unrealized PnL = side × (mark_price - entry_price) × position_size
```
`side` = +1 for Long, -1 for Short.

**Closed PnL** (realized):
- For Closing Trade: `Closed PnL = fees + [side × (exit_price - entry_price) × closed_size]`
- For Opening Trade: `Closed PnL = fees` only (no profit realized until position closed)

#### Spot Market Distinctions

- Buys = Opening Trades.
- Sells = Closing Trades.
- Wallet transfers of assets (for accounting) = virtual buys or sells at current Mark Price.

Source: Entry price and PnL | https://sodex.com/documentation/trading-mechanics/entry-price-and-pnl | 2026-07-05

### 16.13 TP/SL Orders

- TP/SL triggered by **Mark Price**.
- Executed as **Market orders**.
- Can set a limit price and configure the amount of the position to TP/SL.
- For OCO (parent order with TP/SL children): child TP/SL orders are placed **only when the parent order is fully filled**.
- Exception: if parent is partially filled then canceled due to insufficient margin, TP/SL is activated for the filled portion.

Source: TP/SL | https://sodex.com/documentation/trading-mechanics/take-profit-and-stop-loss-orders-tp-sl | 2026-07-05

### 16.14 Contract Specifications

| Specification | Value |
|---|---|
| Instrument Type | Linear Perpetual |
| Contract Size | 1 unit of the underlying spot asset |
| Underlying Asset / Ticker | SoDEX oracle index of the underlying spot asset |
| Initial Margin Fraction | `1 / (Leverage set by the user)` |
| Maintenance Margin Fraction | 50% of the Initial Margin Fraction |
| Mark Price | See §16.11 |
| Delivery / Expiration | N/A (funding every hour) |
| Position Limit | N/A |
| Account Type | Per-wallet cross or isolated margin |
| Funding Impact Notional | `200 USD × Max Leverage of the specific asset` |
| Maximum Market Order Value | BTC/ETH: $4M; Other assets: $1M–$2M |
| Maximum Limit Order Value | Same as Maximum Market Order Value |

#### Quanto structure

SoDEX uses a **USDC-margined, USDT-denominated linear contract** model:
- Collateral (margin) held in **USDC**.
- Oracle price feed and Notional Value denominated in **USDT**.
- PnL denominated in USDT is settled and paid out in USDC → **Quanto Contracts**.
- **No currency conversion** is applied for PnL settlement.

For assets where primary spot market liquidity dictates, the oracle price may be denominated in USDC (case-by-case).

Source: Contract Specifications | https://sodex.com/documentation/trading-mechanics/contract-specifications | 2026-07-05

---

## 17. Vaults

### 17.1 SoDEX Liquidity Provider (SLP)

The SLP is a community-owned market-making pool that forms the core liquidity reserve of the SoDEX ecosystem. It bridges capital seeking stable yield with professional market-making strategies.

Participants deposit eligible assets into Market Making Pools to share in SoDEX's liquidity revenues while continuing to enjoy underlying index staking yields and SOSO airdrop eligibility.

### 17.2 sMAG7.ssi Vault

Enables holders of sMAG7.ssi tokens to participate directly in SoDEX's liquidity-provision mechanism. By depositing sMAG7.ssi, users become passive market makers in SoDEX's professional order-book system, sharing a proportional part of market-making revenue generated across supported trading pairs.

### 17.3 Dual Yield Mechanism

Vault participants benefit from a dual-source yield model:
1. **Index Yield**: deposited sMAG7.ssi tokens continue to accrue their regular index staking yield and remain eligible for SOSO airdrop calculations.
2. **Market-Making Yield**: the same deposit is simultaneously utilized for market-making activities within SoDEX, earning a share of the exchange's liquidity rewards and fee rebates.

This model allows users to enjoy compound yield exposure without manually managing liquidity or positions.

### 17.4 Deposits & Withdrawals

- **Deposits**: SLP accepts MAG7.ssi and sMAG7.ssi. Depositing MAG7.ssi automatically stakes it to sMAG7.ssi for vault use. Credited immediately, no lock-up.
- **Withdrawals**:
  - sMAG7.ssi: instant, no lock-up.
  - MAG7.ssi: requires 14-day unstaking process. During this time, assets do not earn vault rewards.
- Depositing MAG7.ssi/sMAG7.ssi into the SLP Vault does not affect the earning of SSI rewards.

Source: SLP | https://sodex.com/documentation/vault-overview/sodex-liquidity-provider-slp | 2026-07-05
Source: sMAG7.ssi Vault | https://sodex.com/documentation/vault-overview/smag7.ssi-vault | 2026-07-05
Source: Dual Yield | https://sodex.com/documentation/vault-overview/dual-yield-mechanism | 2026-07-05
Source: Deposits & Withdrawals | https://sodex.com/documentation/vault-overview/deposits-and-withdrawals | 2026-07-05

---

## 18. SoPoints (Points / Airdrop Program)

SoPoints are SoDEX's exclusive metric for recording early contributions to the SoDEX ecosystem. They directly determine allocation weight in the future $SOSO token airdrop.

### 18.1 Season 1

- **Duration**: no more than 6 months.
- **Advance notice**: SoDEX will publish an official announcement at least 2 weeks before Season 1 ends.

### 18.2 How to earn SoPoints

1. **Trade** — generate trading volume on Spot and Perps.
2. **Invite** — successfully invite friends; earn an additional **25%** of the points they generate as a referral bonus.
3. **Vault Holdings** — provide liquidity or hold assets in selected vaults.

### 18.3 Dynamic Weighting Model

To maintain a fair and sybil-resistant environment, SoDEX uses a **Dynamic Weighting Model**. Instead of a fixed formula, the algorithm is fine-tuned **weekly** based on platform growth, market depth, and aggregate user behavior.

### 18.4 Anti-gaming

SoDEX maintains zero tolerance for wash trading or manipulative farming. The risk engine monitors for suspicious patterns and reserves the right to deduct or disqualify points from flagged accounts.

### 18.5 Snapshot & Distribution

- **Snapshot**: every Saturday at 00:00 UTC.
- **Distribution**: every Tuesday at 12:00 UTC.
- **Where to check**: Rewards dashboard.

### 18.6 Weekly Points Pool

Season 1 distributes a fixed **1,000,000 SoPoints per week**. As platform scales, "difficulty" of earning points may increase — early participants gain a meaningful advantage.

Source: SoPoints Overview | https://sodex.com/documentation/sopoints/overview | 2026-07-05
Source: SoPoints Season 1 | https://sodex.com/documentation/sopoints/season-1 | 2026-07-05

---

## 19. Stake $SOSO

### 19.1 Where to stake

SoDEX does **not** host $SOSO staking directly. It redirects to **SSI Earn**: https://ssi.sosovalue.com/earn

### 19.2 Stake flow

```
Deposit → Buy $SOSO (on SoDEX) → Redirect to SSI Earn
→ Connect wallet (must be the same as SoDEX)
→ Stake → Receive sSOSO (receipt token)
→ Unstake → 14-day cooldown → Claim/Redeem → $SOSO credited to EVM-Funding
```

### 19.3 FAQ

| Q | A |
|---|---|
| Can I stake $SOSO directly on SoDEX? | Currently not supported. Redirect to SSI Earn. |
| Can I trade $sSOSO on SoDEX? | No. sSOSO is a staking receipt. If transferred away, you cannot redeem the corresponding $SOSO. sSOSO is NOT tradable on SoDEX. |
| What happens after staking? | $SOSO deposited into staking contract; you receive sSOSO as receipt. |
| What can I get from staking $SOSO? | Staking does NOT pay direct yield. It only provides a multiplier boost to your current SSI Points. |
| How does SSI Points distribute? | Automatically every day. View at https://ssi.sosovalue.com/reward |
| Unstaking period? | 14-day cooldown. After cooldown, manually claim to receive $SOSO into EVM-Funding. |
| What if my $sSOSO is transferred away? | You cannot redeem the corresponding $SOSO (redemption requires holding sSOSO). |
| Fees? | Small on-chain gas fee, typically < 0.001 SOSO. |

### 19.4 Future plans (directional, may change)

- Additional rewards and incentives beyond SSI Points.
- Ecosystem participation: ValueChain-related roles (e.g., node participation).
- Trading benefits on SoDEX: fee reductions / trading perks for eligible stakers.
- Governance / community voting rights tied to staking.

Source: How to Stake/Withdraw | https://sodex.com/documentation/stake-usdsoso/how-to-stake-withdraw | 2026-07-05
Source: Stake FAQ | https://sodex.com/documentation/stake-usdsoso/faq | 2026-07-05
Source: Future Plans | https://sodex.com/documentation/stake-usdsoso/future-plans | 2026-07-05

---

## 20. User Guides

### 20.1 Onboarding

1. Connect wallet or log in with email.
2. Accept Terms of Use / Privacy Policy / Cookie Policy.
3. Click **Enable Trading** — sign a gas-less EIP-712 signature (registers your on-chain account).
4. Deposit (USDC over Ethereum/Base, BTC over Bitcoin, ETH over Ethereum/Base, SOL over Solana, etc.).

### 20.2 Log in with Email

Click "Connect Wallet" → "Log in with Email" → enter email → 6-digit code → connected. A new blockchain address is created for your email; you can deposit USDC over Ethereum/Base, BTC over Bitcoin, ETH over Ethereum/Base, SOL over Solana.

### 20.3 Log in with Wallet

Connect wallet → Accept terms → "Enable Trading" (gas-less signature) → Deposit.

### 20.4 Deposit (connected wallet)

For MAG7.ssi / sMAG7.ssi / SOSO: click "Deposit", confirm in wallet. Requires assets on Base Mainnet + ETH for gas.

### 20.5 Deposit (external wallet)

All assets except MAG7.ssi / sMAG7.ssi can be deposited from native chains. Click "Deposit" → select token + chain → read notice → click confirm → receive deposit address (~20 seconds if first time). Transfer funds. Funds minted as ValueChain equivalent tokens and deposited to Spot account within ~2 minutes.

Example: deposit 1 BTC → Mirror Protocol mints 1 vBTC → deposited to your Spot Account.

### 20.6 Spot trading

"Trade" → choose pair (e.g. BTC/USDC) → "Spot" → "Buy" → choose Limit or Market → input Price (Limit only) and Amount → "Buy". By default, funds come from Spot Account; transfer from other accounts if needed.

### 20.7 Futures trading

"Futures" → choose contract (e.g. BTC-USD) → "Buy/Long" or "Sell/Short" → adjust leverage → choose Limit or Market → input Price (Limit only) and Amount → "Buy" or "Sell".

### 20.8 Testnet onboarding

1. Connect to whitelist wallet.
2. Accept Terms.
3. Claim test tokens.
4. Go to "Trade" → "Add" to add ValueChain to wallet.
5. Transfer test tokens from EVM-Funding to Spot.
6. Confirm transfer + approve in wallet.
7. Enable Gas-Free Trading.
8. Place first Market or Limit order.
9. Trade more, complete tasks, report bugs → earn points.

### 20.9 FAQ

| Issue | Fix |
|---|---|
| How to add ValueChain to MetaMask | Network Name: ValueChain; RPC URL: https://mainnet.valuechain.xyz; Chain ID: 286623; Currency Symbol: SOSO; Block Explorer: https://main-scan.valuechain.xyz |
| How to get ETH on Base/Ethereum for gas | Use Uniswap to bridge, or withdraw from CEX to Base/Ethereum address. |
| How to get USDC on Base/Ethereum | Use Uniswap, or withdraw from CEX, or convert other coins via CEX "Convert" feature. |
| Wallet doesn't receive signature request (WalletConnect) | Reconnect wallet; check WalletConnect session; try a different wallet. |
| Deposit/Withdrawal fails | Check network/asset match, KYT/KYA flag, minimum threshold, gas balance. |
| Balance shows 0 when I have MAG7.ssi | Switch wallet network to Base; refresh; check deposit configuration. |

Source: Onboarding Guidance | https://sodex.com/documentation/user-guide/onboarding-guidance | 2026-07-05
Source: Log in with Email | https://sodex.com/documentation/user-guide/onboarding-guidance/log-in-with-email | 2026-07-05
Source: Log in with Wallet | https://sodex.com/documentation/user-guide/onboarding-guidance/log-in-with-wallet | 2026-07-05
Source: Spot Trading | https://sodex.com/documentation/user-guide/onboarding-guidance/spot-trading | 2026-07-05
Source: Futures Trading | https://sodex.com/documentation/user-guide/onboarding-guidance/futures-trading | 2026-07-05
Source: Deposit and Withdrawal Guidance | https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance | 2026-07-05
Source: Deposit from connected wallet | https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-from-connected-wallet | 2026-07-05
Source: Deposit from external wallet | https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-from-external-wallet | 2026-07-05
Source: Deposit and Withdrawal Configuration | https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-and-withdrawal-configuration | 2026-07-05
Source: Testnet Onboarding Steps | https://sodex.com/documentation/resources/testnet-onboarding-steps | 2026-07-05
Source: How to add ValueChain | https://sodex.com/documentation/user-guide/faq/how-do-i-add-the-valuechain-network | 2026-07-05
Source: How to get USDC | https://sodex.com/documentation/user-guide/faq/how-to-get-usdc-on-base-ethereum-mainnet | 2026-07-05
Source: How to get ETH for gas | https://sodex.com/documentation/user-guide/faq/how-to-get-eth-on-base-ethereum-mainnet-to-cover-gas-fees | 2026-07-05
Source: WalletConnect signature issue | https://sodex.com/documentation/user-guide/faq/what-if-my-wallet-doesnt-receive-the-signature-request-especially-for-walletconnect-users | 2026-07-05
Source: Deposit/withdrawal failure | https://sodex.com/documentation/user-guide/faq/what-should-i-do-if-my-deposit-or-withdrawal-fails | 2026-07-05
Source: Balance shows 0 with MAG7.ssi | https://sodex.com/documentation/user-guide/faq/why-does-my-balance-show-0-when-i-have-mag7.ssi.html | 2026-07-05

---

## 21. Common Pitfalls & Known Issues

### 21.1 Putting API key address in `X-API-Key`

**Symptom**: 401 Invalid API Key.
**Cause**: `X-API-Key` carries the **name** of the key, not the public address.
**Fix**: pass the name string (e.g. `api-key-01`), not `0x3d45...`.

### 21.2 Signing trading actions with master wallet

**Symptom**: signature rejected.
**Cause**: trading actions must be signed by an API key's private key, not the master wallet.
**Fix**: register an API key via `addAPIKey` (signed by master), then use that API key's private key for all trading.

### 21.3 Forgetting the `0x01` prefix

**Symptom**: signature rejected.
**Cause**: server rejects un-typed raw 65-byte signatures.
**Fix**: prepend byte `0x01` to the 65-byte EIP-712 signature.

### 21.4 Wrong JSON key order

**Symptom**: signature verification fails intermittently.
**Cause**: server re-marshals via Go `json.Marshal` (struct field order). If your JSON keys are in a different order, the hash differs.
**Fix**: mirror the Go SDK struct order exactly. For `PerpsOrderItem`: `clOrdID, modifier, side, type, timeInForce, price, quantity, funds, stopPrice, stopType, triggerType, reduceOnly, positionSide`.

### 21.5 Number vs string for DecimalString fields

**Symptom**: signature verification fails.
**Cause**: `price`, `quantity`, `funds`, `stopPrice` must be JSON **strings**, not numbers.
**Fix**: `"quantity":"0.001"` not `"quantity":0.001`.

### 21.6 Nonce collision

**Symptom**: `nonce already used` error.
**Cause**: two concurrent processes sharing an API key race on the nonce.
**Fix**: one API key per trading process. Use an atomic counter for nonce generation.

### 21.7 Nonce out of window

**Symptom**: `nonce out of window` error.
**Cause**: nonce must be within `(T - 2 days, T + 1 day)`.
**Fix**: use current Unix-ms timestamp; if your clock is skewed, sync via NTP.

### 21.8 WalletConnect signature not received

**Symptom**: wallet doesn't prompt to sign.
**Cause**: WalletConnect session issue.
**Fix**: reconnect wallet; try a different wallet; check WalletConnect session.

### 21.9 Balance shows 0 with MAG7.ssi

**Symptom**: user has MAG7.ssi but balance shows 0.
**Cause**: wallet network is not Base.
**Fix**: switch wallet network to Base Mainnet; refresh the page.

### 21.10 Deposit below minimum threshold

**Symptom**: funds permanently lost.
**Cause**: each token has a minimum deposit requirement.
**Fix**: consult the deposit configuration page before sending.

### 21.11 Wrong-network deposit

**Symptom**: funds permanently lost.
**Cause**: sending tokens from an unsupported network or non-matching token.
**Fix**: double-check network + token match before sending.

### 21.12 KYT-flagged deposit auto-returned

**Symptom**: deposit appears, then disappears.
**Cause**: KYT screening identified tainted funds; auto-returned to source.
**Fix**: ensure source funds are clean; contact support if false positive.

### 21.13 Perps kline interval not supported

**Symptom**: 400 Invalid parameter value when calling perps klines with `3m`, `2h`, `6h`, `8h`, `12h`, or `3d`.
**Cause**: perps engine supports a smaller set than spot.
**Fix**: use `1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M` only.

### 21.14 Spot kline limit higher than perps

**Symptom**: 400 when calling perps klines with `limit=1500`.
**Cause**: spot max is 1500; perps max is 1000.
**Fix**: use `limit ≤ 1000` for perps.

### 21.15 Address-based rate limit throttle

**Symptom**: orders rejected with `address rate limited`.
**Cause**: 1 request per 1 USDC traded cumulatively; initial buffer 10,000 requests.
**Fix**: trade more to increase your allowance; when throttled, 1 request per 10 seconds is allowed.

### 21.16 Funding payment surprise at hour boundary

**Symptom**: opening a position at 07:59:59 UTC incurs funding fee.
**Cause**: settlement latency up to 1 minute; positions open at the funding time pay.
**Fix**: avoid opening positions within ±60 seconds of the top of the hour.

### 21.17 Liquidation earlier than displayed price

**Symptom**: position liquidated before last traded price reached displayed liquidation price.
**Cause**: SoDEX uses **mark price**, not last traded price, for liquidation checks.
**Fix**: monitor mark price, not last traded price; especially during fast / thin markets.

### 21.18 Multi-asset collateral deposit rejected at $500k cap

**Symptom**: deposit of BTC rejected even though you have headroom in USDC.
**Cause**: total non-USDC collateral cap is $500,000 (after collateral ratios), checked at deposit.
**Fix**: wait for existing collateral value to drop (via price movement or withdrawal), or split deposit across multiple accounts (not recommended — ToS).

### 21.19 SOSO multi-asset collateral sub-cap

**Symptom**: SOSO deposit rejected at 30,000 SOSO or 10,000 USDC worth.
**Cause**: SOSO has its own sub-cap: `min(30,000 SOSO, 10,000 USDC worth)`.
**Fix**: do not stake more than the cap; the cap is checked at deposit, not after.

### 21.20 Cannot withdraw unrealized profit

**Symptom**: withdrawal rejected despite showing positive account value.
**Cause**: withdrawal check counts unrealized losses but NOT unrealized profits.
**Fix**: close the position first to realize the profit, then withdraw.

### 21.21 Unstaking SOSO mid-epoch drops fee discount instantly

**Symptom**: fee discount drops the moment you initiate partial unstake, even though SOSO is locked for 14 more days.
**Cause**: discount is recalculated based on **remaining** staked SOSO, not locked SOSO.
**Fix**: plan unstaking around your trading volume cycle.

Source: (all referenced inline above) | 2026-07-05

---

## 22. Code Examples

### 22.1 Public market-data fetch (no auth)

```bash
# Get all spot symbols
curl -X GET https://mainnet-gw.sodex.dev/api/v1/spot/markets/symbols \
  -H 'Accept: application/json'

# Get BTC-USD perps order book (depth 100)
curl -X GET https://mainnet-gw.sodex.dev/api/v1/perps/markets/BTC-USD/orderbook?limit=100 \
  -H 'Accept: application/json'

# Get BTC-USD perps 1h klines (last 500)
curl -X GET 'https://mainnet-gw.sodex.dev/api/v1/perps/markets/BTC-USD/klines?interval=1h&limit=500' \
  -H 'Accept: application/json'

# Get mark prices for all perps
curl -X GET https://mainnet-gw.sodex.dev/api/v1/perps/markets/mark-prices \
  -H 'Accept: application/json'
```

### 22.2 Python: minimal EIP-712 signer for SoDEX

```python
"""
Minimal Python signer for SoDEX trading API.
API version: v1 (as of 2026-07-05)
Requires: eth-account, requests (pip install eth-account requests)
"""
import json
import time
import requests
from eth_account import Account
from eth_account.messages import encode_typed_data
from web3 import Web3

PERPS_ENDPOINT = "https://mainnet-gw.sodex.dev/api/v1/perps"
SPOT_ENDPOINT  = "https://mainnet-gw.sodex.dev/api/v1/spot"
CHAIN_ID_MAINNET = 286623
CHAIN_ID_TESTNET = 138565

class SoDEXSigner:
    def __init__(self, api_key_name: str, api_key_privkey: str,
                 chain_id: int = CHAIN_ID_MAINNET):
        self.api_key_name = api_key_name
        self.account = Account.from_key(api_key_privkey)
        self.chain_id = chain_id

    def _payload_hash(self, action_type: str, params: dict) -> str:
        # CRITICAL: keys must be in Go SDK struct order. The caller is responsible
        # for ordering `params` correctly. We use compact JSON via separators.
        payload = {"type": action_type, "params": params}
        body = json.dumps(payload, separators=(",", ":"))
        return Web3.keccak(body.encode()).hex()

    def sign(self, action_type: str, params: dict, nonce: int) -> str:
        payload_hash = self._payload_hash(action_type, params)
        typed_data = {
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "ExchangeAction": [
                    {"name": "payloadHash", "type": "bytes32"},
                    {"name": "nonce", "type": "uint64"},
                ],
            },
            "primaryType": "ExchangeAction",
            "domain": {
                "name": "futures",  # use "spot" for spot actions
                "chainId": self.chain_id,
                "verifyingContract": "0x0000000000000000000000000000000000000000",
            },
            "message": {
                "payloadHash": payload_hash,
                "nonce": nonce,
            },
        }
        msg = encode_typed_data(full_message=typed_data)
        sig = Account.sign_message(msg, self.account.key).signature.encode().hex()
        # Prepend 0x01 type prefix
        return "0x01" + sig

    def post(self, path: str, action_type: str, params: dict,
             user_address: str) -> dict:
        nonce = int(time.time() * 1000)
        sig = self.sign(action_type, params, nonce)
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-API-Key": self.api_key_name,
            "X-API-Sign": sig,
            "X-API-Nonce": str(nonce),
        }
        # HTTP body = just the params object (no type wrapper), same field order/types
        body = json.dumps(params, separators=(",", ":"))
        r = requests.post(
            f"{PERPS_ENDPOINT}/accounts/{user_address}/{path}",
            data=body, headers=headers, timeout=15
        )
        r.raise_for_status()
        return r.json()

# Usage: place a perps market buy
if __name__ == "__main__":
    s = SoDEXSigner(
        api_key_name="api-key-01",
        api_key_privkey="0x" + "ab" * 32,  # replace with your API key's private key
    )
    user_addr = "0xYOUR_EVM_ADDRESS"
    order = {
        # CRITICAL: this field order MUST match PerpsOrderItem struct
        "clOrdID": "my-order-001",
        "modifier": 0,           # 0 = new
        "side": 1,               # 1 = BUY, 2 = SELL
        "type": 2,               # 1 = LIMIT, 2 = MARKET
        "timeInForce": 1,        # 1 = GTC
        "price": "0",            # DecimalString; "0" for market
        "quantity": "0.001",     # DecimalString
        "funds": "0",            # DecimalString
        "stopPrice": "0",        # DecimalString
        "stopType": 0,
        "triggerType": 0,
        "reduceOnly": False,
        "positionSide": 1,       # 1 = long side
    }
    body = {"orders": [order]}
    print(s.post("orders", "newOrder", body, user_addr))
```

### 22.3 TypeScript: WebSocket client

```typescript
// sodex-ws.ts
// No dependencies. Node 18+.

const WS = "wss://mainnet-gw.sodex.dev/ws/perps";

interface SubRequest {
  op: "subscribe" | "unsubscribe";
  id: number | null;
  params: Record<string, unknown>;
}

class SoDexWS {
  private ws: WebSocket;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.ws = new WebSocket(WS);
    this.ws.onopen = () => console.log("connected");
    this.ws.onmessage = (ev) => this.onMessage(ev.data);
    this.ws.onclose = () => console.log("disconnected");
  }

  private onMessage(data: string) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.ws.send(JSON.stringify({ op: "ping" }));
    }, 45_000); // N < 60s

    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg.op === "pong") return;
    console.log(JSON.stringify(msg, null, 2));
  }

  subscribe(params: Record<string, unknown>) {
    const req: SubRequest = { op: "subscribe", id: Date.now(), params };
    this.ws.send(JSON.stringify(req));
  }

  unsubscribe(params: Record<string, unknown>) {
    const req: SubRequest = { op: "unsubscribe", id: Date.now(), params };
    this.ws.send(JSON.stringify(req));
  }
}

const client = new SoDexWS();
// Subscribe to BTC-USD trades (params shape depends on stream — see Schema)
setTimeout(() => client.subscribe({ type: "trades", symbol: "BTC-USD" }), 1000);
```

### 22.4 Environment variables

```bash
# SoDEX
SODEX_SPOT_REST=https://mainnet-gw.sodex.dev/api/v1/spot
SODEX_PERPS_REST=https://mainnet-gw.sodex.dev/api/v1/perps
SODEX_SPOT_WS=wss://mainnet-gw.sodex.dev/ws/spot
SODEX_PERPS_WS=wss://mainnet-gw.sodex.dev/ws/perps

# Testnet
SODEX_SPOT_REST_TEST=https://testnet-gw.sodex.dev/api/v1/spot
SODEX_PERPS_REST_TEST=https://testnet-gw.sodex.dev/api/v1/perps
SODEX_SPOT_WS_TEST=wss://testnet-gw.sodex.dev/ws/spot
SODEX_PERPS_WS_TEST=wss://testnet-gw.sodex.dev/ws/perps

# ValueChain EVM
VALUECHAIN_RPC=https://mainnet.valuechain.xyz
VALUECHAIN_WS=wss://mainnet-ws.valuechain.xyz
VALUECHAIN_CHAIN_ID=286623
VALUECHAIN_EXPLORER=https://main-scan.valuechain.xyz
WSOSO_CONTRACT=0x5050505050505050505050505050505050505050

# Auth
SODEX_MASTER_PRIVKEY=0x...  # KEEP OFFLINE; only for addAPIKey/revokeAPIKey
SODEX_API_KEY_NAME=api-key-01
SODEX_API_KEY_PRIVKEY=0x...  # used for day-to-day trading

# SoSoValue data API (see 01_SOSOVALUE_MASTER_REFERENCE.md)
SOSO_API_KEY=...
```

### 22.5 Get your account ID (REST)

```bash
curl -X GET "https://mainnet-gw.sodex.dev/api/v1/perps/accounts/0xYOUR_ADDRESS/state" \
  -H 'Accept: application/json'
# Response: { "code": 0, "data": { ..., "aid": 12345, ... } }
# `aid` is your account ID. Use ?accountID=<id> to query a specific sub-account.
```

---

## 23. Hackathon Angles

### 23.1 Highest-leverage ideas

| # | Idea | Stack |
|---|---|---|
| 1 | **AI Trading Agent on SoDEX** — LLM reads news from SoSoValue API, decides long/short, places orders via SoDEX Perps REST. | SoSoValue Feeds + SoDEX Perps REST + LLM |
| 2 | **Cross-pillar DCA bot** — DCA into MAG7.ssi via SoDEX spot, deposit into sMAG7.ssi Vault for dual yield. | SoDEX Spot REST + Vault contracts + ValueChain EVM |
| 3 | **Funding-rate arbitrage bot** — monitor SoDEX funding rate vs other perps DEXes; arbitrage when SoDEX funding > 4% annualized premium. | SoDEX WS (mark price stream) + external DEX APIs |
| 4 | **Liquidation dashboard** — real-time liquidation feed via WS Account Events stream; overlay with mark price action. | SoDEX WS + chart library |
| 5 | **Multi-asset margin optimizer** — given a target portfolio, compute optimal mix of USDC / BTC / ETH / SOSO collateral to maximize margin without hitting $500k cap. | SoDEX Multi-Asset Margin + optimization solver |
| 6 | **RWA perps arbitrage** — SoDEX lists USTECH100, US500, SILVER, CL, COPPER perps. Arbitrage vs TradFi futures during extended hours. | SoDEX Perps + TradFi data feed |
| 7 | **Order-book imbalance signal** — stream L2 Book via WS; compute bid/ask imbalance; alert when imbalance > threshold. | SoDEX WS (L2 Book) + signal processing |
| 8 | **Tokenized-stock perps dashboard** — display all tokenized stock perps (AAPL, NVDA, TSLA, MSTR, etc.) with mark price vs underlying spot. | SoDEX Perps REST + TradFi data |
| 9 | **Vault APY tracker** — track SLP / sMAG7.ssi Vault APY over time. | SoDEX Vault contracts + ValueChain EVM |
| 10 | **SoPoints leaderboard** — community tool to track SoPoints rankings. | SoDEX Perks API (if exposed) + web frontend |

### 23.2 Best architecture for an AI trading agent

1. **Perception layer**: poll SoSoValue `/news/hot` every 30s; subscribe to SoDEX `markPrice` WS stream.
2. **Memory layer**: SQLite/DuckDB storing news events + mark price history.
3. **Reasoning layer**: LLM with function-calling. Define SoDEX `placeOrder`, `cancelOrder`, `updateLeverage` as tools.
4. **Action layer**: dedicated API key per agent instance; nonce from atomic counter.
5. **Safety layer**: hard cap on position size; auto-cancel on disconnect (`scheduleCancel` action).

### 23.3 Best architecture for a market-making bot

1. Subscribe to `bookTicker` and `l2book` streams for your target symbol.
2. Maintain local order-book mirror.
3. Compute fair price + spread; place bids and asks at ±N ticks.
4. Use `replace` (PUT) for atomic order modifications.
5. Track inventory; hedge on a correlated asset when inventory exceeds threshold.
6. Use isolated margin per position to cap risk.
7. Stake ≥30,000 SOSO for 20% fee discount (critical for MM economics).

### 23.4 What judges reward

- Working live demo with real mainnet funds (small size).
- Use of both SoSoValue data API AND SoDEX trading API in one product.
- Use of ValueChain EVM (deploy a contract, not just call APIs).
- Originality: avoid generic "DEX frontend" or "portfolio tracker".
- Production safety: nonce management, rate-limit handling, error retries.

---

## 24. Open Questions / Gaps

1. **No official TypeScript SDK** — only Go SDK exists. TS developers must implement EIP-712 signing themselves.
2. **No published audit reports** — "available upon request" only.
3. **`updateCollateral` is testnet only** — when will it reach mainnet?
4. **No public block explorer for the Spot / Perps appchains** — only the EVM syschain has `main-scan.valuechain.xyz`. The appchains' internal state (orders, positions) is not directly browsable.
5. **Schema page is large** — many types (SpotSymbol, PerpsSymbol, OrderBook, RPCKline, Trade, BookTicker, MarkPriceTicker, etc.) are referenced but the schema page was not fully extracted in this research pass. Always cross-reference https://sodex.com/documentation/trading-api/rest-v1/schema before implementing.
6. **WebSocket subscription params** — exact shape of `WsUserEventSubscriptionParams`, `WsOrderUpdateSubscriptionParams`, etc. is defined in the Schema page. The individual stream pages reference but do not inline the type definitions.
7. **Testnet whitelisting** — how does one get whitelisted? Docs say "Connect to the whitelist wallet you submitted" but don't show the submission form.
8. **Funding-legacy page** — the legacy funding formula differs from the current one (Impact Margin Notional vs Impact Notional, time-weighted vs simple average). When was the cutover? The legacy page is still published; no deprecation date is shown.
9. **`sosovalue-tech/sodex-go-sdk-public`** — the SDK GitHub URL is referenced as `https://github.com/sosovalue-tech/sodex-go-sdk-public` (note: `sosovalue-tech`, not `SoSoValueLabs`). This org may be private; clone before assuming access.
10. **`MeoMunDep/SoSoValue` GitHub Actions** — third-party repo with SoDEX automation workflows; unclear if officially endorsed.
11. **Address-based rate limit formula** — "1 request per 1 USDC traded" with a 10,000-request initial buffer. The exact formula for cancels' higher limit (`limit` referenced but not defined) is not documented.
12. **Maker Rebate tiers** — only 3 tiers documented. Are there higher tiers for >5% maker volume share?
13. **SoPoints formula** — "Dynamic Weighting Model" tuned weekly; no public formula.
14. **$SOSO token utility on SoDEX** — beyond fee discount and multi-asset collateral, are there other planned utilities?

---

## 25. Source Index

### SoDEX documentation (sodex.com/documentation)

- https://sodex.com/documentation
- https://sodex.com/documentation/about-sodex/from-demand-to-application-why-we-build-sodex
- https://sodex.com/documentation/about-sodex/from-vision-to-reality-building-the-infrastructure-for-a-new-financial-era
- https://sodex.com/documentation/about-sodex/how-sodex-works
- https://sodex.com/documentation/about-valuechain/why-we-built-valuechain
- https://sodex.com/documentation/about-valuechain/how-valuechain-works
- https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-d2app
- https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-valuechain-evm
- https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-wsoso
- https://sodex.com/documentation/about-valuechain/how-valuechain-works/json-rpc
- https://sodex.com/documentation/custody-and-security/audits
- https://sodex.com/documentation/custody-and-security/backing-asset-custody
- https://sodex.com/documentation/trading-api/trading-api
- https://sodex.com/documentation/trading-api/rest-v1
- https://sodex.com/documentation/trading-api/rest-v1/schema
- https://sodex.com/documentation/trading-api/rest-v1/sodex-rest-spot-api
- https://sodex.com/documentation/trading-api/rest-v1/sodex-rest-perps-api
- https://sodex.com/documentation/trading-api/websocket-v1
- https://sodex.com/documentation/trading-api/websocket-v1/account-events
- https://sodex.com/documentation/trading-api/websocket-v1/account-order-updates
- https://sodex.com/documentation/trading-api/websocket-v1/account-trades
- https://sodex.com/documentation/trading-api/websocket-v1/account-updates
- https://sodex.com/documentation/trading-api/websocket-v1/account-frontend-state
- https://sodex.com/documentation/trading-api/websocket-v1/all-book-tickers
- https://sodex.com/documentation/trading-api/websocket-v1/all-mark-prices
- https://sodex.com/documentation/trading-api/websocket-v1/all-mini-tickers
- https://sodex.com/documentation/trading-api/websocket-v1/all-tickers
- https://sodex.com/documentation/trading-api/websocket-v1/book-ticker
- https://sodex.com/documentation/trading-api/websocket-v1/candles
- https://sodex.com/documentation/trading-api/websocket-v1/l2book
- https://sodex.com/documentation/trading-api/websocket-v1/l4book
- https://sodex.com/documentation/trading-api/websocket-v1/mark-price
- https://sodex.com/documentation/trading-api/websocket-v1/market-trade
- https://sodex.com/documentation/trading-api/websocket-v1/mini-ticker
- https://sodex.com/documentation/trading-api/websocket-v1/ticker
- https://sodex.com/documentation/trading-api/go-sdk-signing-guide
- https://sodex.com/documentation/trading-api/api-rate-limits
- https://sodex.com/documentation/trading-mechanics/orderbook
- https://sodex.com/documentation/trading-mechanics/orders-types
- https://sodex.com/documentation/trading-mechanics/order-type
- https://sodex.com/documentation/trading-mechanics/fees
- https://sodex.com/documentation/trading-mechanics/trading-fees
- https://sodex.com/documentation/trading-mechanics/futures-trading
- https://sodex.com/documentation/trading-mechanics/spot-trading
- https://sodex.com/documentation/trading-mechanics/funding
- https://sodex.com/documentation/trading-mechanics/funding-legacy
- https://sodex.com/documentation/trading-mechanics/liquidations
- https://sodex.com/documentation/trading-mechanics/liquidations-legacy
- https://sodex.com/documentation/trading-mechanics/margining
- https://sodex.com/documentation/trading-mechanics/margining-legacy
- https://sodex.com/documentation/trading-mechanics/margin-tiers
- https://sodex.com/documentation/trading-mechanics/multi-asset-margin
- https://sodex.com/documentation/trading-mechanics/entry-price-and-pnl
- https://sodex.com/documentation/trading-mechanics/index-price-and-mark-price
- https://sodex.com/documentation/trading-mechanics/contract-specifications
- https://sodex.com/documentation/trading-mechanics/auto-deleveraging
- https://sodex.com/documentation/trading-mechanics/take-profit-and-stop-loss-orders-tp-sl
- https://sodex.com/documentation/vault-overview/dual-yield-mechanism
- https://sodex.com/documentation/vault-overview/smag7.ssi-vault
- https://sodex.com/documentation/vault-overview/sodex-liquidity-provider-slp
- https://sodex.com/documentation/vault-overview/deposits-and-withdrawals
- https://sodex.com/documentation/sopoints/overview
- https://sodex.com/documentation/sopoints/season-1
- https://sodex.com/documentation/stake-usdsoso/faq
- https://sodex.com/documentation/stake-usdsoso/future-plans
- https://sodex.com/documentation/stake-usdsoso/how-to-stake-withdraw
- https://sodex.com/documentation/user-guide/onboarding-guidance
- https://sodex.com/documentation/user-guide/onboarding-guidance/log-in-with-email
- https://sodex.com/documentation/user-guide/onboarding-guidance/log-in-with-wallet
- https://sodex.com/documentation/user-guide/onboarding-guidance/spot-trading
- https://sodex.com/documentation/user-guide/onboarding-guidance/futures-trading
- https://sodex.com/documentation/user-guide/onboarding-guidance/link-mobile-device
- https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance
- https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-and-withdrawal-configuration
- https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-from-connected-wallet
- https://sodex.com/documentation/user-guide/deposit-and-withdrawal-guidance/deposit-from-external-wallet
- https://sodex.com/documentation/user-guide/faq
- https://sodex.com/documentation/user-guide/faq/how-do-i-add-the-valuechain-network
- https://sodex.com/documentation/user-guide/faq/how-to-get-eth-on-base-ethereum-mainnet-to-cover-gas-fees
- https://sodex.com/documentation/user-guide/faq/how-to-get-usdc-on-base-ethereum-mainnet
- https://sodex.com/documentation/user-guide/faq/what-if-my-wallet-doesnt-receive-the-signature-request-especially-for-walletconnect-users
- https://sodex.com/documentation/user-guide/faq/what-should-i-do-if-my-deposit-or-withdrawal-fails
- https://sodex.com/documentation/user-guide/faq/why-does-my-balance-show-0-when-i-have-mag7.ssi
- https://sodex.com/documentation/user-guide/vault-guidance
- https://sodex.com/documentation/resources/testnet-onboarding-steps
- https://sodex.com/documentation/resources/privacy-policy
- https://sodex.com/documentation/resources/terms-of-use

### SoDEX homepage + press

- https://sodex.com
- https://www.binance.com/en/square/post/35869624579810
- https://www.binance.com/en/square/post/35901944783642
- https://www.eqs-news.com/news/corporate/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token/65d8ce6c-526d-4242-8856-422e4d86dc17_en
- https://decrypt.co/346354/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token
- https://www.tradingview.com/news/eqs:c3d6c2968094b:0-sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token
- https://www.rootdata.com/projects/detail/SoDEX?k=MTkxOTA%3D
- https://www.rootdata.com/news/529885
- https://x.com/SoSoValueCrypto/status/2017935518206509445
- https://x.com/WuBlockchain/status/2017983782649782637
- https://m.sosovalue.com/sososcholar/post/1983348343236149249

### GitHub

- https://github.com/SoSoValueLabs
- https://github.com/SoSoValueLabs/ssi-protocol
- https://github.com/sosovalue-tech/sodex-go-sdk-public (referenced in docs; may be private)
- https://github.com/MeoMunDep/SoSoValue

### Audits

- https://blocksec.com/audit-report
- https://www.slowmist.com/service-blockchain-security-audit.html
- https://hacken.io/audits

### Companion resources

- https://m.sosovalue.com/announcement
- https://ssi.sosovalue.com/earn
- https://ssi.sosovalue.com/reward
- https://ssi.sosovalue.com/buy/MAG7.ssi
- https://ssi.sosovalue.com/buy/DEFI.ssi
- https://main-scan.valuechain.xyz
- https://test-scan.valuechain.xyz

---

*End of `02_SODEX_MASTER_REFERENCE.md`. Continue with `03_SSI_PROTOCOL_MASTER_REFERENCE.md` for the SSI Protocol contract-level deep dive.*
