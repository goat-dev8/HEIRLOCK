/**
 * Per-user Skill enable/disable overrides persisted as SkillEvent rows.
 * Builtin defaults live in SkillRegistry; latest skill.toggle per skill wins.
 */
import { prisma } from "../db.js";
import type { SkillDefinition, SkillId, SkillPermission, WealthMode } from "./os.js";
import { PermissionKernel, SkillRegistry } from "./os.js";

export async function ensureUserId(wallet: string): Promise<string> {
  const address = wallet.toLowerCase();
  const profile = await prisma.userProfile.upsert({
    where: { walletAddress: address },
    create: { walletAddress: address },
    update: {},
  });
  return profile.id;
}

export async function loadSkillOverrides(
  userId: string,
): Promise<Map<SkillId, boolean>> {
  const events = await prisma.skillEvent.findMany({
    where: { userId, eventType: "skill.toggle" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const map = new Map<SkillId, boolean>();
  for (const e of events) {
    const id = e.skillId as SkillId;
    if (map.has(id)) continue;
    const payload = e.payload as { enabled?: boolean };
    if (typeof payload.enabled === "boolean") {
      map.set(id, payload.enabled);
    }
  }
  return map;
}

export async function loadSkillOverridesForWallet(
  wallet: string,
): Promise<Map<SkillId, boolean>> {
  const profile = await prisma.userProfile.findUnique({
    where: { walletAddress: wallet.toLowerCase() },
  });
  if (!profile) return new Map();
  return loadSkillOverrides(profile.id);
}

export function applyOverrides(
  defs: SkillDefinition[],
  overrides: Map<SkillId, boolean>,
): SkillDefinition[] {
  return defs.map((d) => ({
    ...d,
    enabled: overrides.has(d.id) ? overrides.get(d.id)! : d.enabled,
  }));
}

export async function persistSkillToggle(opts: {
  wallet: string;
  skillId: SkillId;
  enabled: boolean;
}): Promise<void> {
  const userId = await ensureUserId(opts.wallet);
  await prisma.skillEvent.create({
    data: {
      userId,
      skillId: opts.skillId,
      eventType: "skill.toggle",
      payload: {
        enabled: opts.enabled,
        wallet: opts.wallet.toLowerCase(),
        at: new Date().toISOString(),
      },
    },
  });
}

export async function listPersistedSkillEvents(
  wallet: string,
  limit = 50,
): Promise<
  Array<{
    skillId: string;
    eventType: string;
    payload: unknown;
    at: number;
  }>
> {
  const profile = await prisma.userProfile.findUnique({
    where: { walletAddress: wallet.toLowerCase() },
  });
  if (!profile) return [];
  const rows = await prisma.skillEvent.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    skillId: r.skillId,
    eventType: r.eventType,
    payload: r.payload,
    at: r.createdAt.getTime(),
  }));
}

/** Permission check with per-user enable overrides applied. */
export async function canForWallet(
  registry: SkillRegistry,
  wallet: string,
  skillId: SkillId,
  permission: SkillPermission,
  mode: WealthMode,
): Promise<{ ok: boolean; reason?: string }> {
  const overrides = await loadSkillOverridesForWallet(wallet);
  const kernel = new PermissionKernel(registry);
  return kernel.can(skillId, permission, mode, overrides);
}
