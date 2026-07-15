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
import { runMemoryDebate } from "../fo/debate.js";
import { computeLivingLoop } from "../fo/living-loop.js";
import * as memory from "../fo/memory.js";
import {
  computeFalsifyAlerts,
  computeOpportunityRadar,
  computePortfolioDna,
  replayDecision,
} from "../fo/partner-intel.js";
import { runDailyPulse } from "../fo/pulse.js";
import { listTrack } from "../fo/track.js";
import { buildEvidenceGraph } from "../fo/evidence-graph.js";
import { computeLivingPortfolio } from "../fo/living-portfolio.js";
import { listRecentLessons } from "../fo/learning.js";
import { evaluatePartnerApprovalGate } from "../fo/continuity-gate.js";
import { linkDecisionToOrder } from "../fo/fill-learning.js";
import { buildCitationContentHash } from "../valuechain/attestation.js";
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

    const [loop, , whatChanged, dna, policy] = await Promise.all([
      computeLivingLoop(ctx, { foEnabled: fo.ok, foReason: undefined }),
      memory.listTheses(wallet, { limit: 20 }),
      memory.getWhatChanged(wallet),
      computePortfolioDna(wallet),
      readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null),
    ]);

    const topDeltas = whatChanged.deltas.slice(0, 5);
    const pulse = await runDailyPulse({ wallet, loop, policy });
    const livingPortfolio = await computeLivingPortfolio({
      ctx,
      wallet,
      loop,
      pulse,
      policy,
    });
    const evidenceGraph = await buildEvidenceGraph({ wallet, loop, policy });
    const falsify = pulse.falsify.length
      ? pulse.falsify
      : (await computeFalsifyAlerts(wallet, loop, policy)).filter(
          (f) => f.severity === "pressure" || f.severity === "broken",
        );
    const radar = pulse.radar.length ? pulse.radar : computeOpportunityRadar(loop, falsify, policy);

    // Refresh theses after pulse mutations
    const thesesAfter = await memory.listTheses(wallet, { limit: 20 });
    const activeAfter = thesesAfter.filter((t) => t.status === "active" || t.status === "challenged");
    const seen2 = new Set<string>();
    const uniqueAfter = activeAfter.filter((t) => {
      const key = t.statement.trim().toLowerCase();
      if (seen2.has(key)) return false;
      seen2.add(key);
      return true;
    });

    const continuityGate = evaluatePartnerApprovalGate({
      preflightVerdict: String(loop.preflight.verdict),
      policy,
      debateRan: false,
    });

    return {
      status: "LIVE",
      product: "Living Investment Partner",
      headline: pulse.headline,
      rationale: pulse.summary,
      proposal: loop.proposal,
      drift: loop.drift,
      preflight: loop.preflight,
      policy: policy
        ? {
            mode: policy.modeName,
            source: policy.source,
            maxNotionalUsd: policy.maxNotionalUsd,
            address: policy.address,
          }
        : null,
      continuityGate,
      citations: loop.citations,
      pulse: {
        ranAt: pulse.ranAt,
        summary: pulse.summary,
        answers: pulse.answers,
        mutations: pulse.mutations.slice(0, 12),
      },
      dna: {
        archetype: dna.archetype,
        tagline: dna.tagline,
        stats: dna.stats,
      },
      falsify: falsify.slice(0, 3),
      radar: radar.slice(0, 3),
      livingPortfolio,
      evidenceGraph: {
        summary: evidenceGraph.summary,
        nodeCount: evidenceGraph.nodes.length,
        edgeCount: evidenceGraph.edges.length,
      },
      openTheses: uniqueAfter.map((t) => ({
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
        { id: "debate", label: "Debate", description: "Counsel → Falsifier → Moderator" },
        { id: "approve", label: "Approve", description: "Act under WealthPolicy after debate" },
        { id: "challenge", label: "Challenge", description: "Push back with fresh evidence" },
        { id: "wait", label: "Wait", description: "Log and revisit later" },
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
        debate: z.record(z.string(), z.unknown()).optional(),
        policy: z.record(z.string(), z.unknown()).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const policyOnChain = await readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null);
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    const loop = await computeLivingLoop(ctx, { foEnabled: fo.ok, foReason: fo.ok ? undefined : fo.reason });

    if (body.data.userChoice === "approved") {
      const debatePayload = body.data.debate as { synthesis?: { stance?: string } } | undefined;
      const gate = evaluatePartnerApprovalGate({
        preflightVerdict: String(loop.preflight.verdict),
        policy: policyOnChain,
        debateRan: Boolean(body.data.debate),
        moderatorStance: debatePayload?.synthesis?.stance as "approve" | "challenge" | "wait" | undefined,
        userChoice: "approved",
      });
      if (!gate.canApprove) {
        return reply.code(403).send({
          error: "approval_blocked",
          reason: gate.blockReason,
          continuityGate: gate,
        });
      }
    }

    const livingLoopHash =
      body.data.livingLoopHash ??
      buildCitationContentHash({
        wallet,
        citations: body.data.citations ?? loop.citations,
        proposalAction: String((body.data.proposal as Record<string, unknown>).action ?? ""),
      });

    try {
      const decision = await memory.recordDecision({
        wallet,
        thesisId: body.data.thesisId,
        actionType: body.data.actionType,
        proposal: body.data.proposal as Prisma.InputJsonValue,
        userChoice: body.data.userChoice,
        livingLoopHash,
        citations: body.data.citations,
        debateJson: body.data.debate as Prisma.InputJsonValue | undefined,
        policyJson: (body.data.policy ?? {
          mode: policyOnChain?.modeName,
          source: policyOnChain?.source,
          maxNotionalUsd: policyOnChain?.maxNotionalUsd,
        }) as Prisma.InputJsonValue,
      });
      return { status: "LIVE", decision, nextStep: body.data.userChoice === "approved" ? "sign" : "learn" };
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
    const learning = await listRecentLessons(wallet, 3);
    return { status: "LIVE", decision: updated, learning };
  });

  /** Link an approved decision to a signed SoDEX order before relay. */
  app.post("/api/fo/partner/decision/:id/link-order", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    const body = z.object({ signedOrderId: z.string().min(1) }).safeParse(req.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "invalid_request" });
    }
    const ok = await linkDecisionToOrder({
      wallet,
      decisionId: params.data.id,
      signedOrderId: body.data.signedOrderId,
    });
    if (!ok) return reply.code(404).send({ error: "decision_not_found" });
    return { status: "LIVE", linked: true };
  });

  /** Continuity + policy gate for Partner Approve (client can pre-check). */
  app.get("/api/fo/partner/gate", { preHandler: requireWallet }, async (req) => {
    const wallet = req.wallet!.address;
    const query = z
      .object({ debateRan: z.enum(["true", "false"]).optional(), stance: z.string().optional() })
      .safeParse(req.query ?? {});
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    const [loop, policy] = await Promise.all([
      computeLivingLoop(ctx, { foEnabled: fo.ok, foReason: fo.ok ? undefined : fo.reason }),
      readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null),
    ]);
    const gate = evaluatePartnerApprovalGate({
      preflightVerdict: String(loop.preflight.verdict),
      policy,
      debateRan: query.success && query.data.debateRan === "true",
      moderatorStance: query.success ? (query.data.stance as "approve" | "challenge" | "wait" | undefined) : undefined,
    });
    return { status: "LIVE", gate, policy: policy ? { mode: policy.modeName, source: policy.source } : null };
  });

  /** Thesis evolution — birth, confidence history, lessons. */
  app.get("/api/fo/partner/thesis/:id/evolution", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });
    const evolution = await memory.getThesisEvolution(wallet, params.data.id);
    if (!evolution) return reply.code(404).send({ error: "thesis_not_found" });
    return { status: "LIVE", evolution };
  });

  /** Learning engine — recent lessons from outcomes + pulse. */
  app.get("/api/fo/partner/learning", { preHandler: requireWallet }, async (req) => {
    const wallet = req.wallet!.address;
    const lessons = await listRecentLessons(wallet, 15);
    return { status: "LIVE", lessons };
  });

  /** Evidence graph — full node/edge provenance for live proposal. */
  app.get("/api/fo/partner/evidence-graph", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    if (!fo.ok) return reply.code(403).send({ error: "Family Office Skill disabled", reason: fo.reason });
    const query = z.object({ decisionId: z.string().optional() }).safeParse(req.query ?? {});
    const [loop, policy] = await Promise.all([
      computeLivingLoop(ctx, { foEnabled: true }),
      readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null),
    ]);
    const graph = await buildEvidenceGraph({
      wallet,
      loop,
      policy,
      focusDecisionId: query.success ? query.data.decisionId : undefined,
    });
    return graph;
  });

  /** Living Portfolio — holdings + why allocation/risk/confidence changed. */
  app.get("/api/fo/partner/portfolio", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    if (!fo.ok) return reply.code(403).send({ error: "Family Office Skill disabled", reason: fo.reason });
    const [loop, policy] = await Promise.all([
      computeLivingLoop(ctx, { foEnabled: true }),
      readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null),
    ]);
    const pulse = await runDailyPulse({ wallet, loop, policy });
    const livingPortfolio = await computeLivingPortfolio({
      ctx,
      wallet,
      loop,
      pulse,
      policy,
    });
    return { status: "LIVE", portfolio: livingPortfolio };
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
        debate: decision.debateJson ?? null,
        fillProof: decision.fillProofJson ?? null,
        policy: decision.policyJson ?? policy,
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

  /** Portfolio DNA — behavioral fingerprint from decisions, not holdings. */
  app.get("/api/fo/partner/dna", { preHandler: requireWallet }, async (req) => {
    const dna = await computePortfolioDna(req.wallet!.address);
    return { status: "LIVE", dna };
  });

  /** What Invalidated My Thesis — falsification pressure from live evidence. */
  app.get("/api/fo/partner/falsify", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    if (!fo.ok) return reply.code(403).send({ error: "Family Office Skill disabled", reason: fo.reason });
    const [loop, policy] = await Promise.all([
      computeLivingLoop(ctx, { foEnabled: true }),
      readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null),
    ]);
    const alerts = await computeFalsifyAlerts(wallet, loop, policy);
    return { status: "LIVE", alerts, citations: loop.citations };
  });

  /** Opportunity Radar — policy-safe windows from SSI drift + falsify + continuity. */
  app.get("/api/fo/partner/radar", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    if (!fo.ok) return reply.code(403).send({ error: "Family Office Skill disabled", reason: fo.reason });
    const [loop, policy] = await Promise.all([
      computeLivingLoop(ctx, { foEnabled: true }),
      readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null),
    ]);
    const falsify = await computeFalsifyAlerts(wallet, loop, policy);
    const items = computeOpportunityRadar(loop, falsify, policy);
    return { status: "LIVE", items };
  });

  /** Decision Replay — would today's evidence change a past choice? */
  app.get("/api/fo/partner/replay", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const query = z.object({ decisionId: z.string().min(1) }).safeParse(req.query ?? {});
    if (!query.success) return reply.code(400).send({ error: "decisionId_required" });
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    const loop = await computeLivingLoop(ctx, { foEnabled: fo.ok, foReason: fo.ok ? undefined : fo.reason });
    const replay = await replayDecision(wallet, query.data.decisionId, loop);
    if (!replay) return reply.code(404).send({ error: "decision_not_found" });
    return { status: "LIVE", replay };
  });

  /**
   * Memory-bound Adversarial Debate — Counsel → Falsifier → Moderator.
   * Distinct from catalyst bull/bear: argues over THIS wallet's memory + Living Loop only.
   */
  app.post("/api/fo/partner/debate", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    if (!fo.ok) return reply.code(403).send({ error: "Family Office Skill disabled", reason: fo.reason });
    const [loop, policy] = await Promise.all([
      computeLivingLoop(ctx, { foEnabled: true }),
      readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null),
    ]);
    const debate = await runMemoryDebate(ctx, wallet, loop);

    // Persist full debate audit trail immediately (before Approve) — Counsel/Falsifier/Moderator + evidence.
    let debateDecisionId: string | null = null;
    try {
      const livingLoopHash = buildCitationContentHash({
        wallet,
        citations: loop.citations,
        proposalAction: String(loop.proposal.action ?? ""),
      });
      const audit = await memory.recordDecision({
        wallet,
        actionType: "wait",
        proposal: {
          ...(loop.proposal as Record<string, unknown>),
          kind: "debate_audit",
          title: `Debate · ${String(loop.proposal.title ?? "proposal")}`,
        } as Prisma.InputJsonValue,
        livingLoopHash,
        citations: loop.citations,
        debateJson: debate as unknown as Prisma.InputJsonValue,
        policyJson: {
          mode: policy?.modeName,
          source: policy?.source,
          maxNotionalUsd: policy?.maxNotionalUsd,
          debateStance: debate.synthesis.stance,
          debateConfidence: debate.synthesis.confidence,
        } as Prisma.InputJsonValue,
      });
      debateDecisionId = audit.id;
    } catch {
      /* audit persistence is best-effort — debate response still returns */
    }

    return { ...debate, debateDecisionId };
  });

  /** Force a Living Partner pulse (re-score + self-criticism) without waiting for brief. */
  app.post("/api/fo/partner/pulse", { preHandler: requireWallet }, async (req, reply) => {
    const wallet = req.wallet!.address;
    const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
    if (!fo.ok) return reply.code(403).send({ error: "Family Office Skill disabled", reason: fo.reason });
    const [loop, policy] = await Promise.all([
      computeLivingLoop(ctx, { foEnabled: true }),
      readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null),
    ]);
    const pulse = await runDailyPulse({ wallet, loop, policy, force: true });
    return pulse;
  });
}
