# Memory Skill

Investment Memory: theses, decisions, and learning.

## Description

Persistent investment beliefs with confidence scores, decision timeline, and HIT/STOP/DRIFT outcome feedback.

## Capabilities

- Thesis CRUD with status lifecycle
- Decision recording (approve, challenge, defer)
- Outcome linking to SoDEX fills
- AI context injection via `memoryContextForAI`
- Partner chat `save_thesis` tool

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | |
| `max_active_theses` | 50 | Soft cap per wallet |

## Tool bindings

`partner.memory`, `partner.thesis`, `partner.decision`, `save_thesis`, `fo.partner.learning`

## Schema

```json
{
  "skillId": "memory",
  "permissions": ["read", "propose", "attest"],
  "tables": ["investment_theses", "investment_decisions"]
}
```

## Examples

"Remember: hold MAG7 exposure through Q3 unless ETF outflows reverse."

## Architecture

Prisma memory models → Memory Skill → Partner AI + Debate agents + Learning engine
