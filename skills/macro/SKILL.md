# Macro Skill

Macro calendar and event correlation from SoSoValue Terminal.

## Description

Surfaces scheduled macro events and correlates them with open theses and portfolio risk. Active in Alive and Guardian modes.

## Capabilities

- Macro calendar fetch with configurable horizon
- Event-to-thesis pressure mapping
- Guardian-mode risk-off overlays when volatility spikes

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Skills toggle |
| `modes` | alive, guardian | Blocked in heir read-only flows |
| `lookahead_days` | 14 | Calendar window |

## Tool bindings

`soso.macro`

## Schema

```json
{ "skillId": "macro", "permissions": ["read", "propose"] }
```

## Examples

Partner brief flags "CPI in 48h" against a MAG7 overweight thesis.

## Architecture

Terminal macro endpoint → Macro Skill → Living Loop preflight → Partner headline
