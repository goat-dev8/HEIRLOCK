import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app.js";
import { createRequireWallet } from "../auth/requireWallet.js";
import { MCP_TOOLS, mcpManifest } from "./tools.js";
import { computeLivingLoop } from "../fo/living-loop.js";
import { buildPartnerBrief } from "../fo/partner-brief.js";
import { buildEvidenceGraph } from "../fo/evidence-graph.js";
import { evaluatePartnerApprovalGate } from "../fo/continuity-gate.js";
import * as memory from "../fo/memory.js";
import { canForWallet } from "../skills/persist.js";
import { normalizeSsiSnapshot } from "../sodex/mark-to-market.js";
import { evaluateSsiDrift } from "../ssi/drift.js";
import { OPENAPI_TO_TOKEN, SSI_INDEX_TOKENS, SSI_SOURCE } from "../ssi/addresses.js";
import { basescanTokenUrl } from "../ssi/addresses.js";

const callBody = z.object({
  name: z.string(),
  arguments: z.record(z.unknown()).optional(),
});

export async function registerMcpRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);

  app.get("/api/mcp/manifest", async () => {
    return mcpManifest("1.0.0");
  });

  app.get("/api/mcp/tools", async () => ({
    tools: MCP_TOOLS,
  }));

  app.post("/api/mcp/call", async (req, reply) => {
    const parsed = callBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const { name, arguments: args = {} } = parsed.data;
    const tool = MCP_TOOLS.find((t) => t.name === name);
    if (!tool) {
      return reply.code(404).send({ error: "unknown_tool", name });
    }

    if (tool.authentication === "siwe_jwt") {
      await requireWallet(req, reply);
      if (reply.sent) return;
    }

    const wallet = req.wallet?.address;

    try {
      const result = await invokeMcpTool(ctx, name, args, wallet);
      return {
        ok: true,
        tool: name,
        result,
        at: new Date().toISOString(),
      };
    } catch (e) {
      return reply.code(502).send({
        ok: false,
        tool: name,
        error: (e as Error).message,
      });
    }
  });
}

async function invokeMcpTool(
  ctx: AppContext,
  name: string,
  args: Record<string, unknown>,
  wallet?: string,
) {
  switch (name) {
    case "soso_etf_summary":
      return ctx.soso.etfSummaryHistory({
        symbol: String(args.symbol ?? "BTC"),
        country_code: "US",
        limit: Number(args.limit ?? 5),
      });
    case "soso_news_hot":
      return ctx.soso.hotNews({
        page: 1,
        page_size: Number(args.page_size ?? 5),
      });
    case "soso_macro_calendar":
      return ctx.soso.macroEvents({ limit: Number(args.limit ?? 10) });
    case "ssi_index_snapshot": {
      const indexId = String(args.indexId ?? "ssimag7");
      const raw = await ctx.soso.indexMarketSnapshot(indexId);
      const normalized = normalizeSsiSnapshot(raw, indexId);
      const tokenKey = OPENAPI_TO_TOKEN[indexId.toLowerCase()];
      const tokenAddress = tokenKey ? SSI_INDEX_TOKENS[tokenKey] : null;
      const drift =
        tokenKey && tokenAddress
          ? await evaluateSsiDrift({
              indexId,
              tokenSymbol: tokenKey,
              tokenAddress,
              terminalChange24hPct: normalized.change24h ?? null,
            })
          : null;
      return {
        ...normalized,
        source: "sosovalue",
        status: "LIVE",
        priceKind: "terminal_index_level",
        onChainToken: tokenKey
          ? {
              symbol: tokenKey,
              address: tokenAddress,
              basescan: tokenAddress ? basescanTokenUrl(tokenAddress) : null,
              source: SSI_SOURCE.whitepaper,
            }
          : null,
        drift,
      };
    }
    case "ssi_constituents": {
      const indexId = String(args.indexId ?? "ssimag7");
      const data = await ctx.soso.indexConstituents(indexId);
      return { indexId, data, source: "sosovalue", status: "LIVE" };
    }
    case "sodex_portfolio": {
      if (!wallet) throw new Error("wallet_required");
      const environment = args.environment === "testnet" ? "testnet" : "mainnet";
      return ctx.sodex.getPortfolioBundle(environment, wallet);
    }
    case "sodex_markets_tickers":
      return ctx.sodex.getTicker("mainnet");
    case "partner_brief": {
      if (!wallet) throw new Error("wallet_required");
      return buildPartnerBrief(ctx, wallet);
    }
    case "partner_memory": {
      if (!wallet) throw new Error("wallet_required");
      const status = String(args.status ?? "active");
      const theses =
        status === "all"
          ? await memory.listTheses(wallet, { limit: 50 })
          : await memory.listTheses(wallet, { status: "active", limit: 50 });
      const decisions = await memory.listDecisions(wallet, 20);
      return { theses, decisions };
    }
    case "partner_living_loop": {
      if (!wallet) throw new Error("wallet_required");
      const fo = await canForWallet(wallet, "family_office", "read", "alive");
      return computeLivingLoop(ctx, { foEnabled: fo.ok, foReason: fo.reason });
    }
    case "partner_evidence_graph": {
      if (!wallet) throw new Error("wallet_required");
      const fo = await canForWallet(wallet, "family_office", "read", "alive");
      const living = await computeLivingLoop(ctx, { foEnabled: fo.ok, foReason: fo.reason });
      return buildEvidenceGraph(living);
    }
    case "policy_continuity_gate": {
      if (!wallet) throw new Error("wallet_required");
      return evaluatePartnerApprovalGate(ctx, wallet);
    }
    default:
      throw new Error(`handler_not_implemented:${name}`);
  }
}
