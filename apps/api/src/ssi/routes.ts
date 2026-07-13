import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app.js";
import { createRequireWallet } from "../auth/requireWallet.js";
import { normalizeSsiSnapshot } from "../sodex/mark-to-market.js";
import {
  SSI_INDEX_TOKENS,
  SSI_PROTOCOL_CONTRACTS,
  SSI_SOURCE,
  OPENAPI_TO_TOKEN,
  basescanAddressUrl,
  basescanTokenUrl,
} from "./addresses.js";
import { evaluateSsiDrift } from "./drift.js";

/**
 * SSI Skill — Terminal OpenAPI analytics + whitepaper-verified Base contracts.
 * Retail mint/stake/earn deep-link to official SSI app (WLP mint is protocol-quoted).
 */
export async function registerSsiRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);

  app.get("/api/ssi/config", async () => {
    const tokens = Object.entries(SSI_INDEX_TOKENS).map(([symbol, address]) => ({
      symbol,
      address,
      basescan: basescanTokenUrl(address),
      source: SSI_SOURCE.whitepaper,
    }));
    const contracts = Object.entries(SSI_PROTOCOL_CONTRACTS).map(([role, address]) => ({
      role,
      address,
      basescan: basescanAddressUrl(address),
      source: SSI_SOURCE.whitepaper,
    }));

    return {
      appUrl: ctx.env.SSI_APP_URL,
      earnUrl: `${String(ctx.env.SSI_APP_URL).replace(/\/$/, "")}/earn`,
      rewardUrl: `${String(ctx.env.SSI_APP_URL).replace(/\/$/, "")}/reward`,
      baseChainId: ctx.env.BASE_CHAIN_ID,
      baseRpc: ctx.env.BASE_RPC_URL,
      sosoTokenBase: ctx.env.SOSO_TOKEN_BASE,
      sosoTokenEthereum: ctx.env.SOSO_TOKEN_ETHEREUM,
      indexTokens: tokens,
      protocolContracts: contracts,
      onChain: {
        // Whitepaper roles (not invented “router/staking/voting” placeholders)
        swap: SSI_PROTOCOL_CONTRACTS.swap,
        factory: SSI_PROTOCOL_CONTRACTS.factory,
        issuer: SSI_PROTOCOL_CONTRACTS.issuer,
        rebalancer: SSI_PROTOCOL_CONTRACTS.rebalancer,
        feeManager: SSI_PROTOCOL_CONTRACTS.feeManager,
        stakeFactory: SSI_PROTOCOL_CONTRACTS.stakeFactory,
        assetLocking: SSI_PROTOCOL_CONTRACTS.assetLocking,
        researchHubVoting: process.env.SSI_RESEARCH_HUB_VOTING_ADDRESS ?? null,
        note:
          "Addresses from SoSoValue Whitepaper §5.3 Key Addresses (Base). ResearchHubVoting unset until officially listed. Retail allocate via SSI app.",
      },
      dualSource: {
        terminalIndex:
          "OpenAPI /indices/{id}/market-snapshot price = Terminal index level (not ERC-20 token price)",
        onChainToken: "MAG7.ssi etc. are Base ERC-20 tokens with separate market price (~$0.4 class)",
      },
      dataSource: SSI_SOURCE.openapi,
      whitepaperSource: SSI_SOURCE.whitepaper,
      allocateFlow: [
        "Research Terminal index + constituents in HEIRLOCK",
        "Allocate / mint / stake / earn on official SSI app (Base)",
        "Trade SSI proxies on SoDEX from HEIRLOCK Trading Skill",
      ],
      defaultIndexId: "ssimag7",
      knownIndices: [
        "ssimag7",
        "ssidefi",
        "ssimeme",
        "ssilayer1",
        "ssilayer2",
        "ssiai",
        "ssirwa",
        "ssinft",
        "ssigamefi",
        "ssidepin",
        "ssipayfi",
        "ssicefi",
        "ssisocialfi",
      ],
      openApiToToken: OPENAPI_TO_TOKEN,
    };
  });

  app.get("/api/ssi/indices", { preHandler: requireWallet }, async (_req, reply) => {
    try {
      const data = await ctx.soso.listIndices();
      return { data, source: "sosovalue", status: "LIVE" };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "SSI indices list failed",
        status: "UNAVAILABLE",
      });
    }
  });

  app.get("/api/ssi/indices/:indexId/constituents", { preHandler: requireWallet }, async (req, reply) => {
    const params = z.object({ indexId: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
    try {
      const data = await ctx.soso.indexConstituents(params.data.indexId);
      return { indexId: params.data.indexId, data, source: "sosovalue", status: "LIVE" };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "SSI index read failed",
        status: "UNAVAILABLE",
      });
    }
  });

  app.get("/api/ssi/indices/:indexId/snapshot", { preHandler: requireWallet }, async (req, reply) => {
    const params = z.object({ indexId: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
    try {
      const raw = await ctx.soso.indexMarketSnapshot(params.data.indexId);
      const normalized = normalizeSsiSnapshot(raw, params.data.indexId);
      const tokenKey = OPENAPI_TO_TOKEN[params.data.indexId.toLowerCase()];
      const tokenAddress = tokenKey ? SSI_INDEX_TOKENS[tokenKey] : null;
      const drift =
        tokenKey && tokenAddress
          ? await evaluateSsiDrift({
              indexId: params.data.indexId,
              tokenSymbol: tokenKey,
              tokenAddress,
              terminalChange24hPct: normalized.change24h ?? null,
            })
          : null;
      return {
        ...normalized,
        data: raw,
        source: "sosovalue",
        status: "LIVE",
        priceKind: "terminal_index_level",
        priceKindNote:
          "This price is the SoSoValue Terminal index level from OpenAPI — not the on-chain SSI token USD price.",
        onChainToken: tokenKey
          ? {
              symbol: tokenKey,
              address: tokenAddress,
              basescan: tokenAddress ? basescanTokenUrl(tokenAddress) : null,
              source: SSI_SOURCE.whitepaper,
              priceUsd: drift?.tokenPriceUsd ?? null,
              change24hPct: drift?.tokenChange24hPct ?? null,
            }
          : null,
        drift,
      };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "SSI snapshot failed",
        status: "UNAVAILABLE",
      });
    }
  });
}
