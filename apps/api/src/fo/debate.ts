/**
 * Memory-bound Adversarial Debate — Counsel → Falsifier → Moderator.
 *
 * Distinct from Helix catalyst bull/bear: argues over THIS wallet's Investment
 * Memory + Living Loop evidence only. Moderator issues the final stance.
 * No invented numbers.
 */
import type { AppContext } from "../app.js";
import type { LivingLoopResult } from "./living-loop.js";
import * as memory from "./memory.js";
import { prisma } from "../db.js";

export type DebateSide = {
  role: "counsel" | "falsifier" | "moderator";
  content: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
};

export type ActionPlanStep = {
  id: string;
  phase: "understand" | "evidence" | "policy" | "action" | "verify" | "learn";
  title: string;
  detail: string;
  href?: string;
  required: boolean;
};

export type ActionPlan = {
  primaryAction: "ssi_allocate" | "sodex_trade" | "hold" | "wait";
  policyCapUsd: number | null;
  steps: ActionPlanStep[];
};

export type DebateResult = {
  status: "LIVE" | "DEGRADED";
  proposalTitle: string;
  counsel: DebateSide;
  falsifier: DebateSide;
  moderator: DebateSide;
  synthesis: {
    stance: "approve" | "challenge" | "wait";
    confidence: number;
    summary: string;
  };
  actionPlan: ActionPlan;
  citations: LivingLoopResult["citations"];
  memoryUsed: { openTheses: number; recentDecisions: number };
  latencyMs: number;
};

/** Deterministic post-debate plan: Understand → Evidence → Policy → Action → Verify → Learn */
export function buildActionPlan(
  loop: LivingLoopResult,
  synthesis: DebateResult["synthesis"],
  env: { ssiAppUrl?: string; maxNotionalUsd?: number },
): ActionPlan {
  const liveCount = loop.citations.filter((c) => c.status === "LIVE").length;
  const total = loop.citations.length;
  const drift = Boolean(loop.drift?.alert);
  const blocked = loop.preflight.verdict === "BLOCK";

  let primaryAction: ActionPlan["primaryAction"] = "hold";
  if (synthesis.stance === "wait" || blocked) {
    primaryAction = "wait";
  } else if (drift && synthesis.stance === "approve") {
    primaryAction = "ssi_allocate";
  } else if (synthesis.stance === "approve" && !drift) {
    primaryAction = "hold";
  } else if (synthesis.stance === "challenge") {
    primaryAction = "wait";
  }

  const ssiUrl =
    typeof loop.proposal.ssiAllocateUrl === "string"
      ? loop.proposal.ssiAllocateUrl
      : env.ssiAppUrl;

  const steps: ActionPlanStep[] = [
    {
      id: "understand",
      phase: "understand",
      title: "Understand the proposal",
      detail: String(loop.proposal.title ?? "Review Living Loop headline"),
      required: true,
    },
    {
      id: "evidence",
      phase: "evidence",
      title: "Verify evidence",
      detail: `${liveCount}/${total} citations LIVE — expand Proof before acting.`,
      required: liveCount < total,
    },
    {
      id: "policy",
      phase: "policy",
      title: "Policy gate",
      detail: blocked
        ? "Preflight BLOCK — do not Approve until continuity allows."
        : `Preflight ${loop.preflight.verdict} · cap $${env.maxNotionalUsd ?? "?"}`,
      required: blocked,
    },
    {
      id: "action",
      phase: "action",
      title:
        primaryAction === "ssi_allocate"
          ? "SSI allocate (official app)"
          : primaryAction === "wait"
            ? "Wait — log deferral"
            : "Hold — confirm exposure",
      detail:
        primaryAction === "ssi_allocate"
          ? "Use official SSI app — HEIRLOCK does not mint on your behalf."
          : String(loop.proposal.rationale ?? synthesis.summary),
      href:
        primaryAction === "ssi_allocate" && ssiUrl
          ? ssiUrl
          : undefined,
      required: synthesis.stance === "approve",
    },
    {
      id: "verify",
      phase: "verify",
      title: "Sign & verify fill",
      detail: "EIP-712 relay → trades + balance delta proof on Wealth.",
      href: "/app/wealth",
      required: false,
    },
    {
      id: "learn",
      phase: "learn",
      title: "Learn from outcome",
      detail: "Replay decision later; pulse will self-criticize if today would differ.",
      href: "/app/living",
      required: false,
    },
  ];

  return {
    primaryAction,
    policyCapUsd: env.maxNotionalUsd ?? null,
    steps,
  };
}

function stripJsonish(s: string): string {
  return s.replace(/```[\s\S]*?```/g, "").trim();
}

function parseModeratorStance(text: string): DebateResult["synthesis"]["stance"] | null {
  const m = text.match(/FINAL:\s*(APPROVE|CHALLENGE|WAIT)/i);
  if (!m) return null;
  return m[1]!.toLowerCase() as DebateResult["synthesis"]["stance"];
}

/** True when the Living Loop is proposing size / allocate — not a hold/review. */
export function isSizeIncreasingProposal(loop: LivingLoopResult): boolean {
  const action = String(loop.proposal.action ?? "").toUpperCase();
  const title = String(loop.proposal.title ?? "").toLowerCase();
  if (loop.drift?.alert) return true;
  if (action.includes("ALLOCATE") || action.includes("REBALANCE") || action.includes("BUY")) {
    return true;
  }
  if (title.includes("hold") || title.includes("confirm") || action.includes("REVIEW")) {
    return false;
  }
  return false;
}

/**
 * Soft gaps (missing on-chain quote on a HOLD) should not force INVALIDATE.
 * Hard gaps (BLOCK, or size-up without dual-source) force WAIT.
 */
export function classifyEvidenceGaps(loop: LivingLoopResult): {
  hard: string[];
  soft: string[];
} {
  const soft: string[] = [];
  const hard: string[] = [];

  if (loop.preflight.verdict === "BLOCK") {
    hard.push("preflight BLOCK");
  }

  const ssiToken = loop.citations.find((c) => c.source === "ssi_token");
  if (ssiToken?.status === "UNAVAILABLE") {
    soft.push("on-chain SSI token quote UNAVAILABLE");
  }
  if (loop.drift?.action === "UNAVAILABLE") {
    soft.push("dual-source SSI drift UNAVAILABLE");
  }
  const onChain = loop.proposal?.onChainToken as
    | { priceUsd?: number | null; change24hPct?: number | null }
    | null
    | undefined;
  if (onChain && onChain.priceUsd == null && onChain.change24hPct == null) {
    if (!soft.some((r) => r.includes("on-chain"))) {
      soft.push("on-chain token price UNAVAILABLE");
    }
  }

  if (isSizeIncreasingProposal(loop) && soft.length > 0) {
    hard.push(...soft);
    return { hard, soft: [] };
  }

  return { hard, soft };
}

/** @deprecated use classifyEvidenceGaps — kept for tests */
export function evidenceKillReasons(loop: LivingLoopResult): string[] {
  return classifyEvidenceGaps(loop).hard;
}

function fallbackSynthesize(
  counsel: string,
  falsifier: string,
  loop: LivingLoopResult,
): DebateResult["synthesis"] {
  const { hard } = classifyEvidenceGaps(loop);
  if (hard.length > 0) {
    return {
      stance: "wait",
      confidence: 88,
      summary: `Evidence incomplete (${hard.join("; ")}) — WAIT before Approve.`,
    };
  }

  const c = counsel.toLowerCase();
  const f = falsifier.toLowerCase();
  const falsifierStrong =
    /invalid|broken|does not hold|should not|wait|challenge|drift|unavailable|block/.test(f);
  const counselStrong = /still holds|approve|confirm|valid|supports/.test(c);

  if (loop.preflight.verdict === "BLOCK") {
    return {
      stance: "wait",
      confidence: 85,
      summary: "Preflight BLOCK overrides debate — do not approve under current WealthPolicy.",
    };
  }
  if (loop.drift?.alert && falsifierStrong) {
    return {
      stance: "challenge",
      confidence: 72,
      summary: "Falsifier lands: SSI dual-source drift is live. Challenge before size.",
    };
  }
  if (counselStrong && !falsifierStrong) {
    return {
      stance: "approve",
      confidence: 65,
      summary: "Counsel wins on cited evidence; Falsifier did not produce a kill condition hit.",
    };
  }
  if (falsifierStrong && !counselStrong) {
    return {
      stance: "challenge",
      confidence: 68,
      summary: "Falsifier found stronger kill conditions than Counsel's defense.",
    };
  }
  return {
    stance: "wait",
    confidence: 55,
    summary: "Both sides land punches — defer and re-check citations before Approve.",
  };
}

function applyEvidenceOverrides(
  synthesis: DebateResult["synthesis"],
  loop: LivingLoopResult,
): DebateResult["synthesis"] {
  const { hard } = classifyEvidenceGaps(loop);
  if (loop.preflight.verdict === "BLOCK") {
    return {
      stance: "wait",
      confidence: 90,
      summary: "Moderator overridden: WealthPolicy preflight BLOCK — wait.",
    };
  }
  if (hard.length > 0 && synthesis.stance === "approve") {
    return {
      stance: "wait",
      confidence: 90,
      summary: `Moderator overridden: cannot APPROVE size while ${hard.join("; ")}.`,
    };
  }
  return synthesis;
}

/** Instant debate when evidence already has hard kill conditions — no 3× LLM round-trip. */
export function buildDeterministicDebate(
  loop: LivingLoopResult,
  memoryUsed: { openTheses: number; recentDecisions: number },
  env: { ssiAppUrl?: string; maxNotionalUsd?: number },
  started: number,
): DebateResult {
  const kills = evidenceKillReasons(loop);
  const killLine = kills.join("; ") || "incomplete evidence";
  const counsel: DebateSide = {
    role: "counsel",
    content: `Cannot defend size increase: ${killLine}. Terminal index alone is not enough when the proposal requires proxy liquidity confirmation. Counsel recommends: WAIT — restore LIVE on-chain quotes and verified SoDEX aid before Approve.`,
  };
  const falsifier: DebateSide = {
    role: "falsifier",
    content: `Kill conditions hit: ${killLine}. Without LIVE on-chain token data, SoDEX proxy liquidity cannot be confirmed — the proposal's own precondition fails. Falsifier recommends: INVALIDATE — do not Approve until dual-source evidence is LIVE.`,
  };
  const synthesis: DebateResult["synthesis"] = {
    stance: "wait",
    confidence: 92,
    summary: `Evidence incomplete (${killLine}). Hold exposure; re-run after on-chain quotes recover.`,
  };
  const moderator: DebateSide = {
    role: "moderator",
    content: `${synthesis.summary}\nFINAL: WAIT`,
  };
  return {
    status: "LIVE",
    proposalTitle: String(loop.proposal.title ?? ""),
    counsel,
    falsifier,
    moderator,
    synthesis,
    actionPlan: buildActionPlan(loop, synthesis, env),
    citations: loop.citations,
    memoryUsed,
    latencyMs: Date.now() - started,
  };
}

/**
 * HOLD / review proposals with soft evidence gaps — approve the hold, not a size-up.
 * Richer than INVALIDATE, and still honest about missing dual-source quotes.
 */
export function buildHoldDebate(
  loop: LivingLoopResult,
  soft: string[],
  memoryUsed: { openTheses: number; recentDecisions: number },
  env: { ssiAppUrl?: string; maxNotionalUsd?: number },
  started: number,
): DebateResult {
  const gap = soft.join("; ") || "proxy quote incomplete";
  const change =
    loop.proposal.change24hPct != null
      ? `${Number(loop.proposal.change24hPct).toFixed(2)}% 24h`
      : "n/a";
  const level =
    loop.proposal.indexLevel != null ? String(loop.proposal.indexLevel) : "n/a";
  const counsel: DebateSide = {
    role: "counsel",
    content: `Proposal is a HOLD/review, not a size-up. Terminal MAG7 level ${level} (${change}) is LIVE. Soft gaps (${gap}) block increasing size, not holding. Counsel recommends: APPROVE — keep exposure; confirm SoDEX proxy liquidity before any larger trade.`,
  };
  const falsifier: DebateSide = {
    role: "falsifier",
    content: `Soft gaps remain: ${gap}. That kills any ALLOCATE/size increase today, but does not falsify a hold. Falsifier recommends: WAIT on size — challenge only if user tries to size up without LIVE dual-source quotes.`,
  };
  const synthesis: DebateResult["synthesis"] = {
    stance: "approve",
    confidence: 74,
    summary: `Approve hold under policy. Soft evidence gaps (${gap}) mean no size-up until dual-source quotes are LIVE.`,
  };
  const moderator: DebateSide = {
    role: "moderator",
    content: `${synthesis.summary}\nFINAL: APPROVE`,
  };
  return {
    status: "LIVE",
    proposalTitle: String(loop.proposal.title ?? ""),
    counsel,
    falsifier,
    moderator,
    synthesis,
    actionPlan: buildActionPlan(loop, synthesis, env),
    citations: loop.citations,
    memoryUsed,
    latencyMs: Date.now() - started,
  };
}

export async function runMemoryDebate(
  ctx: AppContext,
  wallet: string,
  loop: LivingLoopResult,
): Promise<DebateResult> {
  const started = Date.now();
  const [theses, decisions] = await Promise.all([
    memory.listTheses(wallet, { limit: 8 }),
    memory.listDecisions(wallet, 8),
  ]);
  const open = theses.filter((t) => t.status === "active" || t.status === "challenged");
  const memoryUsed = { openTheses: open.length, recentDecisions: decisions.length };
  const maxNotional = Math.min(ctx.env.TRADING_MAX_NOTIONAL_USD, ctx.env.MAINNET_TEST_MAX_NOTIONAL_USD);
  const planEnv = { ssiAppUrl: ctx.env.SSI_APP_URL, maxNotionalUsd: maxNotional };

  const gaps = classifyEvidenceGaps(loop);
  // Hard kills (size-up without dual-source, or BLOCK) → instant WAIT
  if (gaps.hard.length > 0) {
    const fast = buildDeterministicDebate(loop, memoryUsed, planEnv, started);
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { walletAddress: wallet.toLowerCase() },
      });
      await prisma.agentLog.create({
        data: {
          userId: profile?.id,
          provider: "deterministic",
          model: "evidence-kill",
          event: "fo.partner.debate",
          detail: JSON.stringify({
            proposal: loop.proposal.title,
            path: "deterministic-hard",
            kills: gaps.hard,
            synthesis: fast.synthesis,
          }),
          latencyMs: fast.latencyMs,
        },
      });
    } catch {
      /* non-fatal */
    }
    return fast;
  }

  // HOLD + soft gaps → approve hold (honest about missing quotes) without INVALIDATE spam
  if (gaps.soft.length > 0 && !isSizeIncreasingProposal(loop)) {
    const hold = buildHoldDebate(loop, gaps.soft, memoryUsed, planEnv, started);
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { walletAddress: wallet.toLowerCase() },
      });
      await prisma.agentLog.create({
        data: {
          userId: profile?.id,
          provider: "deterministic",
          model: "hold-soft-gap",
          event: "fo.partner.debate",
          detail: JSON.stringify({
            proposal: loop.proposal.title,
            path: "deterministic-hold",
            soft: gaps.soft,
            synthesis: hold.synthesis,
          }),
          latencyMs: hold.latencyMs,
        },
      });
    } catch {
      /* non-fatal */
    }
    return hold;
  }

  const evidenceBlock = `LIVE_EVIDENCE (authoritative — never invent numbers beyond this):
Proposal: ${JSON.stringify(loop.proposal).slice(0, 1000)}
Drift: ${loop.drift ? JSON.stringify(loop.drift).slice(0, 400) : "UNAVAILABLE"}
Preflight: ${loop.preflight.verdict}
Citations: ${loop.citations.map((c) => `${c.source}:${c.status}`).join(", ")}
Open theses: ${open.map((t) => `"${t.statement}" (${t.confidence}%)`).join(" | ") || "(none)"}
Recent choices: ${decisions
    .map((d) => `${d.actionType}/${d.userChoice ?? "?"}/${d.outcome}`)
    .join(", ") || "(none)"}`;

  const counselSystem = `You are COUNSEL for HEIRLOCK's Living Investment Partner.
Defend the proposal ONLY with LIVE_EVIDENCE. Never invent prices, AUM, or addresses.
Rules:
- HOLD/review proposals may be APPROVE even if proxy quote is incomplete — say so.
- Size-up / allocate proposals require LIVE dual-source evidence; otherwise WAIT.
Be concise (≤100 words). End with: "Counsel recommends: APPROVE|WAIT" and why.`;

  const falsifierSystem = `You are the FALSIFIER for HEIRLOCK's Living Investment Partner.
Attack weak size-ups. Prefer: drift alerts, UNAVAILABLE sources on ALLOCATE, BLOCK preflight, thesis contradictions.
Do not INVALIDATE a plain HOLD solely because a proxy quote is soft-missing — recommend WAIT on size instead.
Never invent prices. Be concise (≤100 words). End with: "Falsifier recommends: CHALLENGE|WAIT|INVALIDATE" and why.`;

  const userMsg = `Debate the proposal: "${String(loop.proposal.title ?? "current proposal")}".\n\n${evidenceBlock}`;

  async function side(
    role: DebateSide["role"],
    system: string,
    user: string,
  ): Promise<DebateSide> {
    try {
      const res = await ctx.ai.chat({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        thinking: false,
        maxTokens: 200,
        temperature: 0.15,
      });
      return {
        role,
        content: stripJsonish(res.content || "(empty)"),
        provider: res.provider,
        model: res.model,
        latencyMs: res.latencyMs,
      };
    } catch (err) {
      return {
        role,
        content: `UNAVAILABLE — agent failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  const [counsel, falsifier] = await Promise.all([
    side("counsel", counselSystem, userMsg),
    side("falsifier", falsifierSystem, userMsg),
  ]);

  const moderatorSystem = `You are the MODERATOR for HEIRLOCK's Living Investment Partner.
Rules: never invent numbers. Prefer Falsifier on evidence-backed kills. Prefer WAIT on disagreement or UNAVAILABLE critical data. APPROVE only when Counsel is evidence-backed, Falsifier fails a kill, and preflight is not BLOCK/CAUTION with missing on-chain data.
Output ≤80 words. End EXACTLY with: FINAL: APPROVE|CHALLENGE|WAIT`;

  const moderatorUser = `${evidenceBlock}

COUNSEL:
${counsel.content}

FALSIFIER:
${falsifier.content}

Issue the final recommendation.`;

  const moderator = await side("moderator", moderatorSystem, moderatorUser);
  const parsed = parseModeratorStance(moderator.content);
  const fallback = fallbackSynthesize(counsel.content, falsifier.content, loop);
  let synthesis: DebateResult["synthesis"] = parsed
    ? {
        stance: parsed,
        confidence: parsed === fallback.stance ? Math.max(fallback.confidence, 70) : 62,
        summary:
          moderator.content.replace(/\n?FINAL:\s*(APPROVE|CHALLENGE|WAIT)\s*$/i, "").trim() ||
          fallback.summary,
      }
    : fallback;

  synthesis = applyEvidenceOverrides(synthesis, loop);

  const actionPlan = buildActionPlan(loop, synthesis, planEnv);

  const degraded =
    counsel.content.startsWith("UNAVAILABLE") ||
    falsifier.content.startsWith("UNAVAILABLE") ||
    moderator.content.startsWith("UNAVAILABLE");

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { walletAddress: wallet.toLowerCase() },
    });
    await prisma.agentLog.create({
      data: {
        userId: profile?.id,
        provider: counsel.provider ?? falsifier.provider ?? moderator.provider ?? "unknown",
        model: `${counsel.model ?? "?"}|${falsifier.model ?? "?"}|${moderator.model ?? "?"}`,
        event: "fo.partner.debate",
        detail: JSON.stringify({
          proposal: loop.proposal.title,
          path: "llm",
          synthesis,
          counselPreview: counsel.content.slice(0, 300),
          falsifierPreview: falsifier.content.slice(0, 300),
          moderatorPreview: moderator.content.slice(0, 300),
        }),
        latencyMs: Date.now() - started,
      },
    });
  } catch {
    /* non-fatal */
  }

  return {
    status: degraded ? "DEGRADED" : "LIVE",
    proposalTitle: String(loop.proposal.title ?? ""),
    counsel,
    falsifier,
    moderator,
    synthesis,
    actionPlan,
    citations: loop.citations,
    memoryUsed,
    latencyMs: Date.now() - started,
  };
}
