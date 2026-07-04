export type WealthMode = "alive" | "guardian" | "heir";

export type SkillId =
  | "research"
  | "portfolio"
  | "risk"
  | "ssi"
  | "sodex"
  | "yield"
  | "macro"
  | "treasury"
  | "execution"
  | "guardian"
  | "estate"
  | "tax";

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
  /** Modes where this skill may run */
  modes: WealthMode[];
  permissions: SkillPermission[];
  tools: string[];
}

const BUILTIN: SkillDefinition[] = [
  {
    id: "research",
    name: "Research",
    description: "SoSoValue Terminal research synthesis",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read", "propose"],
    tools: ["soso.news", "soso.etf", "soso.macro", "ai.chat"],
  },
  {
    id: "macro",
    name: "Macro",
    description: "Macro calendar and event correlation",
    enabled: true,
    modes: ["alive", "guardian"],
    permissions: ["read", "propose"],
    tools: ["soso.macro"],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Per-user SoDEX + SSI portfolio views",
    enabled: true,
    modes: ["alive", "guardian", "heir"],
    permissions: ["read"],
    tools: ["sodex.portfolio", "ssi.index"],
  },
  {
    id: "risk",
    name: "Risk",
    description: "Policy, notional caps, kill switch",
    enabled: true,
    modes: ["alive", "guardian"],
    permissions: ["read", "propose"],
    tools: ["policy.check"],
  },
  {
    id: "ssi",
    name: "SSI",
    description: "Smart Stable Index data and (later) on-chain actions",
    enabled: true,
    modes: ["alive", "guardian"],
    permissions: ["read", "propose"],
    tools: ["ssi.constituents", "ssi.snapshot"],
  },
  {
    id: "sodex",
    name: "SoDEX",
    description: "Per-user SoDEX verify + portfolio",
    enabled: true,
    modes: ["alive", "guardian"],
    permissions: ["read"],
    tools: ["sodex.verify", "sodex.portfolio"],
  },
  {
    id: "execution",
    name: "Execution",
    description: "User-signed SoDEX relay under policy",
    enabled: true,
    modes: ["alive"],
    permissions: ["propose", "relay", "execute"],
    tools: ["sodex.relay"],
  },
  {
    id: "yield",
    name: "Yield",
    description: "Yield opportunities (SSI earn / SoDEX)",
    enabled: false,
    modes: ["alive", "guardian"],
    permissions: ["read", "propose"],
    tools: [],
  },
  {
    id: "treasury",
    name: "Treasury",
    description: "Treasury sleeve management",
    enabled: false,
    modes: ["alive", "guardian"],
    permissions: ["read", "propose"],
    tools: [],
  },
  {
    id: "guardian",
    name: "Guardian",
    description: "Continuity / risk-off automation",
    enabled: false,
    modes: ["guardian"],
    permissions: ["read", "propose", "execute", "attest"],
    tools: ["guardian.alert"],
  },
  {
    id: "tax",
    name: "Tax",
    description: "Tax lot / reporting helpers",
    enabled: false,
    modes: ["alive", "heir"],
    permissions: ["read"],
    tools: [],
  },
  {
    id: "estate",
    name: "Estate",
    description: "Inheritance / heir continuity skill",
    enabled: false,
    modes: ["heir"],
    permissions: ["read", "attest"],
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

  /** Tools visible to the agent for a mode — disabled skills contribute nothing. */
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
  ): { ok: boolean; reason?: string } {
    const skill = this.registry.get(skillId);
    if (!skill) return { ok: false, reason: "unknown_skill" };
    if (!skill.enabled) return { ok: false, reason: "skill_disabled" };
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
