/**
 * Living Loop + FO Brief + Risk preflight + Track outcomes.
 * Family Office flagship Skill orchestration over SoSoValue + SoDEX + SSI.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app.js";
import { createRequireWallet } from "../auth/requireWallet.js";
import { listTrack, pushTrack } from "../fo/track.js";
import { foChatToolsForMessage, runFoTool } from "../fo/ai-tools.js";
import { computeLivingLoop } from "../fo/living-loop.js";
import * as memory from "../fo/memory.js";
import { canForWallet } from "../skills/persist.js";
import { normalizeSsiSnapshot } from "../sodex/mark-to-market.js";
import { SSI_INDEX_TOKENS, basescanTokenUrl } from "../ssi/addresses.js";
import { attestCitationBundle } from "../valuechain/attestation.js";
import { enterGuardianMode } from "../valuechain/mode.js";
import { prisma } from "../db.js";

export async function registerLivingRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);

  app.get("/api/fo/living-loop", { preHandler: requireWallet }, async (req, reply) => {
    const fo = await canForWallet(
      ctx.skills.registry,
      req.wallet!.address,
      "family_office",
      "read",
      "alive",
    );
    if (!fo.ok) {
      return reply.code(403).send({
        error: "Family Office Skill disabled — enable it in Skills to run the Living Loop",
        reason: fo.reason,
      });
    }

    const loop = await computeLivingLoop(ctx, { foEnabled: fo.ok, foReason: fo.ok ? undefined : fo.reason });
    const { citations, evidence, proposal, drift, preflight } = loop;

    const attestation = await attestCitationBundle({
      env: ctx.env,
      network: "mainnet",
      subjectWallet: req.wallet!.address,
      citations,
      proposalAction: String(proposal.action),
    }).catch((err) => ({
      contentHash: "",
      txHash: null as string | null,
      status: "skipped" as const,
      reason: err instanceof Error ? err.message : String(err),
    }));

    // Auto-snapshot: feeds the "What Changed Since Yesterday" digest.
    memory
      .upsertMarketSnapshot(req.wallet!.address, {
        proposalAction: String(proposal.action ?? ""),
        proposalTitle: String(proposal.title ?? ""),
        indexLevel: (proposal.indexLevel as number | null) ?? null,
        change24hPct: (proposal.change24hPct as number | null) ?? null,
        driftPct: drift?.driftPct ?? null,
        driftAlert: drift?.alert ?? false,
        liveCitations: loop.liveCount,
        totalCitations: citations.length,
        contentHash: attestation.contentHash,
      })
      .catch(() => {
        /* non-fatal — snapshot is best-effort */
      });

    return {
      status: "LIVE",
      skill: "family_office",
      mode: "alive",
      summary:
        "Governed Living Loop on Terminal + SSI + SoDEX under Family Office Skill permissions.",
      evidence,
      citations,
      proposal,
      drift,
      attestation,
      preflight,
      next: {
        confirmTrading: "/app/trading",
        allocateSsi: ctx.env.SSI_APP_URL,
        guide: "/app/guide",
        track: "/app/track",
      },
      ts: new Date().toISOString(),
    };
  });

  app.get("/api/fo/brief", { preHandler: requireWallet }, async (req, reply) => {
    const fo = await canForWallet(
      ctx.skills.registry,
      req.wallet!.address,
      "family_office",
      "read",
      "alive",
    );
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
    const row = await pushTrack({
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
    const rows = await listTrack(wallet);
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
    const g = await canForWallet(
      ctx.skills.registry,
      req.wallet!.address,
      "guardian",
      "propose",
      "alive",
    );
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
      note: "Simulation only — use POST /api/fo/guardian/enter for on-chain ModeController.enterGuardian().",
      summary: "Alive → Guardian risk-off path under Continuity Skill.",
      ts: new Date().toISOString(),
      wallet: req.wallet!.address,
    };
    await pushTrack({
      wallet: req.wallet!.address,
      kind: "guardian_simulate",
      thesis: "Simulated Guardian risk-off",
      citations: [],
      outcome: "PENDING",
    });
    return sim;
  });

  /**
   * Live ModeController.enterGuardian() via dedicated guardian/owner signer.
   * Never uses the end-user wallet private key.
   */
  app.post("/api/fo/guardian/enter", { preHandler: requireWallet }, async (req, reply) => {
    const g = await canForWallet(
      ctx.skills.registry,
      req.wallet!.address,
      "guardian",
      "execute",
      "alive",
    );
    if (!g.ok) {
      return reply.code(403).send({
        error: "Guardian Skill disabled or execute permission missing",
        reason: g.reason,
      });
    }

    const body = z
      .object({
        network: z.enum(["mainnet", "testnet"]).default("mainnet"),
        confirm: z.literal(true),
      })
      .safeParse(req.body ?? {});
    if (!body.success) {
      return reply.code(400).send({
        error: "confirm_required",
        detail: "Body must include { confirm: true, network?: 'mainnet'|'testnet' }",
      });
    }

    const result = await enterGuardianMode(ctx.env, body.data.network);
    await pushTrack({
      wallet: req.wallet!.address,
      kind: "guardian_enter",
      thesis: result.ok
        ? `Mode ${result.fromMode} → ${result.toMode}`
        : `Guardian enter failed: ${result.reason}`,
      citations: result.txHash
        ? [{ source: "valuechain", endpoint: result.txHash, at: new Date().toISOString() }]
        : [],
      outcome: result.ok ? "HIT" : "STOP",
      orderId: result.txHash ?? undefined,
    });

    if (!result.ok) {
      return reply.code(502).send({
        status: "FAILED",
        ...result,
        note: "Signer must be ModeController owner or guardian; never the user trading key.",
      });
    }

    return {
      status: "LIVE",
      ...result,
      note: "WealthPolicy.mode() is now Guardian — SoDEX prepare/place/relay will block new orders.",
    };
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

  /** Tool-cited Family Office AI — structured tool calls + persisted AgentLog trace. */
  app.post("/api/fo/ai/chat", { preHandler: requireWallet }, async (req, reply) => {
    const body = z
      .object({
        message: z.string().min(1).max(8000),
        thesisId: z.string().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const fo = await canForWallet(
      ctx.skills.registry,
      req.wallet!.address,
      "family_office",
      "read",
      "alive",
    );
    if (!fo.ok) {
      return reply.code(403).send({ error: "Family Office Skill disabled", reason: fo.reason });
    }

    const wallet = req.wallet!.address;
    const citations: Array<{ source: string; endpoint: string; at: string; status: string }> = [];
    const toolTrace: Array<{ name: string; args: string; resultPreview: string }> = [];
    const thesesSaved: Array<{ id: string; statement: string }> = [];
    const started = Date.now();

    // Prefetch in parallel — Living Loop is TTL-cached across Partner surfaces.
    const [memoryContext, focusedThesis, living] = await Promise.all([
      memory.memoryContextForAI(wallet),
      body.data.thesisId ? memory.getThesis(wallet, body.data.thesisId) : Promise.resolve(null),
      computeLivingLoop(ctx, { foEnabled: fo.ok, foReason: fo.reason }),
    ]);
    citations.push(...living.citations);

    const proposalSlim = {
      title: living.proposal.title,
      rationale: living.proposal.rationale,
      action: living.proposal.action,
      change24hPct: living.proposal.change24hPct,
      indexLevel: living.proposal.indexLevel,
    };
    const driftSlim = living.drift
      ? {
          alert: living.drift.alert,
          action: living.drift.action,
          signal: living.drift.signal,
          driftPct: living.drift.driftPct,
        }
      : null;

    const liveEvidence = `LIVE_EVIDENCE (already fetched — answer from this; do not re-fetch):
Proposal: ${JSON.stringify(proposalSlim)}
Drift: ${driftSlim ? JSON.stringify(driftSlim) : "UNAVAILABLE"}
Preflight: ${living.preflight.verdict} (${living.liveCount}/${living.citations.length} LIVE)`;

    const system = `You are HEIRLOCK's Investment Partner on SoSoValue (Terminal → Partner → SSI → SoDEX → ValueChain).

Rules:
- Answer from LIVE_EVIDENCE + MEMORY only unless a tool is provided for a real gap.
- Never invent prices, balances, addresses, or AUM. Say UNAVAILABLE when missing.
- Cite modules by name (etf, feeds, macro, index, sodex, memory, policy).
- Refuse legal/tax advice. Be concise (≤180 words) and decisive.
- If asked to remember/save a view and save_thesis is available, call it once.

${liveEvidence}

MEMORY:
${memoryContext}${
      focusedThesis
        ? `\n\nFOCUSED THESIS:\n"${focusedThesis.statement}" (${focusedThesis.status}, ${focusedThesis.confidence}%)`
        : ""
    }`;

    type Msg = {
      role: "system" | "user" | "assistant" | "tool";
      content: string;
      tool_call_id?: string;
      name?: string;
    };
    const messages: Msg[] = [
      { role: "system", content: system },
      { role: "user", content: body.data.message },
    ];

    const tools = foChatToolsForMessage(body.data.message);
    const chatOpts = {
      thinking: false as const,
      maxTokens: 448,
      temperature: 0.3,
    };

    try {
      let res = await ctx.ai.chat({
        messages: messages as never,
        ...(tools.length ? { tools } : {}),
        ...chatOpts,
      });

      // At most one tool round — challenge/review chats usually need zero.
      if (res.toolCalls?.length && tools.length) {
        messages.push({
          role: "assistant",
          content: res.content || "",
          ...({ tool_calls: res.toolCalls } as object),
        } as Msg);

        for (const call of res.toolCalls) {
          const executed = await runFoTool(
            ctx,
            call.function.name,
            call.function.arguments ?? "{}",
            wallet,
          );
          citations.push(executed.citation);
          toolTrace.push({
            name: call.function.name,
            args: call.function.arguments ?? "{}",
            resultPreview: executed.result.slice(0, 400),
          });
          if (call.function.name === "save_thesis") {
            try {
              const parsed = JSON.parse(executed.result) as {
                saved?: boolean;
                thesisId?: string;
                statement?: string;
              };
              if (parsed.saved && parsed.thesisId) {
                thesesSaved.push({ id: parsed.thesisId, statement: parsed.statement ?? "" });
              }
            } catch {
              /* non-fatal */
            }
          }
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: executed.result,
          });
        }

        res = await ctx.ai.chat({
          messages: messages as never,
          ...chatOpts,
        });
      }

      const latencyMs = Date.now() - started;
      try {
        const profile = await prisma.userProfile.findUnique({
          where: { walletAddress: wallet.toLowerCase() },
        });
        await prisma.agentLog.create({
          data: {
            userId: profile?.id,
            provider: res.provider,
            model: res.model,
            event: "fo.ai.chat",
            detail: JSON.stringify({
              message: body.data.message.slice(0, 500),
              toolTrace,
              toolsOffered: tools.map((t) => t.function.name),
              citations,
              contentPreview: (res.content ?? "").slice(0, 800),
              wallMs: latencyMs,
            }),
            latencyMs: res.latencyMs,
          },
        });
      } catch {
        /* non-fatal */
      }

      return {
        status: "LIVE",
        provider: res.provider,
        model: res.model,
        content: res.content,
        reasoning: res.reasoning,
        latencyMs,
        toolTrace,
        thesesSaved,
        citations: citations.map((c) => ({
          module: c.source,
          path: c.endpoint,
          status: c.status,
          at: c.at,
        })),
      };
    } catch (toolErr) {
      // Fast fallback: no extra Terminal fetches — evidence already in system prompt.
      try {
        const res = await ctx.ai.chat({
          messages: [
            { role: "system", content: system },
            { role: "user", content: body.data.message },
          ],
          ...chatOpts,
        });
        return {
          status: "LIVE",
          provider: res.provider,
          model: res.model,
          content: res.content,
          reasoning: res.reasoning,
          latencyMs: Date.now() - started,
          toolTrace,
          thesesSaved: [],
          fallback: true,
          fallbackReason: toolErr instanceof Error ? toolErr.message : String(toolErr),
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
          toolTrace,
        });
      }
    }
  });
}
