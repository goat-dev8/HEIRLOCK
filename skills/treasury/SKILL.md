# Treasury Skill

Treasury sleeve and cash-equivalent management.

## Description

Monitors stable balances, SSI earn opportunities, and treasury allocation bands relative to policy targets.

## Capabilities

- Stable balance aggregation across SoDEX
- SSI earn route awareness
- Band rebalance proposals via Living Loop
- Yield sleeve reporting on Wealth

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `target_stable_pct` | policy-derived | From wealth policy row |

## Tool bindings

`sodex.portfolio`, `ssi.snapshot`, `policy.check`

## Schema

```json
{ "skillId": "treasury", "permissions": ["read", "propose"] }
```

## Examples

"Trim spot exposure, increase SSI stable sleeve" proposal with cited balances.

## Architecture

Portfolio reads → Treasury Skill → Living Loop proposal → User approval
