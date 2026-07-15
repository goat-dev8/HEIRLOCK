export type WealthMode = "alive" | "guardian" | "heir";

export type SkillId =
  | "family_office"
  | "research"
  | "macro"
  | "etf"
  | "portfolio"
  | "risk"
  | "ssi"
  | "sodex"
  | "yield"
  | "treasury"
  | "execution"
  | "guardian"
  | "estate"
  | "tax"
  | "market_monitor"
  | "news"
  | "alert"
  | "memory"
  | "continuity";

export type SkillPermission =
  | "read"
  | "propose"
  | "execute"
  | "relay"
  | "attest";

export interface SkillDefinition {
  id: SkillId;
  name: string;
  description: string;
  enabled: boolean;
  modes: WealthMode[];
  permissions: SkillPermission[];
  tools: string[];
  catalogPath?: string;
}

const BUILTIN: SkillDefinition[] = [
  {
    id: "family_office",
    name: "Family Office",
    description:
      "Flagship Skill. Orchestrates Terminal → Partner → SSI → SoDEX → ValueChain into one Living Loop.",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read", "propose", "execute", "relay", "attest"],
    tools: [
      "fo.living_loop",
      "fo.brief",
      "soso.news",
      "soso.etf",
      "soso.macro",
      "ssi.snapshot",
      "sodex.portfolio",
      "policy.check",
      "partner.debate",
      "partner.memory",
    ],
    catalogPath: "skills/family_office/SKILL.md",
  },
  {
    id: "research",
    name: "Research",
    description: "SoSoValue Terminal synthesis: ETF, news, and macro in one cited layer.",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read", "propose"],
    tools: ["soso.news", "soso.etf", "soso.macro", "ai.chat"],
    catalogPath: "skills/research/SKILL.md",
  },
  {
    id: "macro",
    name: "Macro",
    description: "Macro calendar and event correlation against open theses.",
    enabled: true,
    modes: ["alive", "guardian"],
    permissions: ["read", "propose"],
    tools: ["soso.macro"],
    catalogPath: "skills/macro/SKILL.md",
  },
  {
    id: "etf",
    name: "ETF",
    description: "ETF flow history and Terminal index drift for allocation signals.",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read", "propose"],
    tools: ["soso.etf", "ssi.snapshot"],
    catalogPath: "skills/etf/SKILL.md",
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Per-wallet SoDEX holdings and SSI exposure with living narrative.",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read"],
    tools: ["sodex.portfolio", "ssi.index", "fo.partner.portfolio"],
    catalogPath: "skills/portfolio/SKILL.md",
  },
  {
    id: "risk",
    name: "Risk",
    description: "Policy caps, preflight verdicts, and continuity gates before execution.",
    enabled: true,
    modes: ["alive", "guardian"],
    permissions: ["read", "propose"],
    tools: ["policy.check", "fo.partner.gate"],
    catalogPath: "skills/risk/SKILL.md",
  },
  {
    id: "ssi",
    name: "SSI",
    description: "SSI index analytics plus whitepaper-verified Base contracts.",
    enabled: true,
    modes: ["alive", "guardian"],
    permissions: ["read", "propose"],
    tools: ["ssi.constituents", "ssi.snapshot", "ssi.config"],
    catalogPath: "skills/ssi/SKILL.md",
  },
  {
    id: "sodex",
    name: "SoDEX",
    description: "Markets, verify, and portfolio reads on the SoDEX execution venue.",
    enabled: true,
    modes: ["alive", "guardian"],
    permissions: ["read"],
    tools: ["sodex.verify", "sodex.portfolio", "sodex.markets"],
  },
  {
    id: "execution",
    name: "Execution",
    description: "User-signed SoDEX relay under on-chain and server policy.",
    enabled: true,
    modes: ["alive"],
    permissions: ["propose", "relay", "execute"],
    tools: ["sodex.relay"],
    catalogPath: "skills/execution/SKILL.md",
  },
  {
    id: "treasury",
    name: "Treasury",
    description: "Stable sleeve monitoring and rebalance proposals.",
    enabled: true,
    modes: ["alive", "guardian"],
    permissions: ["read", "propose"],
    tools: ["sodex.portfolio", "ssi.snapshot", "policy.check"],
    catalogPath: "skills/treasury/SKILL.md",
  },
  {
    id: "market_monitor",
    name: "Market Monitor",
    description: "Background pulse, snapshots, and what-changed digests for Partner.",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read", "propose"],
    tools: ["fo.partner.changed", "fo.partner.radar", "fo.partner.pulse"],
    catalogPath: "skills/market_monitor/SKILL.md",
  },
  {
    id: "news",
    name: "News",
    description: "Hot news ingestion for timely thesis pressure and falsify triggers.",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read", "propose"],
    tools: ["soso.news"],
    catalogPath: "skills/news/SKILL.md",
  },
  {
    id: "alert",
    name: "Alert",
    description: "Falsify alerts, gate failures, and policy breach surfacing.",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read", "propose"],
    tools: ["fo.partner.falsify", "fo.partner.gate", "guardian.alert"],
    catalogPath: "skills/alert/SKILL.md",
  },
  {
    id: "memory",
    name: "Memory",
    description: "Investment theses, decisions, and HIT/STOP/DRIFT learning.",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read", "propose", "attest"],
    tools: ["partner.memory", "partner.thesis", "save_thesis", "fo.partner.learning"],
    catalogPath: "skills/memory/SKILL.md",
  },
  {
    id: "continuity",
    name: "Continuity",
    description: "Alive → Guardian → Heir modes on ValueChain with ActionLog proof.",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read", "propose", "attest"],
    tools: ["policy.check", "estate.sandbox", "guardian.simulate", "valuechain.action_log"],
    catalogPath: "skills/continuity/SKILL.md",
  },
  {
    id: "guardian",
    name: "Guardian",
    description: "Risk-off continuity when the principal cannot act.",
    enabled: true,
    modes: ["guardian", "alive"],
    permissions: ["read", "propose", "execute", "attest"],
    tools: ["guardian.alert", "guardian.simulate"],
    catalogPath: "skills/guardian/SKILL.md",
  },
  {
    id: "yield",
    name: "Yield",
    description: "SSI earn and yield sleeve opportunities.",
    enabled: true,
    modes: ["alive", "guardian"],
    permissions: ["read", "propose"],
    tools: ["ssi.snapshot", "sodex.portfolio"],
  },
  {
    id: "estate",
    name: "Estate",
    description: "Heir continuity planning and estate sandbox.",
    enabled: true,
    modes: ["heir", "alive"],
    permissions: ["read", "attest"],
    tools: ["estate.sandbox"],
  },
  {
    id: "tax",
    name: "Tax",
    description: "Tax lot helpers and reporting exports.",
    enabled: false,
    modes: ["alive", "heir"],
    permissions: ["read"],
    tools: [],
  },
];

export class SkillRegistry {
  private skills = new Map<SkillId, SkillDefinition>();

  constructor(defs: SkillDefinition[] = BUILTIN) {
    for (const d of defs) this.skills.set(d.id, { ...d });
  }

  list(): SkillDefinition[] {
    return [...this.skills.values()];
  }

  get(id: SkillId): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  setEnabled(id: SkillId, enabled: boolean) {
    const s = this.skills.get(id);
    if (!s) throw new Error(`Unknown skill ${id}`);
    s.enabled = enabled;
  }

  visibleTools(mode: WealthMode): string[] {
    const tools = new Set<string>();
    for (const s of this.skills.values()) {
      if (!s.enabled) continue;
      if (!s.modes.includes(mode)) continue;
      for (const t of s.tools) tools.add(t);
    }
    return [...tools];
  }
}

export class PermissionKernel {
  constructor(private readonly registry: SkillRegistry) {}

  can(
    skillId: SkillId,
    permission: SkillPermission,
    mode: WealthMode,
    overrides?: Map<SkillId, boolean>,
  ): { ok: boolean; reason?: string } {
    const skill = this.registry.get(skillId);
    if (!skill) return { ok: false, reason: "unknown_skill" };
    const enabled = overrides?.has(skillId) ? overrides.get(skillId)! : skill.enabled;
    if (!enabled) return { ok: false, reason: "skill_disabled" };
    if (!skill.modes.includes(mode)) return { ok: false, reason: "mode_blocked" };
    if (!skill.permissions.includes(permission)) {
      return { ok: false, reason: "permission_denied" };
    }
    return { ok: true };
  }
}

export type SkillEvent = {
  skillId: SkillId;
  eventType: string;
  payload: unknown;
  at: number;
};

export class SkillEventBus {
  private listeners = new Map<string, Array<(e: SkillEvent) => void>>();
  private history: SkillEvent[] = [];

  on(eventType: string, fn: (e: SkillEvent) => void) {
    const list = this.listeners.get(eventType) ?? [];
    list.push(fn);
    this.listeners.set(eventType, list);
  }

  emit(skillId: SkillId, eventType: string, payload: unknown) {
    const event: SkillEvent = { skillId, eventType, payload, at: Date.now() };
    this.history.push(event);
    if (this.history.length > 500) this.history.shift();
    for (const fn of this.listeners.get(eventType) ?? []) fn(event);
    for (const fn of this.listeners.get("*") ?? []) fn(event);
  }

  recent(limit = 50) {
    return this.history.slice(-limit);
  }
}

export function createSkillsOs() {
  const registry = new SkillRegistry();
  const permissions = new PermissionKernel(registry);
  const events = new SkillEventBus();
  return { registry, permissions, events };
}
