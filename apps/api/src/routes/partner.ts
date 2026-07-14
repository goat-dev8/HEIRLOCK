/**
 * Partner API — the Investment Memory surface that turns HEIRLOCK from a
 * stateless AI chat into a Verified Investment Partner: a brief that opens
 * with "what matters", a Why pack with real citations, a Decision Timeline,
 * and a persisted Memory of theses/lessons.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { AppContext } from "../app.js";
import { createRequireWallet } from "../auth/requireWallet.js";
import { computeLivingLoop } from "../fo/living-loop.js";
import * as memory from "../fo/memory.js";
import { listTrack } from "../fo/track.js";
import { canForWallet } from "../skills/persist.js";
import { readOnChainWealthPolicy } from "../valuechain/policy-read.js";
import { prisma } from "../db.js";

const ACTION_TYPES = ["hold", "ssi_allocate", "sodex_trade", "wait"] as const;
const USER_CHOICES = ["approved", "rejected", "deferred"] as const;
const THESIS_STATUSES = ["active", "challenged", "invalidated", "confirmed"] as const;

export async function registerPartnerRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);

  /** What matters now — the single composed brief the Partner Home opens with. */
  app.get("/api/fo/partner/brief", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    if (!fo.ok) {
      return reply.code(403).send({
        error: "Family Office Skill disabled — enable it in Skills to run the Partner brief",
        reason: fo.reason,
      });
    }

    const [loop, openTheses, whatChanged] = await Promise.all([
      computeLivingLoop(ctx, { foEnabled: fo.ok, foReason: undefined }),
      memory.listTheses(wallet, { limit: 20 }),
      memory.getWhatChanged(wallet),
    ]);

    const activeTheses = openTheses.filter((t) => t.status === "active" || t.status === "challenged");
    const topDeltas = whatChanged.deltas.slice(0, 5);

    const headline = loop.drift?.alert
      ? loop.proposal.title
      : topDeltas.length > 0
        ? `${topDeltas.length} thing${topDeltas.length === 1 ? "" : "s"} changed since yesterday`
        : String(loop.proposal.title);

    return {
      status: "LIVE",
      headline,
      rationale: loop.proposal.rationale,
      proposal: loop.proposal,
      drift: loop.drift,
      preflight: loop.preflight,
      citations: loop.citations,
      openTheses: activeTheses.map((t) => ({
        id: t.id,
        statement: t.statement,
        status: t.status,
        confidence: t.confidence,
        createdAt: t.createdAt,
      })),
      whatChanged: {
        status: whatChanged.status,
        deltaCount: whatChanged.deltas.length,
        topDeltas,
      },
      choices: [
        { id: "approve", label: "Approve", description: "Act on this under current WealthPolicy" },
        { id: "challenge", label: "Challenge", description: "Ask the Partner to defend this with fresh evidence" },
        { id: "wait", label: "Wait", description: "Log a decision to revisit later, take no action now" },
      ],
      ts: new Date().toISOString(),
    };
  });

  /** Decision Timeline — proposal -> choice -> execution -> outcome -> learning. */
  app.get("/api/fo/partner/timeline", { preHandler: requireWallet }, async (req) => {
    const wallet = req.wallet!.address;
    const [decisions, track, signedOrders] = await Promise.all([
      memory.listDecisions(wallet, 100),
      listTrack(wallet, 100),
      prisma.signedOrder.findMany({
        where: { walletAddress: wallet.toLowerCase() },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    type TimelineEntry = {
      id: string;
      type: "decision" | "track" | "order";
      at: string;
      title: string;
      detail: string | null;
      outcome: string | null;
      proofUrl: string | null;
    };

    const entries: TimelineEntry[] = [
      ...decisions.map((d): TimelineEntry => ({
        id: d.id,
        type: "decision",
        at: d.createdAt.toISOString(),
        title: `${d.actionType}${d.userChoice ? ` — ${d.userChoice}` : ""}`,
        detail: d.thesis?.statement ?? null,
        outcome: d.outcome,
        proofUrl: null,
      })),
      ...track.map((t): TimelineEntry => ({
        id: t.id,
        type: "track",
        at: new Date(t.createdAt).toISOString(),
        title: t.kind,
        detail: t.thesis,
        outcome: t.outcome,
        proofUrl: null,
      })),
      ...signedOrders.map((o): TimelineEntry => ({
        id: o.id,
        type: "order",
        at: o.createdAt.toISOString(),
        title: `${o.side} ${o.market}`,
        detail: o.notionalUsd ? `$${o.notionalUsd.toString()} notional` : null,
        outcome: o.status,
        proofUrl: o.proofUrl,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      status: "LIVE",
      entries: entries.slice(0, 100),
      summary: "Merged from Investment Memory decisions, Family Office track, and signed SoDEX orders.",
    };
  });

  /** Investment Memory — theses + the lessons learned from resolved ones. */
  app.get("/api/fo/partner/memory", { preHandler: requireWallet }, async (req) => {
    const wallet = req.wallet!.address;
    const query = z
      .object({ status: z.enum(THESIS_STATUSES).optional() })
      .safeParse(req.query ?? {});
    const theses = await memory.listTheses(wallet, {
      status: query.success ? query.data.status : undefined,
      limit: 100,
    });

    const lessons = theses
      .filter((t) => t.status === "invalidated" || t.status === "confirmed")
      .map((t) => ({
        thesisId: t.id,
        statement: t.statement,
        status: t.status,
        confidence: t.confidence,
        invalidatedReason: t.invalidatedReason,
        resolvedAt: t.updatedAt,
      }));

    return { status: "LIVE", theses, lessons };
  });

  /** Create or update a thesis — the only durable "belief" primitive. */
  app.post("/api/fo/partner/thesis", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const createSchema = z.object({
      statement: z.string().min(1).max(2000),
      confidence: z.number().min(0).max(100).optional(),
    });
    const updateSchema = z.object({
      thesisId: z.string().min(1),
      status: z.enum(THESIS_STATUSES).optional(),
      confidence: z.number().min(0).max(100).optional(),
      invalidatedReason: z.string().max(2000).optional(),
    });

    const asUpdate = updateSchema.safeParse(req.body);
    if (asUpdate.success) {
      const updated = await memory.updateThesis({ wallet, ...asUpdate.data });
      if (!updated) return reply.code(404).send({ error: "thesis_not_found" });
      return { status: "LIVE", thesis: updated };
    }

    const asCreate = createSchema.safeParse(req.body);
    if (!asCreate.success) {
      return reply.code(400).send({ error: asCreate.error.flatten() });
    }
    const thesis = await memory.createThesis({ wallet, ...asCreate.data, source: "user" });
    return { status: "LIVE", thesis };
  });

  /** Record a choice against a proposal — the "Choose" step in the journey. */
  app.post("/api/fo/partner/decision", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const body = z
      .object({
        thesisId: z.string().optional(),
        actionType: z.enum(ACTION_TYPES),
        proposal: z.record(z.string(), z.unknown()),
        userChoice: z.enum(USER_CHOICES).optional(),
        livingLoopHash: z.string().optional(),
        citations: z
          .array(z.object({ source: z.string(), endpoint: z.string(), at: z.string(), status: z.string() }))
          .optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    try {
      const decision = await memory.recordDecision({
        wallet,
        ...body.data,
        proposal: body.data.proposal as Prisma.InputJsonValue,
      });
      return { status: "LIVE", decision };
    } catch (err) {
      if (err instanceof Error && err.message === "thesis_not_found") {
        return reply.code(404).send({ error: "thesis_not_found" });
      }
      return reply.code(500).send({ error: err instanceof Error ? err.message : "decision_failed" });
    }
  });

  /** Update a decision's outcome once it's known (HIT / STOP / DRIFT). */
  app.post("/api/fo/partner/decision/:id/outcome", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    const body = z.object({ outcome: z.enum(["HIT", "STOP", "DRIFT", "PENDING"]) }).safeParse(req.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "invalid_request" });
    }
    const updated = await memory.updateDecisionOutcome({
      wallet,
      decisionId: params.data.id,
      outcome: body.data.outcome,
    });
    if (!updated) return reply.code(404).send({ error: "decision_not_found" });
    return { status: "LIVE", decision: updated };
  });

  /** Why Engine — expand a decision or the live proposal into cited evidence. */
  app.get("/api/fo/partner/why", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const query = z
      .object({ decisionId: z.string().optional(), proposalId: z.string().optional() })
      .safeParse(req.query ?? {});
    if (!query.success) return reply.code(400).send({ error: "invalid_query" });

    const onChain = await readOnChainWealthPolicy(ctx.env, "mainnet");
    const policy = {
      mode: onChain.modeName,
      source: onChain.source,
      maxNotionalUsd: onChain.maxNotionalUsd,
      address: onChain.address,
    };

    if (query.data.decisionId) {
      const decision = await memory.getDecision(wallet, query.data.decisionId);
      if (!decision) return reply.code(404).send({ error: "decision_not_found" });
      return {
        status: "LIVE",
        subject: "decision",
        decisionId: decision.id,
        actionType: decision.actionType,
        userChoice: decision.userChoice,
        outcome: decision.outcome,
        proposal: decision.proposalJson,
        thesis: decision.thesis
          ? {
              id: decision.thesis.id,
              statement: decision.thesis.statement,
              status: decision.thesis.status,
              confidence: decision.thesis.confidence,
            }
          : null,
        citations: decision.citationsJson ?? [],
        policy,
        recordedAt: decision.createdAt,
      };
    }

    // Default / proposalId=live: fresh evidence behind the current live proposal.
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    const loop = await computeLivingLoop(ctx, { foEnabled: fo.ok, foReason: fo.ok ? undefined : fo.reason });
    return {
      status: "LIVE",
      subject: "live_proposal",
      proposal: loop.proposal,
      rationale: loop.proposal.rationale,
      drift: loop.drift,
      citations: loop.citations,
      policy,
      ts: new Date().toISOString(),
    };
  });

  /** What Changed Since Yesterday — the daily delta digest. */
  app.get("/api/fo/partner/changed", { preHandler: requireWallet }, async (req) => {
    const wallet = req.wallet!.address;
    return memory.getWhatChanged(wallet);
  });
}
