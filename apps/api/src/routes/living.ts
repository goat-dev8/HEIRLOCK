/**
 * Living Loop + FO Brief + Risk preflight + Track outcomes.
 * Family Office flagship Skill orchestration over SoSoValue + SoDEX + SSI.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app.js";
import { createRequireWallet } from "../auth/requireWallet.js";
import { normalizeSsiSnapshot } from "../sodex/mark-to-market.js";
import { OPENAPI_TO_TOKEN, SSI_INDEX_TOKENS, basescanTokenUrl } from "../ssi/addresses.js";

type Outcome = "HIT" | "STOP" | "DRIFT" | "PENDING";

type TrackRow = {
  id: string;
  wallet: string;
  kind: string;
  thesis: string;
  symbol?: string;
  orderId?: string;
  relayId?: string;
  createdAt: number;
  outcome: Outcome;
  citations: Array<{ source: string; endpoint: string; at: string }>;
};

const trackStore: TrackRow[] = [];

function pushTrack(row: Omit<TrackRow, "id" | "createdAt" | "outcome"> & { outcome?: Outcome }) {
  const entry: TrackRow = {
    ...row,
    id: `trk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    outcome: row.outcome ?? "PENDING",
  };
  trackStore.unshift(entry);
  if (trackStore.length > 200) trackStore.pop();
  return entry;
}

export async function registerLivingRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);

  app.get("/api/fo/living-loop", { preHandler: requireWallet }, async (req, reply) => {
    const fo = ctx.skills.permissions.can("family_office", "read", "alive");
    if (!fo.ok) {
      return reply.code(403).send({
        error: "Family Office Skill disabled — enable it in Skills to run the Living Loop",
        reason: fo.reason,
      });
    }

    const citations: Array<{ source: string; endpoint: string; at: string; status: string }> = [];
    const at = () => new Date().toISOString();

    const settle = async <T>(
      label: string,
      endpoint: string,
      fn: () => Promise<T>,
    ): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
      try {
        const data = await fn();
        citations.push({ source: label, endpoint, at: at(), status: "LIVE" });
        return { ok: true, data };
      } catch (e) {
        citations.push({
          source: label,
          endpoint,
          at: at(),
          status: "UNAVAILABLE",
        });
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    };

    const [etf, news, macro, indexSnap, indexList] = await Promise.all([
      settle("etf", "/etfs/summary-history", () =>
        ctx.soso.etfSummaryHistory({ symbol: "BTC", country_code: "US", limit: 5 }),
      ),
      settle("feeds", "/news/hot", () => ctx.soso.hotNews({ page: 1, page_size: 5 })),
      settle("macro", "/macro/events", () => ctx.soso.macroEvents({ limit: 5 })),
      settle("index", "/indices/ssimag7/market-snapshot", () =>
        ctx.soso.indexMarketSnapshot("ssimag7"),
      ),
      settle("indices", "/indices", () => ctx.soso.listIndices()),
    ]);

    const normalized =
      indexSnap.ok ? normalizeSsiSnapshot(indexSnap.data, "ssimag7") : null;
    const tokenSym = OPENAPI_TO_TOKEN.ssimag7;
    const tokenAddr = tokenSym ? SSI_INDEX_TOKENS[tokenSym] : null;

    const liveCount = citations.filter((c) => c.status === "LIVE").length;
    const proposal = {
      action: "REVIEW_SSI_AND_SODEX",
      title: "Hold MAG7 exposure; confirm SoDEX proxy liquidity before size",
      rationale:
        normalized?.change24h != null && normalized.change24h < -1
          ? "Terminal index 24h soft; prefer confirm-before-execute and policy cap."
          : "Terminal index stable enough for Family Office review — still confirm under policy.",
      indexLevel: normalized?.nav ?? null,
      change24hPct: normalized?.change24h ?? null,
      onChainToken: tokenSym
        ? { symbol: tokenSym, address: tokenAddr, basescan: tokenAddr ? basescanTokenUrl(tokenAddr) : null }
        : null,
      sodexHint: "Trade WSOSO_vUSDC or SSI proxies on SoDEX after Enable Trading + verify aid",
      ssiAllocateUrl: ctx.env.SSI_APP_URL,
    };

    const maxNotional = Math.min(ctx.env.TRADING_MAX_NOTIONAL_USD, ctx.env.MAINNET_TEST_MAX_NOTIONAL_USD, 1);
    const preflight = {
      verdict: ctx.env.KILL_SWITCH_TRADING ? "BLOCK" : "APPROVE",
      factors: [
        {
          id: "policy_cap",
          label: "WealthPolicy notional cap",
          status: "ok",
          detail: `Max $${maxNotional} mainnet-limited`,
        },
        {
          id: "kill_switch",
          label: "Kill switch",
          status: ctx.env.KILL_SWITCH_TRADING ? "block" : "ok",
          detail: ctx.env.KILL_SWITCH_TRADING ? "Trading halted" : "Clear",
        },
        {
          id: "family_office_skill",
          label: "Family Office Skill",
          status: fo.ok ? "ok" : "block",
          detail: fo.ok ? "Enabled" : fo.reason,
        },
        {
          id: "terminal_feeds",
          label: "SoSoValue Terminal feeds",
          status: liveCount >= 3 ? "ok" : liveCount >= 1 ? "caution" : "block",
          detail: `${liveCount}/${citations.length} LIVE`,
        },
        {
          id: "macro_window",
          label: "Macro feed",
          status: macro.ok ? "ok" : "caution",
          detail: macro.ok ? "Events loaded" : "Macro UNAVAILABLE — proceed with caution",
        },
      ],
    };
    if (preflight.factors.some((f) => f.status === "block")) preflight.verdict = "BLOCK";
    else if (preflight.factors.some((f) => f.status === "caution")) preflight.verdict = "CAUTION";

    return {
      status: "LIVE",
      skill: "family_office",
      mode: "alive",
      summary:
        "Governed Living Loop on Terminal + SSI + SoDEX under Family Office Skill permissions.",
      evidence: {
        etf: etf.ok ? etf.data : null,
        news: news.ok ? news.data : null,
        macro: macro.ok ? macro.data : null,
        indexSnapshot: normalized,
        indices: indexList.ok ? indexList.data : null,
      },
      citations,
      proposal,
      preflight,
      next: {
        confirmTrading: "/app/trading",
        allocateSsi: ctx.env.SSI_APP_URL,
        guide: "/app/guide",
        track: "/app/track",
      },
      ts: at(),
    };
  });

  app.get("/api/fo/brief", { preHandler: requireWallet }, async (req, reply) => {
    const fo = ctx.skills.permissions.can("family_office", "read", "alive");
    if (!fo.ok) return reply.code(403).send({ error: "Family Office Skill disabled", reason: fo.reason });

    const citations: Array<{ source: string; endpoint: string; at: string }> = [];
    const stamp = (source: string, endpoint: string) => {
      citations.push({ source, endpoint, at: new Date().toISOString() });
    };

    let etf: unknown = null;
    let news: unknown = null;
    let macro: unknown = null;
    let snap: ReturnType<typeof normalizeSsiSnapshot> | null = null;
    let stocks: unknown = null;
    let treasuries: unknown = null;
    let fundraising: unknown = null;

    try {
      etf = await ctx.soso.etfSummaryHistory({ symbol: "BTC", country_code: "US", limit: 3 });
      stamp("etf", "/etfs/summary-history");
    } catch {
      /* partial */
    }
    try {
      news = await ctx.soso.hotNews({ page: 1, page_size: 5 });
      stamp("feeds", "/news/hot");
    } catch {
      /* partial */
    }
    try {
      macro = await ctx.soso.macroEvents({ limit: 5 });
      stamp("macro", "/macro/events");
    } catch {
      /* partial */
    }
    try {
      const raw = await ctx.soso.indexMarketSnapshot("ssimag7");
      snap = normalizeSsiSnapshot(raw, "ssimag7");
      stamp("index", "/indices/ssimag7/market-snapshot");
    } catch {
      /* partial */
    }
    try {
      stocks = await ctx.soso.getPath("/crypto-stocks", { limit: 5 });
      stamp("crypto-stocks", "/crypto-stocks");
    } catch {
      /* optional */
    }
    try {
      treasuries = await ctx.soso.getPath("/btc-treasuries", { limit: 5 });
      stamp("btc-treasuries", "/btc-treasuries");
    } catch {
      /* optional */
    }
    try {
      fundraising = await ctx.soso.fundraising({ limit: 3 });
      stamp("fundraising", "/fundraising");
    } catch {
      /* optional */
    }

    const actions = [
      {
        id: "ssi_review",
        title: "Review ssiMAG7 Terminal level vs MAG7.ssi token",
        risk: "low",
        href: "/app/ssi",
      },
      {
        id: "sodex_proxy",
        title: "Prepare capped SoDEX order under WealthPolicy",
        risk: "medium",
        href: "/app/trading",
      },
      {
        id: "ssi_allocate",
        title: "Allocate on official SSI app (Base)",
        risk: "medium",
        href: ctx.env.SSI_APP_URL,
        external: true,
      },
    ];

    return {
      status: citations.length ? "LIVE" : "UNAVAILABLE",
      title: "Family Office Brief",
      summary:
        snap?.nav != null
          ? `ssiMAG7 Terminal index level ${snap.nav.toFixed?.(4) ?? snap.nav}; 24h ${snap.change24h ?? "—"}%. AUM not on Terminal snapshot.`
          : "Terminal index snapshot unavailable — brief degraded.",
      index: snap,
      modules: { etf, news, macro, stocks, treasuries, fundraising },
      actions,
      citations,
      note: "Family Office Brief cites live SoSoValue Terminal modules.",
      ts: new Date().toISOString(),
    };
  });

  app.post("/api/fo/track", { preHandler: requireWallet }, async (req) => {
    const body = z
      .object({
        kind: z.string().min(1),
        thesis: z.string().min(1),
        symbol: z.string().optional(),
        orderId: z.string().optional(),
        relayId: z.string().optional(),
        citations: z
          .array(z.object({ source: z.string(), endpoint: z.string(), at: z.string() }))
          .optional(),
        outcome: z.enum(["HIT", "STOP", "DRIFT", "PENDING"]).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return { error: body.error.flatten() };
    const row = pushTrack({
      wallet: req.wallet!.address,
      kind: body.data.kind,
      thesis: body.data.thesis,
      symbol: body.data.symbol,
      orderId: body.data.orderId,
      relayId: body.data.relayId,
      citations: body.data.citations ?? [],
      outcome: body.data.outcome,
    });
    return { status: "LIVE", row };
  });

  app.get("/api/fo/track", { preHandler: requireWallet }, async (req) => {
    const wallet = req.wallet!.address.toLowerCase();
    const rows = trackStore.filter((r) => r.wallet.toLowerCase() === wallet);
    let indexMark: number | null = null;
    try {
      const raw = await ctx.soso.indexMarketSnapshot("ssimag7");
      indexMark = normalizeSsiSnapshot(raw, "ssimag7").nav;
    } catch {
      /* optional */
    }
    return {
      status: "LIVE",
      baseline: {
        terminalIndexId: "ssimag7",
        terminalIndexLevel: indexMark,
        note: "Compare proposals/fills against Terminal index level; token price is separate.",
      },
      rows,
      summary: "Verifiable Family Office action log with Terminal baseline.",
    };
  });

  app.post("/api/fo/guardian/simulate", { preHandler: requireWallet }, async (req) => {
    const g = ctx.skills.permissions.can("guardian", "propose", "alive");
    if (!g.ok) {
      return {
        error: "Guardian Skill disabled",
        reason: g.reason,
      };
    }
    const sim = {
      status: "SANDBOX",
      modeFrom: "alive",
      modeTo: "guardian",
      actions: [
        "Cancel risk-on open orders (policy)",
        "Propose shift toward USSI / conservative SSI sleeve",
        "Keep Terminal monitoring + Family Office Brief",
        "Block bridge-out / risk-on SoDEX size",
      ],
      uSSI: {
        symbol: "USSI",
        address: SSI_INDEX_TOKENS.USSI,
        basescan: basescanTokenUrl(SSI_INDEX_TOKENS.USSI),
        allocateUrl: `${ctx.env.SSI_APP_URL.replace(/\/$/, "")}/buy/USSI`,
      },
      note: "Simulation only — ModeController on-chain transition when contracts + policy allow.",
      summary: "Alive → Guardian risk-off path under Continuity Skill.",
      ts: new Date().toISOString(),
      wallet: req.wallet!.address,
    };
    pushTrack({
      wallet: req.wallet!.address,
      kind: "guardian_simulate",
      thesis: "Simulated Guardian risk-off",
      citations: [],
      outcome: "PENDING",
    });
    return sim;
  });

  app.get("/api/fo/estate/sandbox", { preHandler: requireWallet }, async (req) => {
    return {
      status: "SANDBOX",
      disclaimer:
        "Software sandbox — not legal advice, not multi-jurisdiction probate. Consult counsel.",
      steps: ["Verify beneficiary binding", "Dispute window", "Release per WealthPolicy", "Tax pack preview"],
      wallet: req.wallet!.address,
      summary: "Estate is a Continuity Skill — available when Heir mode is required.",
    };
  });

  /** Tool-cited Family Office AI — injects live Terminal brief before answering. */
  app.post("/api/fo/ai/chat", { preHandler: requireWallet }, async (req, reply) => {
    const body = z
      .object({
        message: z.string().min(1).max(8000),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const fo = ctx.skills.permissions.can("family_office", "read", "alive");
    if (!fo.ok) {
      return reply.code(403).send({ error: "Family Office Skill disabled", reason: fo.reason });
    }

    const citations: Array<{ source: string; endpoint: string; at: string; status: string }> = [];
    const stamp = (source: string, endpoint: string, status: string) => {
      citations.push({ source, endpoint, at: new Date().toISOString(), status });
    };

    let contextBlock = "";
    try {
      const etf = await ctx.soso.etfSummaryHistory({
        symbol: "BTC",
        country_code: "US",
        limit: 2,
      });
      stamp("etf", "/etfs/summary-history", "LIVE");
      contextBlock += `\nETF summary-history (BTC US): ${JSON.stringify(etf).slice(0, 1200)}`;
    } catch {
      stamp("etf", "/etfs/summary-history", "UNAVAILABLE");
    }
    try {
      const news = await ctx.soso.hotNews({ page: 1, page_size: 3 });
      stamp("feeds", "/news/hot", "LIVE");
      contextBlock += `\nHot news: ${JSON.stringify(news).slice(0, 1200)}`;
    } catch {
      stamp("feeds", "/news/hot", "UNAVAILABLE");
    }
    try {
      const raw = await ctx.soso.indexMarketSnapshot("ssimag7");
      const snap = normalizeSsiSnapshot(raw, "ssimag7");
      stamp("index", "/indices/ssimag7/market-snapshot", "LIVE");
      contextBlock += `\nssiMAG7 Terminal index level: nav=${snap.nav} change24hPct=${snap.change24h} (index level ≠ MAG7.ssi token price)`;
    } catch {
      stamp("index", "/indices/ssimag7/market-snapshot", "UNAVAILABLE");
    }

    const system = `You are HEIRLOCK Family Office AI on the SoSoValue stack.
Rules:
- Only use facts present in CONTEXT below; if missing, say UNAVAILABLE.
- Cite sources by module name (etf, feeds, index).
- Never invent SSI contract addresses, balances, or AUM.
- Refuse legal/tax advice.
- Be concise.

CONTEXT:${contextBlock || "\n(no live modules — say UNAVAILABLE)"}`;

    try {
      const res = await ctx.ai.chat({
        messages: [
          { role: "system", content: system },
          { role: "user", content: body.data.message },
        ],
        thinking: true,
        maxTokens: 1024,
      });
      return {
        status: "LIVE",
        provider: res.provider,
        model: res.model,
        content: res.content,
        reasoning: res.reasoning,
        latencyMs: res.latencyMs,
        citations: citations.map((c) => ({
          module: c.source,
          path: c.endpoint,
          status: c.status,
          at: c.at,
        })),
      };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "AI failure",
        citations: citations.map((c) => ({
          module: c.source,
          path: c.endpoint,
          status: c.status,
          at: c.at,
        })),
      });
    }
  });
}
