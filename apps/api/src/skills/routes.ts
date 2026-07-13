import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app.js";
import { createRequireWallet } from "../auth/requireWallet.js";
import type { SkillId, WealthMode } from "./os.js";
import {
  applyOverrides,
  canForWallet,
  listPersistedSkillEvents,
  loadSkillOverridesForWallet,
  persistSkillToggle,
} from "./persist.js";

export async function registerSkillRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);

  app.get("/api/skills", { preHandler: requireWallet }, async (req) => {
    const overrides = await loadSkillOverridesForWallet(req.wallet!.address);
    return {
      skills: applyOverrides(ctx.skills.registry.list(), overrides),
      personalized: true,
    };
  });

  app.get("/api/skills/tools", { preHandler: requireWallet }, async (req) => {
    const q = req.query as { mode?: string };
    const mode = (q.mode as WealthMode) || "alive";
    const overrides = await loadSkillOverridesForWallet(req.wallet!.address);
    const skills = applyOverrides(ctx.skills.registry.list(), overrides);
    const tools = new Set<string>();
    for (const s of skills) {
      if (!s.enabled) continue;
      if (!s.modes.includes(mode)) continue;
      for (const t of s.tools) tools.add(t);
    }
    return { mode, tools: [...tools] };
  });

  app.post("/api/skills/:id/enable", { preHandler: requireWallet }, async (req, reply) => {
    const params = z.object({ id: z.string() }).safeParse(req.params);
    const body = z
      .object({
        enabled: z.boolean(),
        mode: z.enum(["alive", "guardian", "heir"]).default("alive"),
      })
      .safeParse(req.body ?? {});
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "invalid body" });
    }
    const id = params.data.id as SkillId;
    if (!ctx.skills.registry.get(id)) {
      return reply.code(404).send({ error: `Unknown skill ${id}` });
    }

    await persistSkillToggle({
      wallet: req.wallet!.address,
      skillId: id,
      enabled: body.data.enabled,
    });

    // Keep in-process bus for live subscribers; persistence is source of truth.
    ctx.skills.events.emit(id, "skill.toggle", {
      enabled: body.data.enabled,
      wallet: req.wallet!.address,
    });

    const gate = await canForWallet(
      ctx.skills.registry,
      req.wallet!.address,
      id,
      "propose",
      body.data.mode,
    );
    return { id, enabled: body.data.enabled, gate, persisted: true };
  });

  app.get("/api/skills/events", { preHandler: requireWallet }, async (req) => ({
    events: await listPersistedSkillEvents(req.wallet!.address, 50),
  }));
}
