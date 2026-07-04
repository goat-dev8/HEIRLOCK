import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app.js";
import { createRequireWallet } from "../auth/requireWallet.js";

/**
 * SSI Skill data path — index NAV/constituents via SoSoValue OpenAPI.
 * On-chain Base mint/stake waits for verified contract addresses (never invent).
 */
export async function registerSsiRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);

  app.get("/api/ssi/config", async () => ({
    appUrl: ctx.env.SSI_APP_URL,
    baseChainId: ctx.env.BASE_CHAIN_ID,
    baseRpc: ctx.env.BASE_RPC_URL,
    sosoTokenBase: ctx.env.SOSO_TOKEN_BASE,
    sosoTokenEthereum: ctx.env.SOSO_TOKEN_ETHEREUM,
    onChain: {
      router: process.env.SSI_ROUTER_ADDRESS ?? null,
      staking: process.env.SSI_STAKING_ADDRESS ?? null,
      voting: process.env.SSI_RESEARCH_HUB_VOTING_ADDRESS ?? null,
      note: "Null until verified on BaseScan — do not invent",
    },
    dataSource: "sosovalue-openapi-indices",
  }));

  app.get("/api/ssi/indices/:indexId/constituents", { preHandler: requireWallet }, async (req, reply) => {
    const params = z.object({ indexId: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
    try {
      const data = await ctx.soso.indexConstituents(params.data.indexId);
      return { indexId: params.data.indexId, data, source: "sosovalue" };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "SSI index read failed",
      });
    }
  });

  app.get("/api/ssi/indices/:indexId/snapshot", { preHandler: requireWallet }, async (req, reply) => {
    const params = z.object({ indexId: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
    try {
      const data = await ctx.soso.indexMarketSnapshot(params.data.indexId);
      return { indexId: params.data.indexId, data, source: "sosovalue" };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "SSI snapshot failed",
      });
    }
  });
}
