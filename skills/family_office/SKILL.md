# Family Office Skill

Flagship orchestrator for the HEIRLOCK Living Loop on SoSoValue.

## Description

Composes Terminal research, Investment Partner reasoning, SSI allocation signals, SoDEX execution, and ValueChain continuity into one daily decision surface. Enabled by default for every wallet.

## Capabilities

- Daily Living Loop brief with cited proposal and preflight
- Partner pulse while away (thesis re-score, auto-challenge)
- Adversarial debate gate before Approve
- Decision timeline with HIT / STOP / DRIFT learning
- Evidence graph linking sources, memory, and policy

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Cannot be disabled without breaking the OS narrative |
| `modes` | alive, guardian, heir | Runs in all wealth modes |
| `pulse_interval` | cron + on-demand | Background partner pulse |

## Tool bindings

`fo.living_loop`, `fo.brief`, `soso.news`, `soso.etf`, `soso.macro`, `ssi.snapshot`, `sodex.portfolio`, `policy.check`, `partner.debate`, `partner.memory`

## Schema

```json
{
  "skillId": "family_office",
  "permissions": ["read", "propose", "execute", "relay", "attest"],
  "requiresAuth": true
}
```

## Examples

**Morning brief:** Partner loads Terminal drift, open theses, and SoDEX holdings, then proposes Hold / Allocate / Trade with citations.

**Challenge flow:** User taps Challenge; Counsel and Falsifier debate from live evidence; Moderator sets APPROVE | WAIT | CHALLENGE before wallet signature.

## Architecture

```
SoSoValue Terminal → Living Loop → Partner Memory → Debate → User → SoDEX relay → Fill proof → Learning
                                      ↓
                              ValueChain policy + ActionLog
```
