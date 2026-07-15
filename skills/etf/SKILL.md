# ETF Skill

Dedicated SoSoValue ETF flow and summary-history analytics.

## Description

Deep ETF intelligence layer: spot ETF summaries, flow history, and drift signals that feed allocation decisions on SSI and SoDEX proxies.

## Capabilities

- Per-symbol ETF summary history
- Flow trend detection for Partner falsify alerts
- Terminal-level index vs on-chain SSI drift comparison

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Independent from Research for granular toggles |
| `default_symbol` | BTC | Primary flow monitor |

## Tool bindings

`soso.etf`, `ssi.snapshot`

## Schema

```json
{ "skillId": "etf", "permissions": ["read", "propose"] }
```

## Examples

"Are MAG7 ETF inflows still supporting my thesis?" → ETF history + SSI snapshot cross-check.

## Architecture

SoSoValue ETF API → ETF Skill → Drift engine → Partner opportunity radar
