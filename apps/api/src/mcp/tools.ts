/**
 * HEIRLOCK MCP tool registry — production metadata for external agents.
 * Compatible with MCP-style tool discovery (name, description, inputSchema).
 */
export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  authentication: "none" | "siwe_jwt" | "cron_secret";
  permissions: string[];
  handler: string;
};

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "soso_etf_summary",
    description: "BTC or symbol ETF summary-history from SoSoValue Terminal",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", default: "BTC" },
        limit: { type: "number", default: 5 },
      },
    },
    authentication: "none",
    permissions: ["research:read"],
    handler: "soso.etfSummaryHistory",
  },
  {
    name: "soso_news_hot",
    description: "Hot news feed from SoSoValue Terminal",
    inputSchema: {
      type: "object",
      properties: { page_size: { type: "number", default: 5 } },
    },
    authentication: "none",
    permissions: ["news:read"],
    handler: "soso.hotNews",
  },
  {
    name: "soso_macro_calendar",
    description: "Macro calendar events from SoSoValue Terminal",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", default: 10 } },
    },
    authentication: "none",
    permissions: ["macro:read"],
    handler: "soso.macro",
  },
  {
    name: "ssi_index_snapshot",
    description: "SSI Terminal index snapshot (index level, not on-chain token price)",
    inputSchema: {
      type: "object",
      properties: { indexId: { type: "string", default: "ssiMAG7" } },
    },
    authentication: "none",
    permissions: ["ssi:read"],
    handler: "ssi.snapshot",
  },
  {
    name: "ssi_constituents",
    description: "SSI index constituent weights and metadata",
    inputSchema: {
      type: "object",
      properties: { indexId: { type: "string" } },
      required: ["indexId"],
    },
    authentication: "none",
    permissions: ["ssi:read"],
    handler: "ssi.constituents",
  },
  {
    name: "sodex_portfolio",
    description: "Per-wallet SoDEX balances, orders, and trades (requires verified aid)",
    inputSchema: {
      type: "object",
      properties: {
        environment: { type: "string", enum: ["mainnet", "testnet"], default: "mainnet" },
      },
    },
    authentication: "siwe_jwt",
    permissions: ["portfolio:read", "sodex:read"],
    handler: "sodex.portfolio",
  },
  {
    name: "sodex_markets_tickers",
    description: "SoDEX market tickers and symbols",
    inputSchema: { type: "object", properties: {} },
    authentication: "none",
    permissions: ["sodex:read"],
    handler: "sodex.tickers",
  },
  {
    name: "partner_brief",
    description: "Cached Living Partner brief: headline, proposal, pulse digest",
    inputSchema: { type: "object", properties: {} },
    authentication: "siwe_jwt",
    permissions: ["family_office:read"],
    handler: "fo.partner.brief",
  },
  {
    name: "partner_memory",
    description: "Active investment theses and recent decisions for a wallet",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string", enum: ["active", "all"], default: "active" } },
    },
    authentication: "siwe_jwt",
    permissions: ["memory:read"],
    handler: "fo.partner.memory",
  },
  {
    name: "partner_living_loop",
    description: "Full Living Loop: evidence, proposal, preflight, citations",
    inputSchema: { type: "object", properties: {} },
    authentication: "siwe_jwt",
    permissions: ["family_office:read"],
    handler: "fo.living_loop",
  },
  {
    name: "partner_evidence_graph",
    description: "Node-edge evidence graph for current proposal",
    inputSchema: { type: "object", properties: {} },
    authentication: "siwe_jwt",
    permissions: ["family_office:read"],
    handler: "fo.partner.evidence_graph",
  },
  {
    name: "policy_continuity_gate",
    description: "Continuity and debate gate status before approval",
    inputSchema: { type: "object", properties: {} },
    authentication: "siwe_jwt",
    permissions: ["risk:read", "continuity:read"],
    handler: "fo.partner.gate",
  },
];

export function mcpManifest(version: string) {
  return {
    name: "heirlock",
    version,
    description:
      "HEIRLOCK MCP — AI Financial Operating System on SoSoValue. Terminal, Partner, SSI, SoDEX, ValueChain.",
    protocol: "heirlock-mcp/1.0",
    authentication: {
      public: ["soso_*", "ssi_*", "sodex_markets_*"],
      wallet: {
        type: "Bearer",
        header: "Authorization",
        obtain: "POST /api/auth/verify after SIWE",
      },
    },
    tools: MCP_TOOLS.map(({ name, description, inputSchema, authentication, permissions }) => ({
      name,
      description,
      inputSchema,
      authentication,
      permissions,
    })),
  };
}
