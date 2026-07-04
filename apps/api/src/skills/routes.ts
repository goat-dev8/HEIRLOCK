import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app.js";
import { createRequireWallet } from "../auth/requireWallet.js";
import type { SkillId, WealthMode } from "./os.js";

export async function registerSkillRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);

  app.get("/api/skills", async () => ({
    skills: ctx.skills.registry.list(),
  }));

  app.get("/api/skills/tools", async (req) => {
    const q = req.query as { mode?: string };
    const mode = (q.mode as WealthMode) || "alive";
    return {
      mode,
      tools: ctx.skills.registry.visibleTools(mode),
    };
  });

  app.post("/api/skills/:id/enable", { preHandler: requireWallet }, async (req, reply) => {
    const params = z.object({ id: z.string() }).safeParse(req.params);
    const body = z.object({ enabled: z.boolean(), mode: z.enum(["alive", "guardian", "heir"]).default("alive") }).safeParse(req.body ?? {});
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "invalid body" });
    }
    const id = params.data.id as SkillId;
    const gate = ctx.skills.permissions.can(id, "propose", body.data.mode);
    // enabling is an admin-ish action; allow if skill exists
    try {
      ctx.skills.registry.setEnabled(id, body.data.enabled);
      ctx.skills.events.emit(id, "skill.toggle", {
        enabled: body.data.enabled,
        wallet: req.wallet!.address,
      });
      return { id, enabled: body.data.enabled, gate };
    } catch (err) {
      return reply.code(404).send({
        error: err instanceof Error ? err.message : "Unknown skill",
      });
    }
  });

  app.get("/api/skills/events", { preHandler: requireWallet }, async () => ({
    events: ctx.skills.events.recent(50),
  }));
}
