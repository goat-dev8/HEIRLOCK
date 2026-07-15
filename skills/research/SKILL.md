# Research Skill

SoSoValue Terminal synthesis for institutional-grade market intelligence.

## Description

Pulls ETF flows, hot news, and macro context from SoSoValue OpenAPI. Feeds the Investment Partner and Living Loop with LIVE-cited evidence.

## Capabilities

- ETF summary history (BTC and configurable symbols)
- Hot news feed with relevance ranking
- Cross-asset narrative synthesis via Partner chat
- Citation enforcement (LIVE vs UNAVAILABLE)

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Toggle in Skills registry |
| `modes` | alive, guardian, heir | Read-only in heir mode |
| `cache_ttl_sec` | 60 | Terminal snapshot cache |

## Tool bindings

`soso.news`, `soso.etf`, `soso.macro`, `ai.chat`

## Schema

```json
{
  "skillId": "research",
  "permissions": ["read", "propose"],
  "dataSources": ["sosovalue.openapi"]
}
```

## Examples

"What changed in BTC ETF flows this week?" → `soso_etf` tool with Terminal citation.

## Architecture

SoSoValue OpenAPI → Research Skill → Permission Kernel → Partner AI tools → Living Loop citations
