# Market Monitor Skill

Continuous market surveillance for Partner pulse.

## Description

Background monitoring of tickers, drift, and falsify conditions. Powers the "while you were away" Partner brief.

## Capabilities

- Market snapshot persistence per wallet
- What-changed digest vs prior session
- Opportunity and pressure radar
- Cron-driven partner pulse integration

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `snapshot_ttl_sec` | 86400 | Daily market snapshot |

## Tool bindings

`fo.partner.changed`, `fo.partner.radar`, `fo.partner.pulse`, `soso.etf`

## Schema

```json
{ "skillId": "market_monitor", "permissions": ["read", "propose"] }
```

## Examples

User opens Partner; headline reflects overnight MAG7 move without manual refresh.

## Architecture

Cron partner-pulse → Market Monitor → market_snapshots table → Partner brief cache
