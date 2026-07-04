import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app.js";
import { createRequireWallet } from "../auth/requireWallet.js";

export async function registerSosoRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);

  app.get("/api/soso/metrics", async () => ctx.soso.getMetrics());

  app.get("/api/soso/diag", async () => {
    const probe = await ctx.soso.diagProbe();
    return {
      ...probe,
      // never echo API key
      metrics: ctx.soso.getMetrics(),
    };
  });

  app.get("/api/soso/etfs/summary-history", { preHandler: requireWallet }, async (req, reply) => {
    const q = req.query as { symbol?: string; country_code?: string; limit?: string };
    if (!q.symbol || !q.country_code) {
      return reply.code(400).send({ error: "symbol and country_code required" });
    }
    try {
      const data = await ctx.soso.etfSummaryHistory({
        symbol: q.symbol,
        country_code: q.country_code,
        limit: q.limit ? Number(q.limit) : 10,
      });
      return { data };
    } catch (err) {
      req.log.error(err);
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "SoSoValue failure",
      });
    }
  });

  app.get("/api/soso/news/hot", { preHandler: requireWallet }, async (req, reply) => {
    try {
      const data = await ctx.soso.hotNews({ page: 1, page_size: 10 });
      return { data };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "SoSoValue failure",
      });
    }
  });
}
