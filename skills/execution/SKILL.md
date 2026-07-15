# Execution Skill

User-signed SoDEX relay under policy.

## Description

Non-custodial order preparation, EIP-712 signing, gateway relay, and fill reconciliation. HEIRLOCK never holds private keys.

## Capabilities

- Account verify and aid persistence
- Order prepare + place via user signature
- Fill proof from trades and balance deltas
- Order history reconciliation

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `modes` | alive only | Blocked in Guardian/Heir for new risk |

## Tool bindings

`sodex.relay`, `sodex.verify`, `sodex.markets`, `sodex.portfolio`

## Schema

```json
{ "skillId": "execution", "permissions": ["propose", "relay", "execute"] }
```

## Examples

Wealth trade tab: sign limit order → relay → fill proof badge on Activity.

## Architecture

User wallet EIP-712 → SoDEX gateway → Fill proof → Decision link → ActionLog anchor
