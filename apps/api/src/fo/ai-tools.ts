/**
 * Structured SoSoValue / SSI / SoDEX tools for Family Office AI.
 * Citations come from actual tool executions — not string stuffing alone.
 */
import type { AppContext } from "../app.js";
import type { ToolDefinition } from "@heirlock/ai-provider";
import { normalizeSsiSnapshot } from "../sodex/mark-to-market.js";
import * as memory from "./memory.js";

/** Subset of tools for Partner chat — avoid redundant Terminal fetches when evidence is prefetched. */
export function foChatToolsForMessage(message: string): ToolDefinition[] {
  const m = message.toLowerCase();
  const needsSave = /\b(remember|save|track|memorize|keep this)\b/.test(m);
  const needsPortfolio = /\b(balance|portfolio|orders|positions|my (account|wallet|sodex))\b/.test(m);
  const needsFreshMarket =
    /\b(etf|news|macro|calendar|flows?)\b/.test(m) &&
    /\b(fetch|pull|latest|refresh|check|get|look up)\b/.test(m);

  if (!needsSave && !needsPortfolio && !needsFreshMarket) return [];

  const names = new Set<string>();
  if (needsSave) names.add("save_thesis");
  if (needsPortfolio) names.add("sodex_portfolio");
  if (needsFreshMarket) {
    names.add("soso_etf");
    names.add("soso_news");
    names.add("soso_macro");
    names.add("ssi_snapshot");
  }
  return FO_AI_TOOLS.filter((t) => names.has(t.function.name));
}

export const FO_AI_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "soso_etf",
      description: "BTC ETF summary-history from SoSoValue Terminal",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Default BTC" },
          limit: { type: "number", description: "Max rows, default 3" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "soso_news",
      description: "Hot news feed from SoSoValue Terminal",
      parameters: {
        type: "object",
        properties: {
          page_size: { type: "number", description: "Default 3" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "soso_macro",
      description: "Macro calendar events from SoSoValue Terminal",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Default 5" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ssi_snapshot",
      description:
        "ssiMAG7 Terminal index market snapshot (index level — not on-chain token price)",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "sodex_portfolio",
      description: "Per-user SoDEX portfolio bundle (balances, orders, trades) for a wallet",
      parameters: {
        type: "object",
        properties: {
          environment: {
            type: "string",
            enum: ["mainnet", "testnet"],
            description: "Default mainnet",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_thesis",
      description:
        "Persist an investment thesis into HEIRLOCK's Investment Memory so it can be tracked, challenged, and learned from over time. Only call this when the user asks to save/track/remember a belief, or you have formed a concrete, evidence-backed view worth remembering — never for casual chit-chat.",
      parameters: {
        type: "object",
        properties: {
          statement: { type: "string", description: "The thesis, one or two sentences, stated as a falsifiable claim" },
          confidence: { type: "number", description: "0-100 confidence this thesis holds over the next review window" },
        },
        required: ["statement"],
      },
    },
  },
];

export type ToolCitation = {
  source: string;
  endpoint: string;
  at: string;
  status: "LIVE" | "UNAVAILABLE";
};

export async function runFoTool(
  ctx: AppContext,
  name: string,
  argsJson: string,
  wallet: string,
): Promise<{ result: string; citation: ToolCitation }> {
  const at = new Date().toISOString();
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
  } catch {
    args = {};
  }

  try {
    switch (name) {
      case "soso_etf": {
        const data = await ctx.soso.etfSummaryHistory({
          symbol: String(args.symbol ?? "BTC"),
          country_code: "US",
          limit: Number(args.limit ?? 3),
        });
        return {
          result: JSON.stringify(data).slice(0, 3500),
          citation: { source: "etf", endpoint: "/etfs/summary-history", at, status: "LIVE" },
        };
      }
      case "soso_news": {
        const data = await ctx.soso.hotNews({
          page: 1,
          page_size: Number(args.page_size ?? 3),
        });
        return {
          result: JSON.stringify(data).slice(0, 3500),
          citation: { source: "feeds", endpoint: "/news/hot", at, status: "LIVE" },
        };
      }
      case "soso_macro": {
        const data = await ctx.soso.macroEvents({ limit: Number(args.limit ?? 5) });
        return {
          result: JSON.stringify(data).slice(0, 3500),
          citation: { source: "macro", endpoint: "/macro/events", at, status: "LIVE" },
        };
      }
      case "ssi_snapshot": {
        const raw = await ctx.soso.indexMarketSnapshot("ssimag7");
        const snap = normalizeSsiSnapshot(raw, "ssimag7");
        return {
          result: JSON.stringify({
            terminalIndexId: "ssimag7",
            nav: snap.nav,
            change24h: snap.change24h,
            note: "Terminal index level ≠ MAG7.ssi on-chain token price",
          }),
          citation: {
            source: "index",
            endpoint: "/indices/ssimag7/market-snapshot",
            at,
            status: "LIVE",
          },
        };
      }
      case "sodex_portfolio": {
        const environment =
          args.environment === "testnet" ? "testnet" : "mainnet";
        const bundle = await ctx.sodex.getPortfolioBundle(environment, wallet);
        return {
          result: JSON.stringify({
            environment,
            balances: bundle.balances,
            openOrderCount: Array.isArray(bundle.orders)
              ? bundle.orders.length
              : undefined,
            tradeSample: Array.isArray(bundle.trades)
              ? bundle.trades.slice(0, 5)
              : undefined,
          }).slice(0, 3500),
          citation: {
            source: "sodex",
            endpoint: `/accounts/${wallet}/portfolio`,
            at,
            status: "LIVE",
          },
        };
      }
      case "save_thesis": {
        const statement = String(args.statement ?? "").trim();
        if (!statement) throw new Error("statement_required");
        const confidence = Number(args.confidence ?? 50);
        const thesis = await memory.createThesis({
          wallet,
          statement,
          confidence: Number.isFinite(confidence) ? confidence : 50,
          source: "ai",
        });
        return {
          result: JSON.stringify({ saved: true, thesisId: thesis.id, statement: thesis.statement }),
          citation: {
            source: "memory",
            endpoint: "investment_thesis.create",
            at,
            status: "LIVE",
          },
        };
      }
      default:
        return {
          result: JSON.stringify({ error: `unknown_tool_${name}` }),
          citation: {
            source: name,
            endpoint: "tool",
            at,
            status: "UNAVAILABLE",
          },
        };
    }
  } catch (err) {
    return {
      result: JSON.stringify({
        error: "UNAVAILABLE",
        detail: err instanceof Error ? err.message : String(err),
      }),
      citation: {
        source: name.replace(/^soso_/, "").replace(/^ssi_/, "index").replace(/^sodex_/, "sodex"),
        endpoint: name,
        at,
        status: "UNAVAILABLE",
      },
    };
  }
}
