/**
 * Fast Partner brief — cached, read-only pulse on GET, parallel composition.
 */
import type { AppContext } from "../app.js";
import { getKv } from "../redis.js";
import { canForWallet } from "../skills/persist.js";
import { readOnChainWealthPolicy } from "../valuechain/policy-read.js";
import { evaluatePartnerApprovalGate } from "./continuity-gate.js";
import { computeLivingLoop } from "./living-loop.js";
import { computeLivingPortfolio } from "./living-portfolio.js";
import * as memory from "./memory.js";
import { computeFalsifyAlerts, computeOpportunityRadar, computePortfolioDna } from "./partner-intel.js";
import { runDailyPulse } from "./pulse.js";

const BRIEF_TTL_SEC = 60;
const memBrief = new Map<string, { at: number; body: Record<string, unknown> }>();

function briefCacheKey(wallet: string) {
  return `partner:brief:${wallet.toLowerCase()}`;
}

async function readBriefCache(wallet: string): Promise<Record<string, unknown> | null> {
  const kv = getKv();
  if (kv) {
    try {
      const raw = await kv.get(briefCacheKey(wallet));
      if (raw) return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  const hit = memBrief.get(wallet.toLowerCase());
  if (hit && Date.now() - hit.at < BRIEF_TTL_SEC * 1000) return hit.body;
  return null;
}

export async function writeBriefCache(wallet: string, body: Record<string, unknown>) {
  const key = wallet.toLowerCase();
  memBrief.set(key, { at: Date.now(), body });
  const kv = getKv();
  if (kv) {
    try {
      await kv.set(briefCacheKey(wallet), JSON.stringify(body), { ex: BRIEF_TTL_SEC });
    } catch {
      /* non-fatal */
    }
  }
}

export async function invalidateBriefCache(wallet: string) {
  memBrief.delete(wallet.toLowerCase());
  const kv = getKv();
  if (kv) {
    try {
      await kv.del(briefCacheKey(wallet));
    } catch {
      /* non-fatal */
    }
  }
}

function evidenceGraphMeta(loop: Awaited<ReturnType<typeof computeLivingLoop>>, thesisCount: number) {
  const live = loop.citations.filter((c) => c.status === "LIVE").length;
  const total = loop.citations.length;
  const nodeCount = total + Math.min(thesisCount, 6) + 3;
  const edgeCount = total + Math.min(thesisCount, 6) + 2;
  return {
    summary: `${nodeCount} nodes · ${edgeCount} edges · ${live}/${total} sources live`,
    nodeCount,
    edgeCount,
  };
}

export async function buildPartnerBrief(ctx: AppContext, wallet: string) {
  const cached = await readBriefCache(wallet);
  if (cached) return { ...cached, cached: true };

  const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
  if (!fo.ok) {
    return {
      error: "Family Office Skill disabled — enable it in Skills to run the Partner brief",
      reason: fo.reason,
      status: 403,
    };
  }

  const [loop, whatChanged, dna, policy, theses] = await Promise.all([
    computeLivingLoop(ctx, { foEnabled: true }),
    memory.getWhatChanged(wallet),
    computePortfolioDna(wallet),
    readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null),
    memory.listTheses(wallet, { limit: 20 }),
  ]);

  const pulse = await runDailyPulse({ wallet, loop, policy, persist: false });

  const falsify =
    pulse.falsify.length > 0
      ? pulse.falsify
      : (await computeFalsifyAlerts(wallet, loop, policy)).filter(
          (f) => f.severity === "pressure" || f.severity === "broken",
        );
  const radar = pulse.radar.length ? pulse.radar : computeOpportunityRadar(loop, falsify, policy);

  const livingPortfolio = await computeLivingPortfolio({
    ctx,
    wallet,
    loop,
    pulse,
    policy,
    skipBalances: true,
  });

  const activeAfter = theses.filter((t) => t.status === "active" || t.status === "challenged");
  const seen = new Set<string>();
  const uniqueAfter = activeAfter.filter((t) => {
    const key = t.statement.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const continuityGate = evaluatePartnerApprovalGate({
    preflightVerdict: String(loop.preflight.verdict),
    policy,
    debateRan: false,
  });

  const body = {
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
    evidenceGraph: evidenceGraphMeta(loop, uniqueAfter.length),
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
      topDeltas: whatChanged.deltas.slice(0, 5),
    },
    choices: [
      { id: "debate", label: "Debate", description: "Counsel → Falsifier → Moderator" },
      { id: "approve", label: "Approve", description: "Act under WealthPolicy after debate" },
      { id: "challenge", label: "Challenge", description: "Push back with fresh evidence" },
      { id: "wait", label: "Wait", description: "Log and revisit later" },
    ],
    ts: new Date().toISOString(),
    cached: false,
  };

  await writeBriefCache(wallet, body);
  return body;
}
