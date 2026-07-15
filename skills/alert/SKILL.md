# Alert Skill

Actionable alerts from falsify engine and policy breaches.

## Description

Surfaces broken theses, under-pressure positions, and policy gate failures as first-class UI alerts on Partner.

## Capabilities

- Falsify alert aggregation
- Partner gate status (debate required, mode blocked)
- Push-style banners on Living page
- Alert history in timeline

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `severity_threshold` | medium | Minimum severity to surface |

## Tool bindings

`fo.partner.falsify`, `fo.partner.gate`, `guardian.alert`

## Schema

```json
{ "skillId": "alert", "permissions": ["read", "propose"] }
```

## Examples

Red "Needs your attention" card when a thesis fails falsify check.

## Architecture

Partner intel falsify → Alert Skill → Partner UI + optional MCP `partner_alerts`
