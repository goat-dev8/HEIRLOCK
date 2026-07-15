# News Skill

SoSoValue hot news ingestion for timely Partner context.

## Description

Dedicated news layer for headline-driven thesis pressure and falsify triggers.

## Capabilities

- Hot news feed with pagination
- News-to-thesis relevance in Partner chat
- Citation chips on assistant messages

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `page_size` | 10 | Default fetch size |

## Tool bindings

`soso.news`, `ai.chat`

## Schema

```json
{ "skillId": "news", "permissions": ["read", "propose"] }
```

## Examples

Research page live feed and Partner tool call during "what changed since yesterday?"

## Architecture

SoSoValue news API → News Skill → Research UI + FO AI `soso_news` tool
