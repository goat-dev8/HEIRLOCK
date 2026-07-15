# Guardian Skill

Risk-off continuity when the principal cannot act.

## Description

Guardian mode reduces execution surface, simulates policy transitions, and coordinates with ValueChain ModeController and WealthPolicy.

## Capabilities

- Guardian entry simulation with on-chain mode read
- Alert surfacing on Continuity page
- Execution throttling in Guardian wealth mode
- Attestation hooks for mode transitions

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `modes` | guardian, alive | Prepare while still Alive |

## Tool bindings

`guardian.alert`, `guardian.simulate`, `policy.check`, `valuechain.mode`

## Schema

```json
{ "skillId": "guardian", "permissions": ["read", "propose", "execute", "attest"] }
```

## Examples

Flip to Guardian on Continuity; Partner stops proposing aggressive trades until mode clears.

## Architecture

ModeController.sol → Guardian Skill → Risk kernel → Execution block/allow
