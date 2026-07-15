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
  citations: LivingLoopResult["citations"];
  memoryUsed: { openTheses: number; recentDecisions: number };
  latencyMs: number;
};

function stripJsonish(s: string): string {
  return s.replace(/```[\s\S]*?```/g, "").trim();
}

function parseModeratorStance(text: string): DebateResult["synthesis"]["stance"] | null {
  const m = text.match(/FINAL:\s*(APPROVE|CHALLENGE|WAIT)/i);
  if (!m) return null;
  return m[1]!.toLowerCase() as DebateResult["synthesis"]["stance"];
}

function fallbackSynthesize(
  counsel: string,
  falsifier: string,
  loop: LivingLoopResult,
): DebateResult["synthesis"] {
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
Defend the current proposal using ONLY LIVE_EVIDENCE and MEMORY below.
Rules: never invent prices, AUM, or addresses. If a fact is UNAVAILABLE, say so.
Be concise (≤120 words). End with: "Counsel recommends: APPROVE|WAIT" and why.`;

  const falsifierSystem = `You are the FALSIFIER for HEIRLOCK's Living Investment Partner.
Your job is to KILL the proposal if evidence allows — find kill conditions.
Rules: never invent prices, AUM, or addresses. Prefer drift alerts, UNAVAILABLE sources, BLOCK preflight, and thesis contradictions.
Be concise (≤120 words). End with: "Falsifier recommends: CHALLENGE|WAIT|INVALIDATE" and why.`;

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
        maxTokens: 320,
        temperature: 0.2,
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
You receive Counsel and Falsifier arguments plus LIVE_EVIDENCE.
Rules:
- Never invent numbers.
- Prefer Falsifier when kill conditions are evidence-backed.
- Prefer WAIT when sides disagree without a clear evidence winner.
- Prefer APPROVE only when Counsel is evidence-backed AND Falsifier fails to hit a kill condition AND preflight is not BLOCK.
Output ≤100 words. End EXACTLY with one line: FINAL: APPROVE|CHALLENGE|WAIT`;

  const moderatorUser = `${evidenceBlock}

COUNSEL:
${counsel.content}

FALSIFIER:
${falsifier.content}

Issue the final recommendation.`;

  const moderator = await side("moderator", moderatorSystem, moderatorUser);
  const parsed = parseModeratorStance(moderator.content);
  const fallback = fallbackSynthesize(counsel.content, falsifier.content, loop);
  const synthesis: DebateResult["synthesis"] = parsed
    ? {
        stance: parsed,
        confidence: parsed === fallback.stance ? Math.max(fallback.confidence, 70) : 62,
        summary: moderator.content.replace(/\n?FINAL:\s*(APPROVE|CHALLENGE|WAIT)\s*$/i, "").trim() || fallback.summary,
      }
    : fallback;

  if (loop.preflight.verdict === "BLOCK") {
    synthesis.stance = "wait";
    synthesis.confidence = 90;
    synthesis.summary = "Moderator overridden: WealthPolicy preflight BLOCK — wait.";
  }

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
    citations: loop.citations,
    memoryUsed: { openTheses: open.length, recentDecisions: decisions.length },
    latencyMs: Date.now() - started,
  };
}
