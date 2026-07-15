# SSI Skill

SoSoValue Smart Stable Index analytics and Base contract truth.

## Description

Terminal index snapshots, constituent weights, and whitepaper-verified Base addresses. Mint, stake, and earn on the official SSI app; trade proxies on SoDEX.

## Capabilities

- Index snapshots (ssiMAG7, DEFI.ssi, etc.)
- Constituent breakdown
- Dual-source drift: Terminal index level vs on-chain token price
- Deep links to official SSI allocate flows

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `base_network` | Base mainnet | Contract address source of truth |

## Tool bindings

`ssi.constituents`, `ssi.snapshot`, `ssi.config`

## Schema

```json
{ "skillId": "ssi", "permissions": ["read", "propose"] }
```

## Examples

Living Loop proposes SSI allocate when MAG7 drift exceeds threshold.

## Architecture

SSI protocol (Base) + Terminal API → SSI Skill → Living Loop + Wealth SSI tab
