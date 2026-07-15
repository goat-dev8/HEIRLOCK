# Risk Skill

Policy, notional caps, and kill-switch enforcement.

## Description

Enforces wealth policy before every propose and relay action. Reads ValueChain WealthPolicy when configured, plus server-side caps and continuity gates.

## Capabilities

- Preflight verdict on Living Loop proposals
- Notional cap checks per wallet
- Kill-switch and allowlist validation
- Guardian mode execution restrictions

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `max_notional_usd` | env + on-chain | Effective cap is minimum of layers |

## Tool bindings

`policy.check`, `guardian.simulate`, `fo.partner.gate`

## Schema

```json
{ "skillId": "risk", "permissions": ["read", "propose"] }
```

## Examples

Approve blocked when debate not complete or Guardian mode restricts relay.

## Architecture

WealthPolicy.sol + Prisma wealth_policies → Risk Skill → Execution Skill gate
