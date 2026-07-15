import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app.js";
import { probeDatabase, prisma } from "../db.js";
import { probeRedis } from "../redis.js";
import { runBackgroundPartnerPulse } from "../fo/partner-background.js";

/**
 * Scheduled job hooks for Render Cron / external schedulers.
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function registerCronRoutes(app: FastifyInstance, ctx: AppContext) {
  app.addHook("preHandler", async (req, reply) => {
    if (!req.url.startsWith("/api/cron")) return;
    const secret = ctx.env.CRON_SECRET;
    if (!secret) {
      return reply.code(503).send({ error: "CRON_SECRET not configured" });
    }
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== secret) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  app.post("/api/cron/heartbeat", async () => {
    const [db, redis] = await Promise.all([probeDatabase(), probeRedis()]);
    const payload = {
      at: new Date().toISOString(),
      db: db.connected,
      redis: redis.connected,
      aiRequests: ctx.ai.getMetrics().totalRequests,
    };
    await prisma.agentMeta.upsert({
      where: { key: "cron_heartbeat" },
      create: { key: "cron_heartbeat", value: payload },
      update: { value: payload },
    });
    return { ok: true, ...payload };
  });

  app.post("/api/cron/soso-warm", async (_req, reply) => {
    if (!ctx.soso.configured) {
      return reply.code(503).send({ error: "SoSoValue not configured" });
    }
    const data = await ctx.soso.etfSummaryHistory({
      symbol: "BTC",
      country_code: "US",
      limit: 1,
    });
    return { ok: true, warmed: true, preview: JSON.stringify(data).slice(0, 200) };
  });

  app.post("/api/cron/ai-metrics", async () => {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    let upserts = 0;
    for (const h of ctx.ai.getHealth()) {
      await prisma.aiProviderMetric.upsert({
        where: {
          provider_model_day: {
            provider: h.id,
            model: h.model,
            day,
          },
        },
        create: {
          provider: h.id,
          model: h.model,
          successCount: Math.max(0, h.totalRequests - h.totalFailures),
          failureCount: h.totalFailures,
          totalLatency: h.totalLatencyMs,
          costUsd: h.estimatedCostUsd,
          day,
        },
        update: {
          successCount: Math.max(0, h.totalRequests - h.totalFailures),
          failureCount: h.totalFailures,
          totalLatency: h.totalLatencyMs,
          costUsd: h.estimatedCostUsd,
        },
      });
      upserts += 1;
    }
    return { ok: true, upserts };
  });

  app.post("/api/cron/partner-pulse", async (req, reply) => {
    const body = (req.body ?? {}) as { force?: boolean; walletLimit?: number };
    const result = await runBackgroundPartnerPulse(ctx, {
      force: Boolean(body.force),
      walletLimit: typeof body.walletLimit === "number" ? body.walletLimit : 50,
    });
    return { ok: true, ...result };
  });
}
