# Portfolio Skill

Unified holdings view across SoDEX and SSI.

## Description

Per-wallet portfolio bundle: SoDEX balances, open orders, recent trades, plus SSI index exposure from Terminal analytics.

## Capabilities

- SoDEX portfolio read (non-custodial, per-user aid)
- SSI index constituent weights
- Living portfolio narrative (allocation, risk, confidence shifts)
- Mark-to-market against Terminal index levels

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `environment` | mainnet | SoDEX environment selector |

## Tool bindings

`sodex.portfolio`, `ssi.index`, `fo.partner.portfolio`

## Schema

```json
{ "skillId": "portfolio", "permissions": ["read"] }
```

## Examples

Wealth tab holdings panel and Partner question "What matters most in my portfolio right now?"

## Architecture

SoDEX REST + SSI routes → Portfolio Skill → Wealth UI + Partner tools
