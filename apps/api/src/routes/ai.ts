import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app.js";

const chatBody = z.object({
  message: z.string().min(1).max(8000),
  system: z.string().max(8000).optional(),
  jsonMode: z.boolean().optional(),
  thinking: z.boolean().optional(),
});

export async function registerAiRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/api/ai/health", async () => ({
    metrics: ctx.ai.getMetrics(),
    logs: ctx.ai.getLogs(20),
  }));

  app.post("/api/ai/chat", async (req, reply) => {
    const parsed = chatBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    try {
      const res = await ctx.ai.chat({
        messages: [
          ...(parsed.data.system
            ? [{ role: "system" as const, content: parsed.data.system }]
            : []),
          { role: "user", content: parsed.data.message },
        ],
        jsonMode: parsed.data.jsonMode,
        thinking: parsed.data.thinking ?? true,
        maxTokens: 1024,
      });

      return {
        provider: res.provider,
        model: res.model,
        content: res.content,
        reasoning: res.reasoning,
        latencyMs: res.latencyMs,
        usage: res.usage,
      };
    } catch (err) {
      req.log.error(err);
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "AI provider failure",
      });
    }
  });
}
