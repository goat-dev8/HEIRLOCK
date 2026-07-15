# Continuity Skill

Alive → Guardian → Heir wealth modes on ValueChain.

## Description

On-chain policy continuity: WealthPolicy, ModeController, ActionLog, AttestationRegistry, and ContinuityNFT. Non-custodial heirship without database-only promises.

## Capabilities

- Mode read from deployed ValueChain contracts
- Continuity gate before Approve
- ActionLog and attestation anchoring
- Heir sandbox and estate planning surface
- Continuity NFT soulbound marker

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `networks` | valuechain mainnet + testnet | Deployment artifacts in repo |

## Tool bindings

`policy.check`, `estate.sandbox`, `guardian.simulate`, `valuechain.action_log`, `valuechain.attest`

## Schema

```json
{
  "skillId": "continuity",
  "permissions": ["read", "propose", "attest"],
  "contracts": ["WealthPolicy", "ModeController", "ActionLog", "AttestationRegistry", "ContinuityNFT"]
}
```

## Examples

Continuity page shows Alive mode with on-chain policy cap; Guardian transition logged to ActionLog.

## Architecture

ValueChain EVM → Continuity Skill → Continuity UI + Risk/Execution gates
