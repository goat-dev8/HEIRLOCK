# 01 · SoSoValue Master Reference

> **Mission of this file**: To be the single most comprehensive, source-cited, implementation-ready reference for the SoSoValue consumer / investor-facing platform. It is intended to serve as the primary context window for Cursor AI when building hackathon-winning projects on top of the SoSoValue ecosystem.
>
> **Companion files**:
> - `02_SODEX_MASTER_REFERENCE.md` — SoDEX DEX + ValueChain L1 + Mirror Protocol + Vault
> - `03_SSI_PROTOCOL_MASTER_REFERENCE.md` — SSI on-chain spot index protocol + $SOSO tokenomics + Earn
>
> **Methodology**: Every technical statement is followed by a `Source / URL / Date` triple. Where the official docs are silent, the document explicitly says "INFERRED" and explains the reasoning. Gated or 404 pages are listed in §18.
>
> **Last compiled**: 2026-07-05 (UTC+8)

---

## Table of Contents

0. Meta
1. Executive Overview
2. Product Surface & Feature Matrix
3. Architecture & System Design
4. Data Ingestion & Index Logic
5. AI / LLM Stack
6. Public APIs & SDKs
7. Authentication & Authorization
8. Rate Limits, Pagination, Errors
9. REST API Reference (full)
10. WebSocket / Real-Time Feeds
11. GitHub Presence
12. Whitepaper Summary
13. Tokenomics ($SOSO)
14. Roadmap & Milestones
15. Team & Funding
16. Third-Party Coverage
17. Common Pitfalls & Known Issues
18. Code Examples
19. Hackathon Angles — "How to Win Using This Stack"
20. Open Questions / Gaps in Documentation
21. Source Index (deduplicated URLs)

---

## 0. Meta

| Field | Value |
|---|---|
| Target | SoSoValue platform (consumer research product) |
| Official site | https://sosovalue.com (web), https://m.sosovalue.com (mobile-web) |
| Developer portal | https://m.sosovalue.com/developer |
| API docs | https://sosovalue-1.gitbook.io/sosovalue-api-doc |
| Whitepaper | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper |
| Mobile apps | iOS App Store id `6739542818`; Google Play `com.sosovalue.app` |
| Twitter | https://x.com/SoSoValueCrypto |
| LinkedIn | https://sg.linkedin.com/company/sosovalue |
| Telegram | https://t.me/s/SoSoValueCryptoInvestment |
| Discord | (linked from announcement page; invite is gated) |
| Galaxy quest | https://app.galxe.com/quest/UvEGYeVt2aHcFFAJGg7kxx |
| Status | Live, production |
| Legal entity | SoSoValue Labs (Singapore) |
| Token | $SOSO (ERC-20 + native L1 gas on ValueChain) |
| Sources catalogued | 130+ unique URLs (see §21) |

---

## 1. Executive Overview

SoSoValue is an **AI-powered crypto investment research platform** that combines real-time market data, news, ETF flows, on-chain analytics, macro events, AI-generated summaries, and an investible index token (SSI) into a single consumer product. As of mid-2026 the platform reports **over 10 million registered users** and tracks **10,000+ cryptocurrencies** plus US/HK crypto ETFs, crypto-equities, BTC treasuries and macro events.

SoSoValue is the parent brand of an emerging three-pillar ecosystem:

1. **SoSoValue** (this doc) — the AI research & analytics layer.
2. **SoDEX** — a high-performance on-chain CLOB DEX (see `02_SODEX_MASTER_REFERENCE.md`).
3. **SSI Protocol** — an on-chain spot index tokenization protocol (see `03_SSI_PROTOCOL_MASTER_REFERENCE.md`).

These three are bound together by **ValueChain** — SoSoValue's own EVM-compatible Layer-1 — and by the **$SOSO** token, which serves as: ERC-20 governance/utility token on Ethereum and Base, the native gas token of ValueChain, the staking asset that boosts SSI rewards, the multi-asset collateral asset on SoDEX, and the fee-discount token on SoDEX.

The company raised a **$4.15M seed** in mid-2024 led by HongShan (ex-Sequoia China) and a **$15M Series A** in January 2025 co-led by HongShan and SmallSpark.ai, with participation from Mirana Ventures, Safepal, GSR Markets, and Alumni Ventures, at a reported **$200M valuation**. Development started in 2023; the consumer platform launched in 2024; the SSI Protocol launched in 2025; SoDEX mainnet launched on ValueChain in late 2025.

Source: SoSoValue homepage | https://m.sosovalue.com | 2026-07-05
Source: Whitepaper introduction | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper | 2026-07-05
Source: Fortune coverage | https://fortune.com/crypto/2025/01/08/crypto-data-platform-sosovalue-funding-multi-coin-indices | 2026-07-05
Source: GlobeNewswire Series A announcement | https://www.globenewswire.com/news-release/2025/01/08/3006098/0/en/ai-driven-crypto-research-platform-sosovalue-raises-15-million-series-a-to-launch-the-investible-spot-index-protocol-ssi.html | 2026-07-05
Source: The Block valuation confirmation | https://www.theblock.co/post/333620/sosovalue-funding-valuation | 2026-07-05
Source: EQS SoDEX mainnet announcement | https://www.eqs-news.com/news/corporate/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token/65d8ce6c-526d-4242-8856-422e4d86dc17_en | 2026-07-05

---

## 2. Product Surface & Feature Matrix

SoSoValue's product surface is large. Below is a comprehensive map of every page / module the official site exposes, with the underlying data source (when documented) and the corresponding REST API module (when one exists).

### 2.1 Web product modules

| Module | URL path | Purpose | Underlying API module |
|---|---|---|---|
| Homepage / Markets | `/` | Live top-N coins, sector heatmap, BTC ETF summary, Fear & Greed, SSI index prices | Currency, Index |
| Cryptocurrencies | `/coins` / `/coins/{symbol}` | Per-coin detail: price, marketcap, FDV, supply, klines, pairs, fundraising, token economics, news | Currency & Pairs |
| ETF | `/assets/etf/us-btc-spot`, `/us-eth-spot`, etc. | US & HK spot BTC/ETH ETF aggregate dashboard, per-ETF flows | ETF |
| SoSoValue Index (SSI) | `/assets/cryptoindex/ssi-index-management` | SSI token prices, constituents, NAV charts, mint/redeem (links to ssi.sosovalue.com) | SoSoValue Index |
| Crypto Stocks | `/sectors/rwa` and `/crypto-stocks` | Publicly-listed crypto-exposed equities (MSTR, TSLA, COIN, etc.), per-stock klines, sector indices | Crypto Stocks |
| BTC Treasuries | `/btc-treasuries` | Public companies holding BTC on balance sheet; per-company purchase history | BTC Treasuries |
| Feeds (News) | `/research` / `/research/research` / `/research/tweets` | Curated news, hot news, featured research, KOL tweets, search | Feeds |
| Fundraising | `/assets/fundraising` | Project fundraising rounds, investors, valuations | Fundraising |
| Macro | (under Markets) | Macroeconomic calendar, interest rates, M2 money supply | Macro |
| Analysis Charts | `/charts` | Long-form analytical charts with downloadable data | Analysis Charts |
| TokenBar / SoSoScholar | `/sososcholar` | Community research posts | (part of Feeds) |
| Watchlist | (signed-in) | Personalized watchlist of coins | (uses Currency module) |
| Portfolio | (signed-in) | Manual portfolio tracking | (no public API) |
| Announcements | `/announcement` | Platform announcements, listings, airdrop updates | (no API; HTML only) |
| Developer | `/developer` | API key dashboard, docs entrypoint | — |
| SoSoScholar Community Vote | `/scholarship-s1-community-vote` | Community-voted research scholarships | (no API) |

Source: Homepage HTML scrape | https://m.sosovalue.com | 2026-07-05
Source: Endpoint overview | https://sosovalue-1.gitbook.io/sosovalue-api-doc/endpoint-overview.md | 2026-07-05
Source: SoSoScholar example post | https://sosovalue.com/sososcholar/post/1959823181995114497 | 2026-07-05

### 2.2 Sectors taxonomy

SoSoValue categorises every tracked token into **sixteen sectors**: BTC, ETH, Layer 1, Stablecoin, Infrastructure (Infra), Centralized Exchanges (CEX), Decentralized Finance (DeFi), Layer 2, Meme, DePIN, Others, GameFi, AI, NFT, SocialFi, RWA. The platform continuously tracks market-cap share and 24h market-value change for each.

Source: Homepage HTML | https://m.sosovalue.com | 2026-07-05

### 2.3 "Spotlight" — curated concept baskets

In addition to the 16 sectors, SoSoValue tracks roughly 20 "spotlight" concept baskets at any time, including: PerpDEX, Privacy, BSC Ecosystem, Gold-Backed Token, Solana Ecosystem, Base Ecosystem, ETF Candidates, Tokenized Stocks, Grayscale 2025 Top20, Sui Ecosystem, AI Agents, DeFAI, Modular Blockchain, DeSci, LSDFi, LRTFi, Paradigm Portfolio, a16z Portfolio, Multicoin Portfolio, Delphi Portfolio, Pantera Portfolio, GLXY Portfolio. These are returned by `GET /currencies/sector-spotlight`.

Source: API docs §1.8 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/sector-spotlight.md | 2026-07-05

### 2.4 Mobile apps

SoSoValue ships native iOS and Android apps under the developer name "SoSoValue Labs".

| Platform | Store URL | Bundle ID |
|---|---|---|
| iOS | https://apps.apple.com/us/app/sosovalue-crypto-tracker/id6739542818 | `id6739542818` |
| Android | https://play.google.com/store/apps/details?id=com.sosovalue.app | `com.sosovalue.app` |

The apps mirror the web product: real-time prices, watchlists, news feed, AI summaries, SSI index prices, ETF flows, portfolio. They are free. WebCatalog also publishes a wrapped desktop app.

Source: App Store | https://apps.apple.com/us/app/sosovalue-crypto-tracker/id6739542818 | 2026-07-05
Source: Google Play | https://play.google.com/store/apps/details?id=com.sosovalue.app | 2026-07-05
Source: WebCatalog | https://webcatalog.io/en/apps/sosovalue | 2026-07-05

### 2.5 Browser / wallet integrations

- Bitget Telegram-apps directory listing: https://www.bitget.com/crypto-widgets/telegram-apps/sosovalue
- Bybit partnership publishes a "VIP exclusive daily industry report" co-branded with SoSoValue.

Source: Bybit partnership PR | https://www.prnewswire.com/apac/news-releases/the-vip-advantage-bybit-partners-with-sosovalue-to-issue-vip-exclusive-daily-industry-report-302424438.html | 2026-07-05

---

## 3. Architecture & System Design

### 3.1 Documented facts

The SoSoValue API documentation explicitly exposes only the **public data API**. It does not document the internal backend, AI stack, or storage layer. What is documented:

- **Base URL**: `https://openapi.sosovalue.com/openapi/v1`
- All endpoints are REST over HTTPS. No public WebSocket / GraphQL / RPC API is documented for the consumer research product. (SoDEX exposes its own WebSocket — see `02_SODEX_MASTER_REFERENCE.md`.)
- All monetary fields are USD-denominated by default.
- All timestamps are **UTC millisecond Unix timestamps** (e.g. `1710000000000`).
- All field names follow `snake_case`.
- Update frequencies per endpoint range from 30 seconds to "real-time" (see §8 below).

Source: API readme | https://sosovalue-1.gitbook.io/sosovalue-api-doc/readme.md | 2026-07-05
Source: Query modes | https://sosovalue-1.gitbook.io/sosovalue-api-doc/query-modes.md | 2026-07-05
Source: Endpoint overview | https://sosovalue-1.gitbook.io/sosovalue-api-doc/endpoint-overview.md | 2026-07-05

### 3.2 INFERRED architecture

Based on the public surface, response shapes, and behaviour, the platform most likely has the following internal architecture (none of this is officially documented; treat as best-effort OSINT):

- **Frontend**: Next.js (the SoDEX whitepaper at `sosovalue-white-paper.gitbook.io` redirects to `sodex.com` which is Next.js; the main `m.sosovalue.com` site exhibits Next.js `_next/static` asset paths and `__next_f` RSC payloads in raw HTML). Mobile apps are native (separate iOS/Android codebases), not React Native.
- **Backend**: Java or Go is plausible given the use of `Long` timestamps, `BigDecimal` in field types, and `json.Marshal` Go-struct-order signing in the sister SoDEX API. The error-code scheme (`400001`, `400101`, `500001`) is consistent with a Spring Boot or hand-rolled Go gateway.
- **Datastore**: A time-series database (likely ClickHouse or TimescaleDB) for klines; PostgreSQL or MySQL for entity metadata; Redis for the 30-second / 1-minute cache layers implied by the documented update frequencies.
- **Search**: A full-text search engine (Elasticsearch or OpenSearch) behind `/news/search`.
- **AI / LLM**: See §5.
- **CDN / static assets**: `static.sosovalue.com` (referenced in news `media_info` payloads as the image CDN).
- **News clustering**: The Feeds module exposes a `cluster ID` for "hot news", implying an internal clustering pipeline that groups Tweets / articles into themes.

Source (inference basis): Homepage raw HTML showing `__next_f` Next.js RSC payload | https://m.sosovalue.com | 2026-07-05
Source (inference basis): API response example with `static.sosovalue.com/media/example.jpg` | https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/news.md | 2026-07-05
Source (inference basis): SoDEX signing docs reference `json.Marshal` Go struct order | https://sodex.com/documentation/trading-api/trading-api | 2026-07-05

### 3.3 Authentication boundary

Authentication on the consumer platform is **wallet-or-email**: users can register either by connecting an EVM wallet or by entering an email and confirming a 6-digit code. The same auth is reused across SoDEX (with "Enable Trading" adding a gas-less EIP-712 signature that registers an on-chain account). The public data API does **not** require wallet auth — only an `x-soso-api-key` header.

Source: Homepage (registration CTA) | https://m.sosovalue.com | 2026-07-05
Source: SoDEX login-with-email docs | https://sodex.com/documentation/user-guide/onboarding-guidance/log-in-with-email | 2026-07-05

---

## 4. Data Ingestion & Index Logic

The public API exposes the *outputs* of SoSoValue's data pipeline; the pipeline itself is not documented. What can be reconstructed from response shapes and field names:

### 4.1 Currency data

- `/currencies` returns a flat list of `{currency_id, symbol, name}`.
- `/currencies/{id}` returns rich metadata: sectors, contract addresses per chain, whitepaper URL, first-issue time, explorers (Etherscan, Arkham, Ethplorer), community links (Twitter, Reddit), and `significant_events` timeline.
- `/currencies/{id}/market-snapshot` returns price, 24h change, 24h volume, turnover rate, high/low, marketcap, FDV, max/total/circulating supply, ATH, cycle-low, marketcap rank.
- `/currencies/{id}/pairs` returns per-exchange trading pairs with **+2%/-2% depth** (`cost_to_move_up_usd` / `cost_to_move_down_usd`) — a market-impact metric SoSoValue computes from order-book snapshots.

Source: API docs §1.1–1.7 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/ | 2026-07-05

### 4.2 ETF data

SoSoValue aggregates US (and Hong Kong) crypto ETF data across multiple issuers (BlackRock IBIT, Fidelity FBTC, etc.). The `/etfs/summary-history` endpoint returns aggregate daily net inflow, value traded, net assets, and cumulative net inflow across all ETFs for a given underlying symbol (BTC, ETH, SOL, LTC, HBAR, XRP, DOGE, LINK, AVAX, DOT) and country code (US, HK). Per-ETF data is available via `/etfs/{ticker}/history` and `/etfs/{ticker}/market-snapshot`.

Constraints:
- ETF history is **limited to the most recent 1 month** via the public API.
- Non-trading days (weekends, holidays) are excluded.
- Data is sorted reverse-chronologically (latest first).

Source: API docs §2.1 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/summary-history.md | 2026-07-05

### 4.3 SoSoValue Index data

The `/indices` module exposes SoSoValue's proprietary indices — both investible SSI tokens (MAG7.ssi, DEFI.ssi, MEME.ssi, USSI) and indicative indices (ssiLayer1, etc.). Endpoints:
- `GET /indices` → bare array of ticker strings (e.g. `["ssimag7", "ssilayer1"]`).
- `GET /indices/{ticker}/constituents` → array of `{currency_id, symbol, weight}`.
- `GET /indices/{ticker}/market-snapshot` → price, 24h change, 7d / 1m / 3m / 1y / YTD ROI.
- `GET /indices/{ticker}/klines` → daily OHLCV (only `1d` interval, only most recent 3 months).

Source: API docs §3 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/ | 2026-07-05

### 4.4 Crypto Stocks

Public companies with crypto exposure (MSTR, TSLA, COIN, etc.). Endpoints expose per-stock market-snapshot, historical market-cap, daily klines, and a sector classification system with sector-index history.

Source: API docs §4 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/4.-crypto-stocks/ | 2026-07-05

### 4.5 BTC Treasuries

Public companies holding BTC on balance sheet (MicroStrategy, Tesla, Marathon, etc.). The `/btc-treasuries/{ticker}/purchase-history` endpoint returns `{date, ticker, btc_holding, btc_acq, acq_cost, avg_btc_cost}` per purchase event.

Source: API docs §5 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/5.-btc-treasuries/ | 2026-07-05

### 4.6 News Feeds

This is the most operationally complex module. The pipeline:
1. Ingests tweets (X), articles, and research posts.
2. Tags each item with `matched_currencies` (array of `{id, full_name, name}`) and `tags` (free-form string array, e.g. `["ETF", "DO KWON", "TERRAFORM LABS", "SEC"]`).
3. Categorises into an integer enum: `1` news, `2` research, `3` institution, `4` insights/KOL, `7` announcement/official, `13` crypto stock news.
4. Clusters related items into "hot news" clusters (each with a numeric `id`).
5. Surfaces editorially-curated "featured news" with author metadata, blue-verification status, media attachments, and quote-tweet metadata.
6. Provides full-text search via `/news/search?keyword=...&sort=relevance|time`.

Time-series constraint: `start_time`/`end_time` filters on news only support the **most recent 7 days**.

Source: API docs §6 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/ | 2026-07-05

### 4.7 Fundraising

Project fundraising data: rounds, amounts, valuations, lead investors, all investors, team, investment stats, portfolio. The `/fundraising/projects/{project_id}` endpoint returns a rich object that is the source of the SoSoValue "Fundraising" page.

Source: API docs §7 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/7.-fundraising/ | 2026-07-05

### 4.8 Macro

Macroeconomic events calendar (FOMC, CPI, etc.) with historical data per event.

Source: API docs §8 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/8.-macro/ | 2026-07-05

### 4.9 Analysis Charts

Long-form analytical charts with downloadable data. `GET /analyses` lists charts; `GET /analyses/{chart_name}` returns the chart's data.

Source: API docs §9 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/9.-analysis-charts/ | 2026-07-05

---

## 5. AI / LLM Stack

SoSoValue brands itself as "AI-powered" and uses AI in at least three visible ways:

1. **AI Crypto Daily podcast** — a daily short-form audio recap (visible in the homepage player widget). Text-to-speech generation is implied.
2. **AI news summaries** — the Feeds module surfaces "AI Summaries" tagged on Messari and elsewhere; the SoSoValue platform itself produces AI-generated TL;DRs for clusters of news.
3. **Comparative AI framework** — public Medium analysis explicitly compares "AI Frameworks in SoSoValue and Arkham" — SoSoValue runs an internal agent stack that filters signal from noise, clusters related news, and ranks hot news.

The specific models, vector DB, RAG architecture, and prompt templates are **not officially documented**. INFERRED stack (high uncertainty):
- Likely uses GPT-4-class models (or a fine-tuned open model) for summarisation.
- Likely uses a vector database (Pinecone, Weaviate, or pgvector) for semantic news clustering given the "cluster ID" field exposed by `/news/hot`.
- Likely uses a Whisper-class model for podcast transcription.

Source: Medium comparative analysis | https://medium.com/@gwrx2005/comparative-analysis-of-ai-frameworks-in-sosovalue-and-arkham-platforms-995c3b2db1e8 | 2026-07-05
Source: Homepage "SoSoValue Crypto Daily" podcast widget | https://m.sosovalue.com | 2026-07-05
Source: Messari AI summaries | https://messari.io/project/sosovalue/news | 2026-07-05

**Important**: there is no public LLM API. Developers building on SoSoValue must consume the structured data API (Feeds, Currency, etc.) and run their own LLM layer on top. This is the single biggest opportunity for hackathon projects (see §19).

---

## 6. Public APIs & SDKs

### 6.1 The one and only public API

SoSoValue exposes **exactly one** public API: the **SoSoValue OpenAPI v1** at `https://openapi.sosovalue.com/openapi/v1`. It is REST-only, JSON-only, API-key-authenticated, and read-only. There are no documented WebSocket, GraphQL, or gRPC endpoints for the consumer data API.

Source: API readme | https://sosovalue-1.gitbook.io/sosovalue-api-doc/readme.md | 2026-07-05

### 6.2 Official SDKs

**No official SDKs exist** for the SoSoValue data API. There is no npm package, no PyPI package, no Rust crate, no Go module published by SoSoValueLabs for the data API.

The only official SDK in the entire ecosystem is **`sodex-go-sdk-public`** (GitHub link referenced in the SoDEX docs), which covers *only* SoDEX trading-API signing — not the SoSoValue data API.

Searches across npm, PyPI, crates.io, and pkg.go.dev for "sosovalue", "soso-value", "soso api" return only unofficial auto-referral bots (e.g. `im-hanzou/sosovalue-autoref`), not official clients.

Source: npm/PyPI/crates search | /home/z/my-project/research/raw/search_{16,26,27,28}_*.json | 2026-07-05
Source: Go SDK reference in SoDEX docs | https://sodex.com/documentation/trading-api/go-sdk-signing-guide | 2026-07-05

**Implication for developers**: you will be writing your own HTTP client. The API is simple enough (REST + one header) that this is not a barrier — see §18 for ready-to-paste Python and TypeScript examples.

### 6.3 CLI tools

None official. The community `sosovalue-autoref` repos (Node.js, by `im-hanzou`, `ahlulmukh`, `mamangzed`) automate the referral-farming flow on the consumer site — they are not API clients and should not be used as reference code.

Source: GitHub search | /home/z/my-project/research/raw/search_01_github_org.json | 2026-07-05

---

## 7. Authentication & Authorization

### 7.1 Obtaining an API key

1. Register or log in with a SoSoValue account at `https://sosovalue.com/developer/dashboard`.
2. Click **Apply your Key**.
3. Fill in the application form (use-case description, etc.) and submit.
4. Approval is manual — the dashboard shows a "Pending" status, then "Approved".
5. Once approved, the dashboard displays the API key string.

Source: Setting-up docs | https://sosovalue-1.gitbook.io/sosovalue-api-doc/setting-up-your-api-key.md | 2026-07-05

### 7.2 Using the key

Every request must include the HTTP header:

```
x-soso-api-key: YOUR_API_KEY
```

There is **no OAuth, no JWT, no wallet signature** for the data API. The key is a static bearer-style secret. Treat it as such — do not commit it to public repos, do not ship it in client-side code.

Source: Authentication docs | https://sosovalue-1.gitbook.io/sosovalue-api-doc/authentication.md | 2026-07-05

### 7.3 Permission model

The docs do not document a scoped/role-based permission model. The API key appears to grant access to all modules. The error code `400301 Insufficient permissions` exists in the error table, suggesting scoped keys *may* exist internally, but no UI surface for creating scoped keys is documented.

Source: Error responses | https://sosovalue-1.gitbook.io/sosovalue-api-doc/error-responses.md | 2026-07-05

---

## 8. Rate Limits, Pagination, Errors

### 8.1 Rate limits

| Dimension | Rule |
|---|---|
| Scope | Per API key |
| Monthly quota | 100,000 requests per month |
| Request frequency | 20 requests per minute |

Response headers:
- `X-RateLimit-Limit` — max requests in the current 60s window
- `X-RateLimit-Remaining` — remaining requests in the current window
- `X-RateLimit-Reset` — Unix-ms timestamp when the window resets

When exceeded, the API returns HTTP 429 with body:
```json
{
  "code": 42901,
  "message": "Rate limit exceeded",
  "details": { "limit": 20, "window": "60s", "retry_after": 45 }
}
```

Source: Rate-limit docs | https://sosovalue-1.gitbook.io/sosovalue-api-doc/rate-limit.md | 2026-07-05

### 8.2 Pagination

Two modes are documented:

**Mode 1 — Pagination (entity lists)**: `page` (default 1) and `page_size` (default 20, max 100). Response wraps the list:
```json
{ "list": [...], "page": 1, "page_size": 20, "total": 542 }
```

**Mode 2 — Time window (time-series)**: `start_time`, `end_time` (Unix ms), `limit`. Data is returned ascending. To paginate, use `timestamp + 1` from the last record as the next request's `start_time`.

Per-endpoint availability of time windows:
- Klines: only `1d` interval; only most recent 3 months.
- ETF historical net inflow: only most recent 1 month.
- Feeds time filters: only most recent 7 days.

Source: Query modes docs | https://sosovalue-1.gitbook.io/sosovalue-api-doc/query-modes.md | 2026-07-05

### 8.3 Response format

All endpoints return a unified wrapper:
```json
{ "code": 0, "message": "success", "data": { ... } }
```
Paginated responses put `{list, page, page_size, total}` inside `data`. Time-series responses put a bare array inside `data`. Empty responses return `"data": null`.

Source: Response format docs | https://sosovalue-1.gitbook.io/sosovalue-api-doc/response-format.md | 2026-07-05

### 8.4 Error code reference

| Code | HTTP | Meaning |
|---|---|---|
| 400001 | 400 | Invalid parameter format |
| 400002 | 400 | Missing required parameter |
| 400003 | 400 | Invalid parameter value |
| 400101 | 401 | Invalid API Key |
| 400102 | 401 | API Key expired |
| 400301 | 403 | Insufficient permissions |
| 400401 | 404 | Resource not found (e.g. currency_id mismatch) |
| 400402 | 404 | Endpoint not found |
| 402901 | 429 | Too many requests |
| 500001 | 500 | Internal server error |
| 500301 | 503 | Service temporarily unavailable |

Error body example:
```json
{
  "code": 400001,
  "message": "Invalid parameter: currency_id",
  "details": {
    "field": "currency_id",
    "value": "invalid_id",
    "constraint": "must be numeric string",
    "suggestion": "Use GET /currencies to get valid currency IDs"
  }
}
```

Source: Error responses docs | https://sosovalue-1.gitbook.io/sosovalue-api-doc/error-responses.md | 2026-07-05

### 8.5 Update frequency per endpoint

| Module | Endpoint | Update frequency |
|---|---|---|
| Currency | `/currencies` | 1 min |
| Currency | `/currencies/{id}` | 5 min |
| Currency | `/currencies/{id}/market-snapshot` | 30 s |
| Currency | `/currencies/{id}/token-economics` | 5 min |
| Currency | `/currencies/{id}/klines` | Real-time |
| Currency | `/currencies/{id}/supply` | 1 min |
| Currency | `/currencies/{id}/pairs` | 30 s |
| Currency | `/currencies/sector-spotlight` | 1 min |
| Currency | `/currencies/{id}/fundraising` | 1 min |
| ETF | `/etfs/summary-history` | 1 min |
| ETF | `/etfs` | 1 min |
| ETF | `/etfs/{ticker}/market-snapshot` | 1 min |
| ETF | `/etfs/{ticker}/history` | 1 min |
| Index | `/indices` | 1 min |
| Index | `/indices/{ticker}/constituents` | 1 min |
| Index | `/indices/{ticker}/market-snapshot` | 30 s |
| Index | `/indices/{ticker}/klines` | 1 min |
| Crypto Stocks | (all) | 30 s – 1 min |
| BTC Treasuries | (all) | 1 min |
| Feeds | `/news`, `/news/hot`, `/news/featured` | Real-time |
| Fundraising | (all) | 1 min |
| Macro | (all) | 1 min |
| Analysis | (all) | 1 min |

Source: Endpoint overview | https://sosovalue-1.gitbook.io/sosovalue-api-doc/endpoint-overview.md | 2026-07-05

---

## 9. REST API Reference (full)

This is the complete reference. Every endpoint is listed with method, path, parameters, and a link to the official docs page.

### 9.1 Currency & Pairs

| # | Method | Endpoint | Required params | Optional params |
|---|---|---|---|---|
| 1.1 | GET | `/currencies` | — | — |
| 1.2 | GET | `/currencies/{currency_id}` | `currency_id` | — |
| 1.3 | GET | `/currencies/{currency_id}/market-snapshot` | `currency_id` | — |
| 1.4 | GET | `/currencies/{currency_id}/token-economics` | `currency_id` | — |
| 1.5 | GET | `/currencies/{currency_id}/klines` | `currency_id`, `interval=1d` | `start_time`, `end_time`, `limit` (default 100, max 500) |
| 1.6 | GET | `/currencies/{currency_id}/supply` | `currency_id` | `start_date`, `end_date`, `page`, `page_size` |
| 1.7 | GET | `/currencies/{currency_id}/pairs` | `currency_id` | `page`, `page_size`, `order_by`, `exchange` |
| 1.8 | GET | `/currencies/sector-spotlight` | — | — |
| 1.9 | GET | `/currencies/{currency_id}/fundraising` | — | `currency_id` |

**Key response shapes**:

`GET /currencies/{id}/market-snapshot` returns:
```json
{
  "price": 458.0,
  "change_pct_24h": -0.12,
  "turnover_24h": 4381082458.0,
  "turnover_rate": 0.123,
  "high_24h": 208.32,
  "low_24h": 195.14,
  "marketcap": 98187284636.4,
  "fdv": 119634407517.24,
  "max_supply": "593383314",
  "total_supply": "593383314",
  "circulating_supply": "487043475",
  "ath": 295.83,
  "ath_date": "1737244800000",
  "down_from_ath": "",
  "cycle_low": 175.89,
  "cycle_low_date": "1738540800000",
  "up_from_cycle_low": "",
  "marketcap_rank": 4
}
```

`GET /currencies/{id}/pairs` returns (paginated):
```json
{
  "list": [{
    "base": "BTC", "target": "USDT", "market": "Binance",
    "price": 69476, "turnover_24h": 20242,
    "cost_to_move_up_usd": 19320706.40,
    "cost_to_move_down_usd": 16360235.37
  }],
  "page": 1, "page_size": 100, "total": 542
}
```

`GET /currencies/{id}/token-economics` returns token allocation, unlock summary, and unlock timeline:
```json
{
  "token_allocation": [{"holder": "Community Reserve", "percentage": 38}],
  "token_unlock": {"unlocked": "40500000", "total_locked": "1000000"},
  "unlock_timeline": [{
    "vestings": [
      {"label": "Team", "amount": 159469480.8},
      {"label": "Investors", "amount": 135308347.2}
    ],
    "timestamp": "1234565434567"
  }]
}
```

`GET /currencies/sector-spotlight` returns:
```json
{
  "sector": [{"name": "btc", "24h_change_pct": -0.0012, "marketcap_dom": 0.58}],
  "spotlight": [{"name": "perpdex", "24h_change_pct": -0.0012}]
}
```

Source: API docs §1 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/ | 2026-07-05

### 9.2 ETF

| # | Method | Endpoint | Required | Optional |
|---|---|---|---|---|
| 2.1 | GET | `/etfs/summary-history` | `symbol` (BTC/ETH/SOL/LTC/HBAR/XRP/DOGE/LINK/AVAX/DOT), `country_code` (US/HK) | `start_date`, `end_date`, `limit` (default 50, max 300) |
| 2.2 | GET | `/etfs` | `symbol`, `country_code` | — |
| 2.3 | GET | `/etfs/{ticker}/market-snapshot` | `ticker` | — |
| 2.4 | GET | `/etfs/{ticker}/history` | `ticker` | `start_date`, `end_date`, `limit` (default 50, max 300) |

`summary-history` response (array, latest first, non-trading days excluded):
```json
[{
  "date": "2024-04-12",
  "total_net_inflow": -55066297.0,
  "total_value_traded": 4706120449.0,
  "total_net_assets": 56216535367.0,
  "cum_net_inflow": 13534833596.095
}]
```

Constraints: only the most recent 1 month is queryable.

Source: API docs §2 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/ | 2026-07-05

### 9.3 SoSoValue Index

| # | Method | Endpoint | Required |
|---|---|---|---|
| 3.1 | GET | `/indices` | — |
| 3.2 | GET | `/indices/{index_ticker}/constituents` | `index_ticker` (e.g. `ssimag7`) |
| 3.3 | GET | `/indices/{index_ticker}/market-snapshot` | `index_ticker` |
| 3.4 | GET | `/indices/{index_ticker}/klines` | `index_ticker`, `interval=1d` |

`/indices` returns a bare array: `["ssimag7", "ssilayer1"]`.
`/constituents` returns: `[{"currency_id": "...", "symbol": "btc", "weight": 0.31}]`
`/market-snapshot` returns: `{"price": 20.93, "24h_change_pct": -0.0016, "7day_roi": 0.0056, "1month_roi": 0.062, "3month_roi": 0.275, "1year_roi": 0.15, "ytd": -0.243}`

Source: API docs §3 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/ | 2026-07-05

### 9.4 Crypto Stocks

| # | Method | Endpoint | Required |
|---|---|---|---|
| 4.1 | GET | `/crypto-stocks` | — |
| 4.2 | GET | `/crypto-stocks/{stock_ticker}/market-snapshot` | `stock_ticker` |
| 4.3 | GET | `/crypto-stocks/{stock_ticker}/market-cap` | `stock_ticker` |
| 4.4 | GET | `/crypto-stocks/{stock_ticker}/klines` | `stock_ticker`, `interval=1d` |
| 4.5 | GET | `/crypto-stocks/sector` | — |
| 4.6 | GET | `/crypto-stocks/sector/{sector_name}/index` | `sector_name` |

Source: API docs §4 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/4.-crypto-stocks/ | 2026-07-05

### 9.5 BTC Treasuries

| # | Method | Endpoint | Required |
|---|---|---|---|
| 5.1 | GET | `/btc-treasuries` | — |
| 5.2 | GET | `/btc-treasuries/{ticker}/purchase-history` | `ticker` |

`/btc-treasuries` returns: `[{"ticker": "TSLA", "name": "Tesla", "list_location": "US"}]`
`/purchase-history` returns: `[{"date": "2024-04-12", "ticker": "MSTR", "btc_holding": 720737, "btc_acq": 3015, "acq_cost": 410000000, "avg_btc_cost": 75985}]`

Source: API docs §5 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/5.-btc-treasuries/ | 2026-07-05

### 9.6 Feeds (news)

| # | Method | Endpoint | Notes |
|---|---|---|---|
| 6.1 | GET | `/news` | Full feed with social engagement metrics |
| 6.2 | GET | `/news/hot` | Clustered hot-news |
| 6.3 | GET | `/news/featured` | Editorially curated |
| 6.4 | GET | `/news/search` | Keyword search |

`/news` query params: `category` (1 news, 2 research, 3 institution, 4 insights/KOL, 7 announcement, 13 crypto stock), `language`, `currency_id`, `project_id`, `page`, `page_size`, `start_time`, `end_time` (max 7 days back).

Response item:
```json
{
  "id": "news1",
  "source_link": "https://sosovalue.xyz/research/...",
  "original_link": "https://...",
  "release_time": 1677151845000,
  "title": "...",
  "content": "HTML formatted content...",
  "author": "@twitter_handle",
  "author_description": "...",
  "author_avatar_url": "https://...",
  "impression_count": 432,
  "like_count": 6,
  "reply_count": 0,
  "retweet_count": 3,
  "category": 1,
  "feature_image": "https://...",
  "nick_name": "Shirtum ®",
  "is_blue_verified": 1,
  "verified_type": "Business",
  "matched_currencies": [{"id": "...", "full_name": "BITCOIN", "name": "BTC"}],
  "tags": ["ETF", "DO KWON", "TERRAFORM LABS", "SEC"],
  "media_info": [{
    "soso_url": "https://static.sosovalue.com/media/example.jpg",
    "original_url": "",
    "short_url": "https://t.co/example",
    "type": "photo"
  }],
  "quote_info": { ... }
}
```

`/news/search` adds a `highlight` field showing where the keyword matched in `title` and `content`, and a `type` field. Default sort is `relevance`; alternative is publish-time descending. `page_size` max is 50.

Source: API docs §6 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/ | 2026-07-05

### 9.7 Fundraising

| # | Method | Endpoint |
|---|---|---|
| 7.1 | GET | `/fundraising/projects` |
| 7.2 | GET | `/fundraising/projects/{project_id}` |

The `/fundraising/projects/{project_id}` response is the same shape as `/currencies/{currency_id}/fundraising` (rounds, investors, team, investment_stats, portfolio).

Source: API docs §7 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/7.-fundraising/ | 2026-07-05

### 9.8 Macro

| # | Method | Endpoint |
|---|---|---|
| 8.1 | GET | `/macro/events` |
| 8.2 | GET | `/macro/events/{event}/history` |

Source: API docs §8 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/8.-macro/ | 2026-07-05

### 9.9 Analysis Charts

| # | Method | Endpoint |
|---|---|---|
| 9.1 | GET | `/analyses` |
| 9.2 | GET | `/analyses/{chart_name}` |

Source: API docs §9 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/9.-analysis-charts/ | 2026-07-05

---

## 10. WebSocket / Real-Time Feeds

**None publicly documented** for the SoSoValue consumer data API. All endpoints are poll-based REST with update frequencies between 30 seconds and "real-time" (which in practice means "as fast as the backend ingests", typically sub-minute).

For real-time trading data, use the SoDEX WebSocket API (see `02_SODEX_MASTER_REFERENCE.md` §7).

The SoSoValue homepage itself uses internal polling (visible in the "Loading data, please wait" splash) rather than a public WebSocket.

Source: Endpoint overview | https://sosovalue-1.gitbook.io/sosovalue-api-doc/endpoint-overview.md | 2026-07-05

---

## 11. GitHub Presence

SoSoValue's official GitHub organization is **`SoSoValueLabs`** at https://github.com/SoSoValueLabs.

As of the research snapshot, the org contains **4 repositories**:

| Repo | Language | Description | Status |
|---|---|---|---|
| `ssi-protocol` | Solidity (69.8%), JS (24%), Python (3.3%), Ruby (2.7%), Shell (0.2%) | SSI Protocol smart contracts. Foundry-based. 13 stars, 8 forks, 27 branches, 15 tags, 129 commits, last commit Jun 10 2026. | Active |
| `DefiLlama-Adapters` | JavaScript | Fork of DefiLlama/DefiLlama-Adapters. 0 stars. Last updated Feb 20 2025. 6,839 commits behind upstream. | Stale fork |
| `dimension-adapters` | TypeScript | Fork of DefiLlama/dimension-adapters. 0 stars. Last updated Feb 24 2025. | Stale fork |
| `ethereum-optimism.github.io` | TypeScript | Fork of ethereum-optimism/ethereum-optimism.github.io — unified token list for OP Mainnet, Base, and other OP Chains. 1 star. | Stale fork |

The DefiLlama-Adapters and dimension-adapters forks are how SoSoValue publishes its TVL / fees / revenue data to DeFiLlama (see §16). The ethereum-optimism.github.io fork is used to publish the SSI / SOSO token lists for OP-stack chains.

The ssi-protocol repo is the only original-code repo. Key files:
- `foundry.toml` — Solidity optimizer enabled (to reduce bytecode size)
- `lib/` — OpenZeppelin-upgradeable library
- `src/` — Main contracts (including `ResearchHubVoting`)
- `script/` — Deployment scripts (CounterScript pattern, plus `deploy_voting.sh`)
- `test/` — Forge test suite
- `deploy.sh`, `upgrade.sh` — Operational scripts
- README references a **SlowMist audit** (commit history: "fix slow-mist audit comment")

Recent commit themes (from the page scrape):
- "Add ResearchHubVoting approval-only issuance voting" (Jun 8 2026)
- "Add paginated getParticipatedProposals(voter, begin, end)" (Jun 9 2026)
- "enable Solidity optimizer to reduce contract bytecode size" (May 8 2026)
- "add voting deploy script" (May 9 2026)
- "transparent-proxy-upgrade" branch merged Nov 28 2024
- "migration" deploy.sh Jan 18 2025
- "add openzeppelin-upgradeable library" Nov 20 2024
- "update license" Sep 3 2024

The full README is just the default Foundry boilerplate — there is no project-specific README documentation. See `03_SSI_PROTOCOL_MASTER_REFERENCE.md` for the contract-level deep dive.

Source: GitHub org page | https://github.com/SoSoValueLabs | 2026-07-05
Source: SSI Protocol repo | https://github.com/SoSoValueLabs/ssi-protocol | 2026-07-05
Source: DefiLlama-Adapters fork | https://github.com/SoSoValueLabs/DefiLlama-Adapters | 2026-07-05

### 11.1 Unofficial / community GitHub repos

These are NOT official and should not be trusted as API references:
- `im-hanzou/sosovalue-autoref` — Node.js referral-farming bot
- `ahlulmukh/sosovalue-autoreff` — Same
- `mamangzed/sosovalue` — Same
- `MeoMunDep/SoSoValue` — Has GitHub Actions workflows for automation

Source: GitHub search results | /home/z/my-project/research/raw/search_01_github_org.json | 2026-07-05

---

## 12. Whitepaper Summary

The SoSoValue whitepaper lives at https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper. The official landing page confirms:

> "SoSoValue is an AI-powered crypto investment and research platform that aims to enable crypto investment to the global masses."
>
> "ValueChain: a dedicated Layer-1 infrastructure designed to support SoDEX and the wider ecosystem through its modular framework, ensuring..."

The whitepaper is structured into at least 9 chapters:
1. Introduction: What is SoSoValue
2. (Architecture / ecosystem overview — inferred)
3. (Likely AI / data layer — inferred)
4. (Likely product surface — inferred)
5. SoSoValue Indexes — A New Approach to Passive Crypto Investment for the Masses
   - 5.1 SSI Protocol Overview
6. (Likely SoDEX — see SoDEX whitepaper)
7. (Likely ValueChain)
   - 7.3 The Validator (inferred from tokenomics page back-reference)
8. Tokenomics
   - 8.1 SOSO Token — "SOSO has a permanently fixed supply of 1 billion with no inflation, ensuring long-term scarcity and predictability."
   - 8.2 Tokenomics — "The Foundation allocation is designed to support SoSoValue's sustainable growth and ecosystem development. It is divided into two parts: 12% - ..."
9. Resources
   - 9.2 Audits
   - 9.3 MiCAR Whitepaper (published 2025-08-01, registered with the Central Bank of Ireland per ESMA's white-paper register)

Source: Whitepaper root | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper | 2026-07-05
Source: 8.1 SOSO Token | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.1-soso-token | 2026-07-05
Source: 8.2 Tokenomics | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.2-tokenomics | 2026-07-05
Source: 9.2 Audits | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/9.-resources/9.2-audits | 2026-07-05
Source: ESMA MiCAR register | https://www.esma.europa.eu/sites/default/files/2024-12/OTHER.csv | 2026-07-05

### 12.1 MiCAR whitepaper (Kraken UK Crypto Asset Statement)

A Kraken-hosted PDF dated 2025-07-14 confirms:
- SoSoValue was co-founded by **May Wang, JIVVVA Kwan, and Jessie Lo**.
- Total supply of SOSO is **1 billion tokens**.
- SoSoValue is an AI-based crypto research platform that aggregates on-chain, exchange, and macro data.

Source: Kraken UK Crypto Asset Statement | https://assets-cms.kraken.com/files/51n36hrp/facade/fd707339600f9aed634e6a651d5ac8c2f746f4d9.pdf | 2026-07-05

---

## 13. Tokenomics ($SOSO)

### 13.1 Supply

- Total supply: **1,000,000,000 (1 billion) SOSO**, permanently fixed, no inflation.

Source: Whitepaper §8.1 | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.1-soso-token | 2026-07-05

### 13.2 Allocation

Per the whitepaper §8.2 snippet, the Foundation allocation (12%) is split into two parts for "sustainable growth and ecosystem development". The full allocation table is on the whitepaper page (gated behind GitBook JS rendering — partially captured). Standard allocations for a project of this profile typically include: Community Reserve, Foundation, Team, Investors, Ecosystem Incentives, Airdrop, Liquidity. The exact percentages must be confirmed from the whitepaper page directly.

Source: Whitepaper §8.2 | https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.2-tokenomics | 2026-07-05

### 13.3 Token contracts

| Chain | Address | Standard |
|---|---|---|
| Ethereum | `0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d` | ERC-20 |
| Base | `0x624e2e7fdc8903165f64891672267ab0fcb98831` | ERC-20 |
| ValueChain (EVM syschain) | Native gas token (not a wrapped ERC-20; SOSO is the L1's base currency) | Native |

Source: Etherscan | https://etherscan.io/address/0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d | 2026-07-05
Source: BaseScan | https://basescan.org/token/0x624e2e7fdc8903165f64891672267ab0fcb98831 | 2026-07-05
Source: ValueChain EVM docs | https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-valuechain-evm | 2026-07-05

### 13.4 Wrapped SOSO (WSOSO)

On the ValueChain EVM syschain, a canonical wrapped-SOSO contract is deployed at the vanity address `0x5050505050505050505050505050505050505050`. The contract is **immutable** and has the same source code as WETH on Ethereum (only the name/symbol differ: "Wrapped SOSO" / "WSOSO", 18 decimals). Standard `deposit()`, `withdraw()`, `approve()`, `transfer()`, `transferFrom()` interface.

Source: WSOSO docs | https://sodex.com/documentation/about-valuechain/how-valuechain-works/about-wsoso | 2026-07-05

### 13.5 Utilities

Per the SSI token page (`https://ssi.sosovalue.com/soso-token`):
- Decentralized governance (community voting on SIPs — SoSoValue Improvement Proposals; SIP-1 went live Aug 12 2025).
- User incentives (airdrop seasons, points).
- Protocol security (staking / slashing — see SSI staking).
- Premium feature realization.
- Native gas on ValueChain (since the SoDEX mainnet launch).
- Trading-fee discount on SoDEX (when staked — see SoDEX Trading Fees).
- Multi-asset collateral on SoDEX Perps (50% collateral ratio, capped at min(30,000 SOSO, 10,000 USDC worth)).

Source: $SOSO token page | https://ssi.sosovalue.com/soso-token | 2026-07-05
Source: SoDEX multi-asset margin docs | https://sodex.com/documentation/trading-mechanics/multi-asset-margin | 2026-07-05
Source: SIP-1 announcement | https://m.sosovalue.com/announcement | 2026-07-05

### 13.6 Airdrop history

- **Season 1**: 49 million SOSO tokens airdropped. First season confirmed by The Block.
- **Season 2**: Postponed at least once (per community Facebook post by Szymanski). Continues to use Loyalty Points and SSI Points as the distribution mechanism.

Source: The Block Season 1 announcement | https://www.theblock.co/post/335380/sosovalue-token-airdrop-launch | 2026-07-05
Source: Airdrops.io eligibility guide | https://airdrops.io/sosovalue | 2026-07-05
Source: Gate.com claiming guide | https://web3.gate.com/crypto-wiki/article/sosovalue-airdrop-complete-guide-to-claiming-free-soso-tokens-20260108 | 2026-07-05

### 13.7 Exchange listings

$SOSO is listed on: Binance, Kraken, Bybit (spot + perps), OKX, Biconomy, Coinbase (price page), KuCoin-class exchanges. Bybit supports SOSO deposits on ValueChain.

Source: Binance price page | https://www.binance.com/en/price/sosovalue | 2026-07-05
Source: Kraken convert | https://www.kraken.com/convert/soso | 2026-07-05
Source: Bybit spot | https://www.bybit.com/en/trade/spot/SOSO/USDT | 2026-07-05
Source: Bybit perps | https://www.bybit.com/trade/usdt/SOSOUSDT | 2026-07-05
Source: Bybit ValueChain deposits | https://announcements.bybit.com/en/article/bybit-now-supports-soso-deposits-on-valuechain-blt1d9fec7edeb582b6 | 2026-07-05
Source: OKX price | https://www.okx.com/en-us/price/sosovalue-soso | 2026-07-05
Source: Biconomy listing | https://biconomy.zendesk.com/hc/en-us/articles/52603462432025-Biconomy-com-New-Listing-SoSoValue-SOSO-for-Spot-Trading | 2026-07-05
Source: Coinbase price | https://www.coinbase.com/price/sosovalue | 2026-07-05
Source: Kraken listing announcement | https://m.sosovalue.com/announcement | 2026-07-05

### 13.8 Vesting

Vesting schedules are tracked by DropStab and Tokenomist. Token unlocks are scheduled events visible on tokenomist.ai/sosovalue/unlock-events and dropstab.com/coins/sosovalue/vesting. The whitepaper §8.2 contains the authoritative vesting timeline.

Source: Tokenomist | https://tokenomist.ai/sosovalue/unlock-events | 2026-07-05
Source: DropStab | https://dropstab.com/coins/sosovalue/vesting | 2026-07-05

---

## 14. Roadmap & Milestones

Reconstructed from press releases, announcements, and whitepaper breadcrumbs:

| Date | Milestone |
|---|---|
| 2023 | Development begins |
| Mid-2024 | Consumer platform launches |
| 2024 Q3 | $4.15M seed round (HongShan lead, GSR Markets, Alumni Ventures) |
| 2024 | SSI Protocol concept published |
| 2025-01-08 | $15M Series A announced ($200M valuation); SSI Protocol launch |
| 2025-02 | SSI TVL crosses $200M |
| 2025-03-13 | New fee tier schedule goes live on SoDEX |
| 2025-04 (approx) | Kraken UK Crypto Asset Statement filed |
| 2025-05 | SoDEX testnet launch |
| 2025-07-07 | $SOSO listed on Kraken |
| 2025-07-17 | Daily podcast launches |
| 2025-07-02 | French localization |
| 2025-08-01 | MiCAR whitepaper registered with Central Bank of Ireland |
| 2025-08-12 | First governance proposal SIP-1 goes live |
| 2025-09 (approx) | SSI Staking Epoch 4 launches with 15M $SOSO rewards |
| 2025-10 | SoDEX mainnet launches on ValueChain; $SOSO becomes native gas + governance token |
| 2025-11-09 | SSI Staking Epoch 4 + sMAG7.ssi in SoDEX Vault |
| 2025-12-03 | OnePiece Labs + Solana + SoSoValue expanded AI × Web3 university tour |
| 2026 (ongoing) | Buildathon online kickoff; $10K grant; community AMAs; SSI ResearchHubVoting contract deployed |

Source: GlobeNewswire | https://www.globenewswire.com/news-release/2025/01/08/3006098/0/en/ai-driven-crypto-research-platform-sosovalue-raises-15-million-series-a-to-launch-the-investible-spot-index-protocol-ssi.html | 2026-07-05
Source: EQS SoDEX mainnet | https://www.eqs-news.com/news/corporate/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token/65d8ce6c-526d-4242-8856-422e4d86dc17_en | 2026-07-05
Source: Decrypt SoDEX mainnet | https://decrypt.co/346354/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token | 2026-07-05
Source: Announcements | https://m.sosovalue.com/announcement | 2026-07-05
Source: OnePiece Labs partnership | https://www.globenewswire.com/news-release/2025/12/03/3198540/0/en/onepiece-labs-solana-and-sosovalue-launched-expanded-ai-web3-university-tour-series-following-record-fall-2025-run.html | 2026-07-05
Source: Buildathon | https://luma.com/soSoValue-buildathon | 2026-07-05

---

## 15. Team & Funding

### 15.1 Co-founders

- **May Wang** — Co-founder. LinkedIn: https://sg.linkedin.com/in/may-wang-689102313
- **JIVVVA Kwan** — Co-founder (per Kraken disclosure).
- **Jessie Lo** — Co-founder. LinkedIn: https://sg.linkedin.com/in/jessie-l-5aaba626 (also `jess-l-1a06a1316`). Featured on the BaseLayer podcast Episode 5.

Source: Kraken PDF | https://assets-cms.kraken.com/files/51n36hrp/facade/fd707339600f9aed634e6a651d5ac8c2f746f4d9.pdf | 2026-07-05
Source: BaseLayer podcast | https://www.youtube.com/watch?v=UvGFMDUvJLQ | 2026-07-05
Source: LinkedIn company | https://sg.linkedin.com/company/sosovalue | 2026-07-05

### 15.2 Funding rounds

| Round | Date | Amount | Lead investors | Notable participants | Valuation |
|---|---|---|---|---|---|
| Seed | Mid-2024 | $4.15M | HongShan (ex-Sequoia China) | GSR Markets, Alumni Ventures | Not disclosed |
| Series A | 2025-01-08 | $15M | HongShan + SmallSpark.ai (co-lead) | Mirana Ventures, Safepal | $200M |

Source: Finance Magnates seed coverage | https://www.financemagnates.com/thought-leadership/sosovalue-raises-415m-seed-funding-for-its-crypto-research-platform | 2026-07-05
Source: Fortune Series A | https://fortune.com/crypto/2025/01/08/crypto-data-platform-sosovalue-funding-multi-coin-indices | 2026-07-05
Source: The Block valuation | https://www.theblock.co/post/333620/sosovalue-funding-valuation | 2026-07-05
Source: Crunchbase | https://www.crunchbase.com/organization/sosovalue | 2026-07-05
Source: CryptoRank | https://cryptorank.io/ico/sosovalue | 2026-07-05

### 15.3 Registered user count

EQS press release (October 2025) confirms "over 10 million registered users".

Source: EQS | https://www.eqs-news.com/news/corporate/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token/65d8ce6c-526d-4242-8856-422e4d86dc17_en | 2026-07-05

### 15.4 Tracxn profile

Tracxn maintains a 2026 company profile with team headcount, competitors, and funding history at https://tracxn.com/d/companies/sosovalue/__Tx0FsQYR_YrY2mkk2pbdb5pVOwP6idiQIrvhw8Q0bA4.

Source: Tracxn | https://tracxn.com/d/companies/sosovalue/__Tx0FsQYR_YrY2mkk2pbdb5pVOwP6idiQIrvhw8Q0bA4 | 2026-07-05

---

## 16. Third-Party Coverage

### 16.1 DeFiLlama

SoSoValue maintains three DeFiLlama protocol entries:

| Protocol | URL | TVL definition | Fee definition |
|---|---|---|---|
| SoSoValue | https://defillama.com/protocol/sosovalue | (Top-level entity) | — |
| SoSoValue Indexes (SSI) | https://defillama.com/protocol/sosovalue-indexes | Underlying tokens in SSI baskets | Daily service fee of 0.01% of underlying asset value |
| SoSoValue Basis | https://defillama.com/protocol/sosovalue-basis | USSI tokens minted | Yield from delta hedging + 0.01% daily service fee |

The SoSoValueLabs/DefiLlama-Adapters GitHub fork is the source of these adapters.

Source: DeFiLlama SSI | https://defillama.com/protocol/sosovalue-indexes | 2026-07-05
Source: DeFiLlama Basis | https://defillama.com/protocol/sosovalue-basis | 2026-07-05
Source: DeFiLlama SoSoValue | https://defillama.com/protocol/sosovalue | 2026-07-05

### 16.2 Dune

A community Dune dashboard tracks SoSoValue metrics: https://dune.com/dannytrump/soso-dashboard

Source: Dune | https://dune.com/dannytrump/soso-dashboard | 2026-07-05

### 16.3 Messari

Messari maintains a SoSoValue project page with charts (market risk, investor activity) and AI-summarised news.

Source: Messari project | https://messari.io/project/sosovalue | 2026-07-05

### 16.4 CoinGecko / CMC

Both track $SOSO price, market cap, historical data:
- CoinGecko: https://www.coingecko.com/en/coins/sosovalue
- CMC: https://coinmarketcap.com/currencies/sosovalue
- CMC AI page: https://coinmarketcap.com/cmc-ai/sosovalue/what-is

Source: CoinGecko | https://www.coingecko.com/en/coins/sosovalue | 2026-07-05
Source: CMC | https://coinmarketcap.com/currencies/sosovalue | 2026-07-05

### 16.5 Third-party explainers

- Phemex Academy — "What Is SoSoValue (SOSO) Token?": https://phemex.com/academy/what-is-sosovalue-soso
- Gate.com learn — "What Is SoSoValue?": https://www.gate.com/learn/articles/what-is-so-so-value/6463
- Gate.com learn — "SoSoValue Overview": https://www.gate.com/learn/articles/soso-overview/5995
- Cube Exchange explainer: https://www.cube.exchange/what-is/soso
- CryptoTotem ratings: https://cryptototem.com/sosovalue-soso
- ICO Analytics: https://icoanalytics.org/projects/sosovalue

Source: (as linked above) | 2026-07-05

### 16.6 Press coverage

- Yahoo Finance (seed): https://finance.yahoo.com/news/sosovalue-raised-4-15m-seed-110000516.html
- Yahoo Finance (Series A): https://finance.yahoo.com/news/crypto-data-platform-sosovalue-raises-120000055.html
- FinSMEs: https://www.finsmes.com/2025/01/sosovalue-raises-15m-in-series-a-funding.html
- BeInCrypto: https://beincrypto.com/sosovalue-raises-15-million
- CoinPedia SSI launch: https://coinpedia.org/information/sosovalue-launches-ssi-protocol-after-15m-series-a-funding
- TradingView SoDEX mainnet: https://www.tradingview.com/news/eqs:c3d6c2968094b:0-sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token
- Binance Square SoDEX launch: https://www.binance.com/en/square/post/35901944783642
- Binance Square SoDEX mainnet live: https://www.binance.com/en/square/post/35869624579810
- Decrypt SoDEX mainnet: https://decrypt.co/346354/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token
- WuBlockchain SoDEX tweet: https://x.com/WuBlockchain/status/2017983782649782637
- Bitget MAG7.ssi news: https://www.bitget.com/news/detail/12560604870009
- Panewslab SSI Season 2: https://www.panewslab.com/en/articles/kqopya0d

Source: (as linked above) | 2026-07-05

### 16.7 Hackathon / community

- SoSoValue Buildathon Online Kickoff: https://luma.com/soSoValue-buildathon and https://www.youtube.com/watch?v=EMQXuf8n9m4 ($10,000 grant)
- Aindo.io wave-hacks: https://app.akindo.io/wave-hacks/JBEQXgN4Zi2jA3wA
- Blockchain@NTU workshop: https://www.instagram.com/p/DVi3VkziRcS
- Galxe quest: https://app.galxe.com/quest/UvEGYeVt2aHcFFAJGg7kxx

Source: (as linked above) | 2026-07-05

### 16.8 YouTube channel

Official: https://www.youtube.com/@sosovalue — publishes daily podcast, season guides, AMA recaps, buildathon workshops.

Source: YouTube | https://www.youtube.com/@sosovalue | 2026-07-05

---

## 17. Common Pitfalls & Known Issues

This section catalogues real issues reported by community / observable from the docs. Each entry: symptom → cause → fix.

### 17.1 Time-window limits are silent

**Symptom**: Calling `/currencies/{id}/klines` with `start_time` 6 months ago returns only the most recent 3 months of data, with no error.

**Cause**: The docs note "The query range is limited to the most recent 3 months" but the API does not return an error when the requested range exceeds the limit — it silently truncates.

**Fix**: Always check the timestamp of the first returned candle and either (a) accept the truncation, or (b) maintain your own local store by polling daily and incrementally building history.

Source: API docs §1.5 Notes | https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/klines.md | 2026-07-05

### 17.2 ETF history truncates to 1 month

Same silent-truncation pattern. ETF historical data is limited to the most recent 1 month. For longer history, use the public SoSoValue web UI's "Excel download" feature (which the API does not expose) or scrape the ETF issuer's own filings.

Source: API docs §2.4 Notes | https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/history.md | 2026-07-05

### 17.3 News time filter limited to 7 days

**Symptom**: `/news?start_time=<30_days_ago>` returns nothing or only the last 7 days.

**Cause**: "start_time and end_time only support the most recent 7 days."

**Fix**: Use `/news/search` for older content (search has no documented 7-day limit, only `page_size` max 50). Or poll `/news` daily and store locally.

Source: API docs §6.1 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/news.md | 2026-07-05

### 17.4 Response field inconsistency: `down_from_ath` empty string

The `market-snapshot` response returns `down_from_ath` and `up_from_cycle_low` as **empty strings** (not numbers) in the documented example, even though semantically they are percentages. Treat them as optional strings and parse defensively.

Source: API docs §1.3 example | https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/market-snapshot.md | 2026-07-05

### 17.5 `ath_date` returned as string despite being a timestamp

The docs show `"ath_date": "1737244800000"` — a string, not a number, despite the description "ATH date (timestamp)". Always parse to int/long via string-to-int conversion.

Source: API docs §1.3 example | https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/market-snapshot.md | 2026-07-05

### 17.6 `supply` response example has a malformed JSON wrapper

The docs show:
```json
{
  {
    "date": "2025-10-11",
    "max_supply": "593383314",
    ...
  }
}
```
This is a typo in the docs — the actual response is a paginated list, not a doubly-nested object. Test against a live endpoint before assuming the shape.

Source: API docs §1.6 example | https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/supply.md | 2026-07-05

### 17.7 `currency_id` is a numeric string, not a number

Currency IDs are large numeric strings like `"1673723677362319867"`. JavaScript's `Number` type loses precision past 2^53. Always treat `currency_id` as a string end-to-end. The API will reject non-numeric strings with `400001 Invalid parameter format`.

Source: API docs §1.2 example | https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/info.md | 2026-07-05
Source: Error responses | https://sosovalue-1.gitbook.io/sosovalue-api-doc/error-responses.md | 2026-07-05

### 17.8 Monthly quota is per-key, not per-IP

The 100,000-requests-per-month limit is per API key. If you build a multi-tenant product on top of SoSoValue, each user must obtain their own key, or you must implement a key-rotation pool. The 20-requests-per-minute limit is also per-key.

Source: Rate-limit docs | https://sosovalue-1.gitbook.io/sosovalue-api-doc/rate-limit.md | 2026-07-05

### 17.9 No official SDK — DIY required

Don't waste time looking for `pip install sosovalue` or `npm install @sosovalue/sdk`. They don't exist. Use the Python/TypeScript clients in §18.

### 17.10 The `sosovalue.xyz` domain in news `source_link`

News `source_link` fields use `https://sosovalue.xyz/research/...` — a different domain from the consumer-facing `m.sosovalue.com`. Both resolve to the same content; `sosovalue.xyz` appears to be the canonical link shortener / permalinks domain for content.

Source: API docs §6.1 example | https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/news.md | 2026-07-05

### 17.11 `category` enum is not closed in `/news`

The `/news` endpoint documents categories 1, 2, 3, 4, 7, 13. But the `/news/featured` endpoint accepts `category` as `array[integer]` "See 6.1 for category definitions". The actual API may return additional undocumented category integers; filter defensively.

Source: API docs §6.1 / §6.3 | https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/ | 2026-07-05

### 17.12 Approval queue for API keys is manual

Don't expect instant API-key issuance. The dashboard shows "Pending" status and a human reviews the application. Plan for 1–3 business days. For hackathons, request the key **the day the hackathon is announced**.

Source: Setting-up docs | https://sosovalue-1.gitbook.io/sosovalue-api-doc/setting-up-your-api-key.md | 2026-07-05

---

## 18. Code Examples

### 18.1 Python client (minimal, production-quality)

```python
"""
Minimal SoSoValue OpenAPI v1 client.
API version: v1 (as of 2026-07-05)
Requires: requests (pip install requests)
"""
import os
import time
import requests
from typing import Any

BASE_URL = "https://openapi.sosovalue.com/openapi/v1"

class SoSoValueClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ["SOSO_API_KEY"]
        self.session = requests.Session()
        self.session.headers.update({"x-soso-api-key": self.api_key})
        # Token-bucket for the 20-req/min limit
        self._min_window = {"count": 0, "reset_at": time.time() + 60}

    def _guard_rate(self) -> None:
        now = time.time()
        if now > self._min_window["reset_at"]:
            self._min_window = {"count": 0, "reset_at": now + 60}
        if self._min_window["count"] >= 20:
            sleep_for = self._min_window["reset_at"] - now
            time.sleep(max(sleep_for, 0.1))
            self._guard_rate()
        self._min_window["count"] += 1

    def _get(self, path: str, **params: Any) -> Any:
        self._guard_rate()
        r = self.session.get(f"{BASE_URL}{path}", params=params, timeout=15)
        r.raise_for_status()
        body = r.json()
        if body.get("code") != 0:
            raise RuntimeError(f"SOSO API error: {body}")
        return body["data"]

    # Currency module
    def list_currencies(self) -> list[dict]:
        return self._get("/currencies")

    def currency_info(self, currency_id: str) -> dict:
        return self._get(f"/currencies/{currency_id}")

    def market_snapshot(self, currency_id: str) -> dict:
        return self._get(f"/currencies/{currency_id}/market-snapshot")

    def token_economics(self, currency_id: str) -> dict:
        return self._get(f"/currencies/{currency_id}/token-economics")

    def klines(self, currency_id: str, start_ms: int | None = None,
               end_ms: int | None = None, limit: int = 500) -> list[dict]:
        params = {"interval": "1d", "limit": limit}
        if start_ms: params["start_time"] = start_ms
        if end_ms:   params["end_time"]   = end_ms
        return self._get(f"/currencies/{currency_id}/klines", **params)

    def pairs(self, currency_id: str, page: int = 1, page_size: int = 100) -> dict:
        return self._get(f"/currencies/{currency_id}/pairs",
                         page=page, page_size=page_size)

    def sector_spotlight(self) -> dict:
        return self._get("/currencies/sector-spotlight")

    # ETF module
    def etf_summary_history(self, symbol: str, country_code: str,
                             limit: int = 300) -> list[dict]:
        return self._get("/etfs/summary-history",
                         symbol=symbol, country_code=country_code, limit=limit)

    def etf_list(self, symbol: str, country_code: str) -> list[dict]:
        return self._get("/etfs", symbol=symbol, country_code=country_code)

    def etf_market_snapshot(self, ticker: str) -> dict:
        return self._get(f"/etfs/{ticker}/market-snapshot")

    def etf_history(self, ticker: str, limit: int = 300) -> list[dict]:
        return self._get(f"/etfs/{ticker}/history", limit=limit)

    # Index module
    def list_indices(self) -> list[str]:
        return self._get("/indices")

    def index_constituents(self, ticker: str) -> list[dict]:
        return self._get(f"/indices/{ticker}/constituents")

    def index_market_snapshot(self, ticker: str) -> dict:
        return self._get(f"/indices/{ticker}/market-snapshot")

    def index_klines(self, ticker: str, limit: int = 500) -> list[dict]:
        return self._get(f"/indices/{ticker}/klines", interval="1d", limit=limit)

    # Crypto Stocks module
    def list_crypto_stocks(self) -> list[dict]:
        return self._get("/crypto-stocks")

    def crypto_stock_market_snapshot(self, ticker: str) -> dict:
        return self._get(f"/crypto-stocks/{ticker}/market-snapshot")

    # BTC Treasuries module
    def list_btc_treasuries(self) -> list[dict]:
        return self._get("/btc-treasuries")

    def btc_purchase_history(self, ticker: str, limit: int = 100) -> list[dict]:
        return self._get(f"/btc-treasuries/{ticker}/purchase-history", limit=limit)

    # Feeds module
    def news(self, category: int | None = None, currency_id: str | None = None,
             page: int = 1, page_size: int = 100) -> dict:
        params = {"page": page, "page_size": page_size}
        if category: params["category"] = category
        if currency_id: params["currency_id"] = currency_id
        return self._get("/news", **params)

    def hot_news(self, page: int = 1, page_size: int = 100) -> dict:
        return self._get("/news/hot", page=page, page_size=page_size)

    def featured_news(self, page: int = 1, page_size: int = 20,
                      category: list[int] | None = None) -> dict:
        params = {"page": page, "page_size": page_size}
        if category: params["category"] = ",".join(map(str, category))
        return self._get("/news/featured", **params)

    def search_news(self, keyword: str, page: int = 1, page_size: int = 50,
                    sort: str = "relevance") -> dict:
        return self._get("/news/search", keyword=keyword,
                         page=page, page_size=page_size, sort=sort)

    # Fundraising module
    def fundraising_projects(self, page: int = 1, page_size: int = 20) -> dict:
        return self._get("/fundraising/projects", page=page, page_size=page_size)

    def fundraising_detail(self, project_id: str) -> dict:
        return self._get(f"/fundraising/projects/{project_id}")
```

Usage:
```python
c = SoSoValueClient()  # reads $SOSO_API_KEY
print(c.list_currencies()[:3])
print(c.market_snapshot("1673723677362319867"))  # ETH example id
print(c.etf_summary_history("BTC", "US", limit=10))
print(c.index_market_snapshot("ssimag7"))
print(c.hot_news(page_size=5))
```

### 18.2 TypeScript / Node.js client

```typescript
// sosovalue-client.ts
// API version: v1 (as of 2026-07-05)
// No dependencies. Node 18+ (uses global fetch).

const BASE = "https://openapi.sosovalue.com/openapi/v1";

export class SoSoValueClient {
  private apiKey: string;
  private minWindow: { count: number; resetAt: number };

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.SOSO_API_KEY!;
    if (!this.apiKey) throw new Error("SOSO_API_KEY env var required");
    this.minWindow = { count: 0, resetAt: Date.now() + 60_000 };
  }

  private async guardRate(): Promise<void> {
    const now = Date.now();
    if (now > this.minWindow.resetAt) {
      this.minWindow = { count: 0, resetAt: now + 60_000 };
    }
    if (this.minWindow.count >= 20) {
      await new Promise((r) => setTimeout(r, this.minWindow.resetAt - now));
      return this.guardRate();
    }
    this.minWindow.count++;
  }

  private async get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    await this.guardRate();
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    const r = await fetch(url, { headers: { "x-soso-api-key": this.apiKey } });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    const body = await r.json();
    if (body.code !== 0) throw new Error(`SOSO API error: ${JSON.stringify(body)}`);
    return body.data as T;
  }

  listCurrencies() { return this.get("/currencies"); }
  currencyInfo(id: string) { return this.get(`/currencies/${id}`); }
  marketSnapshot(id: string) { return this.get(`/currencies/${id}/market-snapshot`); }
  klines(id: string, limit = 500) {
    return this.get(`/currencies/${id}/klines`, { interval: "1d", limit });
  }
  sectorSpotlight() { return this.get("/currencies/sector-spotlight"); }

  etfSummaryHistory(symbol: string, countryCode: string, limit = 300) {
    return this.get("/etfs/summary-history", { symbol, country_code: countryCode, limit });
  }
  etfList(symbol: string, countryCode: string) {
    return this.get("/etfs", { symbol, country_code: countryCode });
  }

  listIndices() { return this.get("/indices"); }
  indexConstituents(ticker: string) { return this.get(`/indices/${ticker}/constituents`); }
  indexMarketSnapshot(ticker: string) { return this.get(`/indices/${ticker}/market-snapshot`); }

  listCryptoStocks() { return this.get("/crypto-stocks"); }
  listBtcTreasuries() { return this.get("/btc-treasuries"); }
  btcPurchaseHistory(ticker: string) { return this.get(`/btc-treasuries/${ticker}/purchase-history`); }

  news(opts: { category?: number; currency_id?: string; page?: number; page_size?: number } = {}) {
    return this.get("/news", opts as any);
  }
  hotNews(page = 1, pageSize = 100) {
    return this.get("/news/hot", { page, page_size: pageSize });
  }
  searchNews(keyword: string, sort: "relevance" | "time" = "relevance") {
    return this.get("/news/search", { keyword, sort, page_size: 50 });
  }
}
```

Usage:
```typescript
const c = new SoSoValueClient();
console.log(await c.listCurrencies());
console.log(await c.indexMarketSnapshot("ssimag7"));
console.log(await c.hotNews(1, 5));
```

### 18.3 cURL one-liners

```bash
# List all currencies
curl -H "x-soso-api-key: $SOSO_API_KEY" \
  https://openapi.sosovalue.com/openapi/v1/currencies

# Get ETH market snapshot
curl -H "x-soso-api-key: $SOSO_API_KEY" \
  https://openapi.sosovalue.com/openapi/v1/currencies/1673723677362319867/market-snapshot

# Get SSI MAG7 index constituents
curl -H "x-soso-api-key: $SOSO_API_KEY" \
  https://openapi.sosovalue.com/openapi/v1/indices/ssimag7/constituents

# Get BTC ETF summary history (US)
curl -H "x-soso-api-key: $SOSO_API_KEY" \
  "https://openapi.sosovalue.com/openapi/v1/etfs/summary-history?symbol=BTC&country_code=US&limit=10"

# Get hot news
curl -H "x-soso-api-key: $SOSO_API_KEY" \
  "https://openapi.sosovalue.com/openapi/v1/news/hot?page=1&page_size=20"

# Search news for "ETF"
curl -H "x-soso-api-key: $SOSO_API_KEY" \
  "https://openapi.sosovalue.com/openapi/v1/news/search?keyword=ETF&sort=relevance&page_size=20"
```

### 18.4 Environment variables

```
SOSO_API_KEY=your_api_key_here
# Optional (for companion SoDEX / ValueChain work):
SODEX_SPOT_REST=https://mainnet-gw.sodex.dev/api/v1/spot
SODEX_PERPS_REST=https://mainnet-gw.sodex.dev/api/v1/perps
SODEX_SPOT_WS=wss://mainnet-gw.sodex.dev/ws/spot
SODEX_PERPS_WS=wss://mainnet-gw.sodex.dev/ws/perps
VALUECHAIN_RPC=https://mainnet.valuechain.xyz
VALUECHAIN_CHAIN_ID=286623
```

### 18.5 End-to-end: build a "crypto market morning brief" agent

```python
"""
Example: a morning-brief agent that uses SoSoValue data
to produce a 5-bullet market summary suitable for an LLM.
"""
from sosovalue_client import SoSoValueClient

c = SoSoValueClient()

brief = []

# 1. Top mover
spotlight = c.sector_spotlight()
top_sector = max(spotlight["sector"], key=lambda s: s["24h_change_pct"])
brief.append(f"Sector '{top_sector['name']}' leads 24h with {top_sector['24h_change_pct']:+.2%} "
             f"and {top_sector['marketcap_dom']:.1%} market-cap dominance.")

# 2. BTC ETF flows (yesterday)
btc_etf = c.etf_summary_history("BTC", "US", limit=1)[0]
flow = btc_etf["total_net_inflow"]
direction = "inflow" if flow > 0 else "outflow"
brief.append(f"US BTC ETFs saw ${abs(flow)/1e6:.1f}M net {direction} yesterday; "
             f"cumulative net inflow now ${btc_etf['cum_net_inflow']/1e9:.2f}B.")

# 3. SSI MAG7 performance
mag7 = c.index_market_snapshot("ssimag7")
brief.append(f"MAG7.ssi index at ${mag7['price']:.2f}, "
             f"7-day ROI {mag7['7day_roi']:+.2%}, YTD {mag7['ytd']:+.2%}.")

# 4. Top 3 hot news
hot = c.hot_news(page_size=3)
for n in hot["list"]:
    brief.append(f"- {n['title']}")

# 5. BTC treasury purchase (latest)
mstr = c.btc_purchase_history("MSTR", limit=1)[0]
brief.append(f"MicroStrategy added {mstr['btc_acq']} BTC on {mstr['date']} "
             f"at avg cost ${mstr['avg_btc_cost']:,.0f}; "
             f"now holds {mstr['btc_holding']:,} BTC.")

print("\n".join(f"• {b}" for b in brief))
# Feed `brief` to your LLM for final polishing.
```

---

## 19. Hackathon Angles — "How to Win Using This Stack"

### 19.1 What hackathon judges actually reward

Based on the SoSoValue Buildathon track record and general Web3 hackathon norms, judges tend to reward:
1. **Working, end-to-end demo** — even if simple, a 60-second live demo beats a 30-slide deck.
2. **Integration depth** — using 3+ data modules from the SoSoValue API, not just `/currencies`.
3. **AI agent loop** — perception (read API) → reasoning (LLM) → action (post to a channel, place an order on SoDEX, mint an SSI token).
4. **Cross-pillar play** — combining SoSoValue data + SoDEX trading + SSI index in one product. Almost no team does this and judges love it.
5. **Originality** — avoid Yet Another Portfolio Tracker.

### 19.2 High-leverage hackathon ideas (ranked by leverage)

| # | Idea | Why it wins | Stack |
|---|---|---|---|
| 1 | **"AI Macro Whisperer"** — an agent that correlates SoSoValue macro events + ETF flows + news clusters and produces a daily trade signal, then optionally executes on SoDEX perps. | Cross-pillar (data + news + trading). Judges love a closed-loop agent. | SoSoValue API (Macro, ETF, Feeds) → LLM → SoDEX Perps API |
| 2 | **"SSI Robo-Advisor"** — a chat interface that asks the user 3 questions (risk tolerance, time horizon, view on AI vs BTC) and recommends an SSI index allocation. One-click mint on SSI Protocol. | Brings real value to retail. SSI mint is a single on-chain tx. | SoSoValue Index API → SSI Protocol contracts → ValueChain EVM |
| 3 | **"Liquidity Vacuum Detector"** — poll `/currencies/{id}/pairs` for `cost_to_move_up_usd` / `cost_to_move_down_usd` anomalies; alert when order-book depth thins out across exchanges; surface as a Slack/Discord bot. | SoSoValue exposes a unique depth metric no one else uses. Quants will respect it. | SoSoValue API (Pairs) → anomaly detection → Discord webhook |
| 4 | **"Airdrop Hunter Agent"** — track BTC-treasury companies' purchase history; alert when a new public company starts accumulating BTC (early signal for stock rerating). | Combines BTC Treasuries + Crypto Stocks modules. Useful for traders. | SoSoValue API (BTC Treasuries, Crypto Stocks) → alert |
| 5 | **"Token-Unlock Pressure Indicator"** — aggregate `token_economics.unlock_timeline` across the top 100 tokens; compute "USD of unlocks in the next 7 days" and overlay on a price chart. | No one else surfaces this in one chart. Pure alpha. | SoSoValue API (Token Economics, Currency) → chart |
| 6 | **"News Sentiment → Index Drift"** — for each SSI index, correlate the weighted news sentiment of its constituents against the index NAV drift. Show "alpha vs news sentiment" chart. | Demonstrates creative use of `index_constituents` + `news` modules. | SoSoValue API (Index, Feeds) → sentiment model → chart |
| 7 | **"DCA into SSI via SoDEX Vault"** — a smart contract that takes USDC, swaps into MAG7.ssi via SoDEX spot, and deposits into the sMAG7.ssi vault for dual yield. | Showcases composable DeFi on ValueChain. | SoDEX Spot API + SSI staking + ValueChain EVM |
| 8 | **"Real-User Probability Airdrop Lens"** — SoSoValue runs a "Real-User Probability test" for airdrop eligibility; build a tool that explains to users what behaviours increase their probability. | Community tool. Drives signups. | SoSoValue announcements + community Discord |
| 9 | **"Buildathon Dashboard"** — a real-time dashboard for the hackathon itself: show SSI TVL, SoDEX volume, $SOSO price, news mentions of "sosovalue buildathon". | Pure flex; useful for the closing ceremony. | All SoSoValue APIs + SoDEX WS |
| 10 | **"RWA Index on top of Crypto Stocks"** — create your own index token that wraps MSTR + COIN + TSLA + MARA based on SoSoValue's crypto-stocks sector data; expose via an ERC-20 on Base. | Demonstrates the SSI pattern extended to a new vertical. | SoSoValue API (Crypto Stocks) + custom ERC-20 |

### 19.3 Fastest implementation path (24-hour hackathon)

1. **Hour 0–2**: Get a SoSoValue API key (request immediately — manual approval). While waiting, scaffold the project.
2. **Hour 2–4**: Implement the Python client (§18.1) against your local SoSoValue data.
3. **Hour 4–8**: Build the data layer — pull currency, ETF, news, index data; cache in SQLite or DuckDB.
4. **Hour 8–14**: Build the LLM agent loop — use OpenAI / Anthropic / local Ollama. Prompt template: "Given this market snapshot and these 3 hot news items, output a 3-bullet trade thesis."
5. **Hour 14–20**: Build the action layer — either post to a Discord/Slack webhook (easy), or place a paper-trade order on SoDEX testnet (harder, requires EIP-712 signing — see `02_SODEX_MASTER_REFERENCE.md`).
6. **Hour 20–24**: Polish the demo. Record a 60-second Loom. Write a 1-page README.

### 19.4 Safest architecture

For a production-grade project (not just hackathon):
- Frontend: Next.js + Tailwind (matches the SoSoValue / SoDEX aesthetic).
- Backend: Python FastAPI or Node Express. Wrap the SoSoValue API behind your own cache to avoid burning the 100k/month quota.
- Cache: Redis with 30s TTL (matches the fastest documented update frequency).
- Time-series: DuckDB or ClickHouse for klines / historical data.
- LLM: OpenAI gpt-4o-mini for cost, or Claude Haiku for speed.
- Secrets: store `SOSO_API_KEY` in a vault, never in client-side code.

### 19.5 Most agent-friendly architecture

If you are building an AI agent:
- Use **function-calling** with the SoSoValue API as a tool. Define each endpoint as a JSON-schema function.
- Have the agent call `list_currencies` and `list_indices` once at startup to populate its context with available tickers.
- Use `search_news` for keyword-driven news retrieval (better than paging through `/news`).
- Have the agent maintain a rolling 7-day window of news locally (since the API caps at 7 days).
- For actions, use the SoDEX Go SDK pattern (see `02_SODEX_MASTER_REFERENCE.md` §8) — sign with a dedicated API key, never the master wallet.

### 19.6 Most impressive integrations (for the demo)

- Display a live SSI MAG7 price ticker (updates every 30s via `/indices/ssimag7/market-snapshot`).
- Show real-time US BTC ETF net flows (updates every 1 minute via `/etfs/summary-history`).
- Stream hot news as it lands (poll `/news/hot` every 30 seconds).
- Overlay your LLM's "Bull/Bear score" on the price chart.

### 19.7 Features nobody builds (gap analysis)

- A **backtester** that uses SoSoValue's historical klines (limited to 3 months, but enough for a hackathon demo).
- A **cross-index arbitrage scanner** — compare MAG7.ssi NAV vs the weighted sum of its constituents' spot prices.
- A **crypto-stock / BTC correlation** tool — overlay MSTR vs BTC, TSLA vs BTC, etc.
- A **fundraising heatmap** — show which sectors are raising most money this month, by counting `/fundraising/projects` results.
- A **macro event → BTC reaction** study — poll `/macro/events` and correlate with BTC ETF flows.

### 19.8 SoSoValue's own Buildathon

SoSoValue runs its own "Buildathon" with a $10,000 grant pool. Track it at https://luma.com/soSoValue-buildathon and the kickoff workshop at https://www.youtube.com/watch?v=EMQXuf8n9m4. The Buildathon explicitly encourages the cross-pillar play described above.

Source: Buildathon Luma page | https://luma.com/soSoValue-buildathon | 2026-07-05
Source: Buildathon YouTube kickoff | https://www.youtube.com/watch?v=EMQXuf8n9m4 | 2026-07-05

---

## 20. Open Questions / Gaps in Documentation

Things the official docs do NOT clearly document. Each is a research opportunity for an enterprising developer.

1. **WebSocket API for consumer data** — does one exist internally? The homepage "real-time" experience suggests polling; if a WS exists, it's not public.
2. **Historical data > 3 months** — the API caps klines at 3 months and ETF history at 1 month. Is there a paid tier that unlocks longer history? The developer dashboard doesn't show pricing tiers.
3. **Scoped API keys** — error code `400301 Insufficient permissions` exists, but no UI to create scoped keys.
4. **Webhooks** — none documented. Polling is the only option.
5. **Webhook for news clusters** — when a new cluster forms, can the platform push a notification? Not documented.
6. **Internal AI / LLM API** — SoSoValue clearly uses AI internally; is there a paid "AI insights" endpoint? Not documented.
7. **Index methodology** — the API exposes index *constituents and weights* but not the *rebalancing rules* or *inclusion criteria*. See `03_SSI_PROTOCOL_MASTER_REFERENCE.md` for the on-chain side.
8. **Rate-limit increase process** — can a paying customer get more than 100k req/month? Not documented.
9. **Sandbox / test environment** — there is no SoSoValue-data sandbox; the only test environment in the ecosystem is SoDEX testnet (`testnet-gw.sodex.dev`), which doesn't mirror the data API.
10. **Official SDKs** — none exist. See §6.2.
11. **Token-list published by SoSoValueLabs/ethereum-optimism.github.io fork** — what exactly is in it? Probably the SSI / SOSO token lists for Base and OP-stack chains. Worth auditing.
12. **The DefiLlama adapters** — what metrics do they expose that the public API doesn't? Worth diffing against the API.

---

## 21. Source Index (deduplicated URLs)

### SoSoValue official

- https://sosovalue.com
- https://m.sosovalue.com
- https://m.sosovalue.com/developer
- https://m.sosovalue.com/developer/dashboard
- https://m.sosovalue.com/blog
- https://m.sosovalue.com/announcement
- https://m.sosovalue.com/research
- https://m.sosovalue.com/research/research
- https://m.sosovalue.com/research/tweets
- https://m.sosovalue.com/assets/fundraising
- https://m.sosovalue.com/assets/etf/us-eth-spot
- https://m.sosovalue.com/assets/cryptoindex/ssi-index-management
- https://m.sosovalue.com/sectors/rwa
- https://m.sosovalue.com/person/fan-zhang-1844232517669834753
- https://m.sosovalue.com/scholarship-s1-community-vote
- https://m.sosovalue.com/sososcholar/post/1959823181995114497
- https://m.sosovalue.com/sososcholar/post/1983348343236149249
- https://m.sosovalue.com/coins/sosovalue

### SoSoValue API docs (GitBook)

- https://sosovalue-1.gitbook.io/sosovalue-api-doc
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/readme.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/authentication.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/setting-up-your-api-key.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/query-modes.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/response-format.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/rate-limit.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/error-responses.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/endpoint-overview.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/llms.txt
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/currency.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/list.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/info.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/market-snapshot.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/token-economics.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/klines.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/supply.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/pairs.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/sector-spotlight.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/fundraising.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/etf.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/summary-history.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/list.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/market-snapshot.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/history.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/index.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/list.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/constituents.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/market-snapshot.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/klines.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/4.-crypto-stocks/crypto-stocks.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/4.-crypto-stocks/list.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/4.-crypto-stocks/market-snapshot.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/4.-crypto-stocks/market-cap.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/4.-crypto-stocks/klines.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/4.-crypto-stocks/sector.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/4.-crypto-stocks/sector-index.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/5.-btc-treasuries/btc-treasuries.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/5.-btc-treasuries/list.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/5.-btc-treasuries/purchase-history.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/feeds.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/news.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/hot-news.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/featured-news.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/search.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/7.-fundraising/fundraising.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/7.-fundraising/projects.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/7.-fundraising/project-detail.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/8.-macro/macro.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/8.-macro/events.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/8.-macro/event-history.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/9.-analysis-charts/analysis.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/9.-analysis-charts/list.md
- https://sosovalue-1.gitbook.io/sosovalue-api-doc/9.-analysis-charts/chart-data.md

### Whitepaper

- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper
- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/5.-sosovalue-indexes-new-approach-to-passive-crypto-investment-for-the-masses/5.1-ssi-protocol-overview
- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.1-soso-token
- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/8.-tokennomics/8.2-tokenomics
- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/9.-resources/9.2-audits
- https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper/9.-resources/9.3-micar-whitepaper
- https://sosovalue.gitbook.io/sosovalue-indices/resources/terms-of-use

### SSI ecosystem

- https://ssi.sosovalue.com
- https://ssi.sosovalue.com/soso-token
- https://ssi.sosovalue.com/earn
- https://ssi.sosovalue.com/reward
- https://ssi.sosovalue.com/buy/MAG7.ssi
- https://ssi.sosovalue.com/buy/DEFI.ssi

### GitHub

- https://github.com/SoSoValueLabs
- https://github.com/SoSoValueLabs/ssi-protocol
- https://github.com/SoSoValueLabs/DefiLlama-Adapters
- https://github.com/SoSoValueLabs/dimension-adapters
- https://github.com/SoSoValueLabs/ethereum-optimism.github.io
- https://github.com/im-hanzou/sosovalue-autoref
- https://github.com/ahlulmukh/sosovalue-autoreff
- https://github.com/mamangzed/sosovalue
- https://github.com/MeoMunDep/SoSoValue

### Token contracts / explorers

- https://etherscan.io/address/0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d
- https://basescan.org/token/0x624e2e7fdc8903165f64891672267ab0fcb98831
- https://ethplorer.io/address/0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d

### Mobile apps

- https://apps.apple.com/us/app/sosovalue-crypto-tracker/id6739542818
- https://play.google.com/store/apps/details?id=com.sosovalue.app
- https://play.google.com/store/apps/developer?id=SoSoValue+Labs

### Socials / community

- https://x.com/SoSoValueCrypto
- https://x.com/SoSoValueCrypto/highlights
- https://x.com/SoSoValueCrypto/article/2039590198963757325 (Community Call #1 AMA Recap)
- https://x.com/SoSoValueCrypto/status/1876997896803078208
- https://x.com/SoSoValueCrypto/status/1893519626157597134
- https://x.com/SoSoValueCrypto/status/1976617412889112693
- https://x.com/SoSoValueCrypto/status/2017935518206509445
- https://x.com/SoSoValueCrypto/status/2047669672380895427
- https://x.com/SoSoValueCrypto/status/2048963495493091362 (Buildathon kickoff)
- https://x.com/SoSoValueCrypto/status/2066722408070082694
- https://x.com/SoSoValueCrypto/status/2072216444566393243
- https://x.com/SoSoValueCrypto/status/2072626397668061562
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
- https://sg.linkedin.com/company/sosovalue
- https://sg.linkedin.com/in/may-wang-689102313
- https://sg.linkedin.com/in/jess-l-1a06a1316
- https://sg.linkedin.com/in/jessie-l-5aaba626
- https://www.linkedin.com/posts/sosovalue_soso-value-your-one-stop-financial-research-activity-7170546226612883456-zO2-

### Press / third-party

- https://fortune.com/crypto/2025/01/08/crypto-data-platform-sosovalue-funding-multi-coin-indices
- https://www.theblock.co/post/333620/sosovalue-funding-valuation
- https://www.theblock.co/post/335380/sosovalue-token-airdrop-launch
- https://www.globenewswire.com/news-release/2025/01/08/3006098/0/en/ai-driven-crypto-research-platform-sosovalue-raises-15-million-series-a-to-launch-the-investible-spot-index-protocol-ssi.html
- https://www.globenewswire.com/news-release/2025/12/03/3198540/0/en/onepiece-labs-solana-and-sosovalue-launched-expanded-ai-web3-university-tour-series-following-record-fall-2025-run.html
- https://www.eqs-news.com/news/corporate/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token/65d8ce6c-526d-4242-8856-422e4d86dc17_en
- https://decrypt.co/346354/sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token
- https://finance.yahoo.com/news/sosovalue-raised-4-15m-seed-110000516.html
- https://finance.yahoo.com/news/crypto-data-platform-sosovalue-raises-120000055.html
- https://www.finsmes.com/2025/01/sosovalue-raises-15m-in-series-a-funding.html
- https://www.financemagnates.com/thought-leadership/sosovalue-raises-415m-seed-funding-for-its-crypto-research-platform
- https://beincrypto.com/sosovalue-raises-15-million
- https://coinpedia.org/information/sosovalue-launches-ssi-protocol-after-15m-series-a-funding
- https://www.panewslab.com/en/articles/kqopya0d
- https://www.binance.com/en/price/sosovalue
- https://www.binance.com/en/square/post/18798919363313
- https://www.binance.com/en/square/post/19550762011602
- https://www.binance.com/en/square/post/20510378167193
- https://www.binance.com/en/square/post/318737046006289
- https://www.binance.com/en/square/post/35869624579810
- https://www.binance.com/en/square/post/35901944783642
- https://www.bybit.com/en/price/sosovalue
- https://www.bybit.com/en/trade/spot/SOSO/USDT
- https://www.bybit.com/trade/usdt/SOSOUSDT
- https://announcements.bybit.com/en/article/bybit-now-supports-soso-deposits-on-valuechain-blt1d9fec7edeb582b6
- https://www.prnewswire.com/apac/news-releases/the-vip-advantage-bybit-partners-with-sosovalue-to-issue-vip-exclusive-daily-industry-report-302424438.html
- https://www.okx.com/en-us/price/sosovalue-soso
- https://www.kraken.com/convert/soso
- https://biconomy.zendesk.com/hc/en-us/articles/52603462432025-Biconomy-com-New-Listing-SoSoValue-SOSO-for-Spot-Trading
- https://www.coinbase.com/price/sosovalue
- https://www.coingecko.com/en/coins/sosovalue
- https://coinmarketcap.com/currencies/sosovalue
- https://coinmarketcap.com/cmc-ai/sosovalue/what-is
- https://coinmarketcap.com/cmc-ai/sosovalue/latest-updates
- https://coinmarketcap.com/currencies/sosovalue/historical-data
- https://messari.io/project/sosovalue
- https://messari.io/project/sosovalue/charts/market/risk
- https://messari.io/project/sosovalue/charts/investor-activity
- https://messari.io/project/sosovalue/news
- https://messari.io/project/sosovalue/more
- https://defillama.com/protocol/sosovalue
- https://defillama.com/protocol/sosovalue-indexes
- https://defillama.com/protocol/sosovalue-basis
- https://dune.com/dannytrump/soso-dashboard
- https://cryptorank.io/ico/sosovalue
- https://cryptorank.io/price/sosovalue
- https://cryptorank.io/news/feed/24eee-sosovalue-publishes-data-bybit-proof-feature
- https://cryptorank.io/news/feed/d65d7-upbit-chip-listing-south-korea
- https://www.crunchbase.com/organization/sosovalue
- https://www.crunchbase.com/funding_round/sosovalue-series-a--8d1c1bca
- https://www.crunchbase.com/funding_round/sosovalue-seed--40a43550
- https://www.crunchbase.com/organization/sosovalue/financial_details
- https://tracxn.com/d/companies/sosovalue/__Tx0FsQYR_YrY2mkk2pbdb5pVOwP6idiQIrvhw8Q0bA4
- https://www.rootdata.com/projects/detail/SoSoValue?k=MTA1NDk%3D
- https://www.rootdata.com/projects/detail/SoDEX?k=MTkxOTA%3D
- https://www.rootdata.com/news/529885
- https://tokenomist.ai/sosovalue/unlock-events
- https://dropstab.com/coins/sosovalue/vesting
- https://icoanalytics.org/projects/sosovalue
- https://icoanalytics.org/funds/hongshan-ex-sequoia-china
- https://www.bitget.com/news/detail/12560604870009
- https://www.bitget.com/crypto-widgets/telegram-apps/sosovalue
- https://www.tradingview.com/news/eqs:c3d6c2968094b:0-sosovalue-incubated-sodex-launches-mainnet-on-l1-valuechain-soso-token-upgrades-to-native-gas-and-governance-token
- https://www.tradingview.com/news/coinmarketcal:65fe7a5bf094b:0-sosovalue-community-ama-31-march-2026
- https://coinmarketcal.com/en/coin/sosovalue
- https://airdrops.io/sosovalue
- https://web3.gate.com/crypto-wiki/article/sosovalue-airdrop-complete-guide-to-claiming-free-soso-tokens-20260108
- https://www.gate.com/learn/articles/what-is-so-so-value/6463
- https://www.gate.com/learn/articles/soso-overview/5995
- https://phemex.com/academy/what-is-sosovalue-soso
- https://www.cube.exchange/what-is/soso
- https://cryptototem.com/sosovalue-soso
- https://markets.coinpedia.org/sosovalue
- https://webcatalog.io/en/apps/sosovalue
- https://medium.com/@gwrx2005/comparative-analysis-of-ai-frameworks-in-sosovalue-and-arkham-platforms-995c3b2db1e8
- https://app.akindo.io/wave-hacks/JBEQXgN4Zi2jA3wA
- https://luma.com/soSoValue-buildathon
- https://www.coingecko.com/en/exchanges/upbit
- https://www.coingecko.com/learn/what-is-dune-analytics-and-how-to-use-it
- https://assets-cms.kraken.com/files/51n36hrp/facade/fd707339600f9aed634e6a651d5ac8c2f746f4d9.pdf
- https://www.esma.europa.eu/sites/default/files/2024-12/OTHER.csv

---

*End of `01_SOSOVALUE_MASTER_REFERENCE.md`. Continue with `02_SODEX_MASTER_REFERENCE.md` for the SoDEX DEX + ValueChain L1 deep dive, and `03_SSSI_PROTOCOL_MASTER_REFERENCE.md` for the SSI Protocol contract-level deep dive.*
