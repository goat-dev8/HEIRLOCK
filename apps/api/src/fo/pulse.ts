/**
 * Autonomous Daily Pulse — the Living Partner keeps thinking after you leave.
 *
 * On each Decide open (throttled), re-scores theses, auto-challenges under
 * falsification pressure, replays recent approvals, and emits a digest:
 * what changed, which theses got stronger/weaker, which past recs look wrong.
 *
 * Confidence moves only from Living Loop + falsify evidence — never invented.
 */
import type { Prisma } from "@prisma/client";
import type { LivingLoopResult } from "./living-loop.js";
import * as memory from "./memory.js";
import {
  computeFalsifyAlerts,
  computeOpportunityRadar,
  replayDecision,
  type FalsifyAlert,
  type RadarItem,
} from "./partner-intel.js";
import type { OnChainWealthPolicy } from "../valuechain/policy-read.js";
import { prisma } from "../db.js";

export type ConfidencePoint = {
  at: string;
  confidence: number;
  reason: string;
  delta: number;
};

export type ThesisEvolution = {
  thesisId: string;
  statement: string;
  from: number;
  to: number;
  delta: number;
  status: string;
  reason: string;
};

export type MistakeLesson = {
  decisionId: string;
  thenChoice: string | null;
  thenAction: string;
  lesson: string;
  todayVerdict: string;
};

export type DailyPulse = {
  status: "LIVE";
  ranAt: string;
  headline: string;
  summary: string;
  answers: {
    whatChanged: string[];
    whyChanged: string[];
    weakerTheses: ThesisEvolution[];
    strongerTheses: ThesisEvolution[];
    opportunitiesAppeared: string[];
    opportunitiesGone: string[];
    riskUp: string[];
    riskDown: string[];
    wrongRecommendations: MistakeLesson[];
    confidenceRising: ThesisEvolution[];
  };
  mutations: Array<{ thesisId: string; action: string; detail: string }>;
  radar: RadarItem[];
  falsify: FalsifyAlert[];
};

type EvidenceEnvelope = {
  citations?: unknown;
  confidenceHistory?: ConfidencePoint[];
  killConditions?: string[];
  lastPulseAt?: string;
};

function asEnvelope(raw: unknown): EvidenceEnvelope {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { citations: raw ?? [], confidenceHistory: [] };
  }
  return raw as EvidenceEnvelope;
}

export function scoreDelta(severity: FalsifyAlert["severity"], driftAlert: boolean, preflight: string): number {
  if (severity === "broken" || preflight === "BLOCK") return -25;
  if (severity === "pressure") return -12;
  if (driftAlert) return -8;
  if (preflight === "APPROVE") return 4;
  return 1;
}

export async function runDailyPulse(opts: {
  wallet: string;
  loop: LivingLoopResult;
  policy?: OnChainWealthPolicy | null;
  force?: boolean;
  /** When false (GET brief), skip DB writes and replay — background pulse still persists. */
  persist?: boolean;
}): Promise<DailyPulse> {
  const { wallet, loop, policy, persist = true } = opts;
  const ranAt = new Date().toISOString();
  const [falsify, theses, decisions, whatChanged] = await Promise.all([
    computeFalsifyAlerts(wallet, loop, policy),
    memory.listTheses(wallet, { limit: 50 }),
    memory.listDecisions(wallet, 12),
    memory.getWhatChanged(wallet),
  ]);
  const radar = computeOpportunityRadar(loop, falsify, policy);
  const open = theses.filter((t) => t.status === "active" || t.status === "challenged");

  const mutations: DailyPulse["mutations"] = [];
  const weaker: ThesisEvolution[] = [];
  const stronger: ThesisEvolution[] = [];
  const rising: ThesisEvolution[] = [];

  const alertByThesis = new Map(falsify.map((f) => [f.thesisId, f]));
  const seenStatements = new Set<string>();

  for (const t of open) {
    const stmtKey = t.statement.trim().toLowerCase();
    if (seenStatements.has(stmtKey)) continue;
    seenStatements.add(stmtKey);
    const alert = alertByThesis.get(t.id);
    const severity = alert?.severity ?? "watch";
    const delta = scoreDelta(severity, Boolean(loop.drift?.alert), String(loop.preflight.verdict));
    const next = Math.max(5, Math.min(95, t.confidence + delta));
    if (next === t.confidence && severity === "watch") continue;

    const reason =
      alert?.reason ??
      (delta > 0
        ? `Preflight ${loop.preflight.verdict} and stable citations — confidence edged up.`
        : `Evidence pressure — confidence edged down.`);

    const env = asEnvelope(t.evidenceJson);
    const history = [...(env.confidenceHistory ?? [])];
    // At most one confidence write per thesis per 30 minutes unless force
    if (!opts.force && env.lastPulseAt && Date.now() - new Date(env.lastPulseAt).getTime() < 30 * 60_000) {
      continue;
    }

    history.push({ at: ranAt, confidence: next, reason, delta: next - t.confidence });
    while (history.length > 40) history.shift();

    let status = t.status;
    let invalidatedReason = t.invalidatedReason ?? undefined;
    if (severity === "broken" && t.status !== "invalidated") {
      status = "challenged";
      invalidatedReason = alert?.reason ?? "Pulse: broken kill condition — auto-challenged.";
      mutations.push({ thesisId: t.id, action: "auto_challenge", detail: invalidatedReason });
    } else if (severity === "pressure" && t.status === "active") {
      status = "challenged";
      invalidatedReason = alert?.reason ?? "Pulse: falsification pressure — auto-challenged.";
      mutations.push({ thesisId: t.id, action: "auto_challenge", detail: invalidatedReason });
    }

    const evidencePayload: EvidenceEnvelope = {
      ...env,
      confidenceHistory: history,
      killConditions: alert?.killConditions ?? env.killConditions,
      lastPulseAt: ranAt,
      citations: env.citations ?? [],
    };

    if (persist) {
      await prisma.investmentThesis.update({
        where: { id: t.id },
        data: {
          confidence: next,
          status,
          ...(invalidatedReason ? { invalidatedReason } : {}),
          evidenceJson: evidencePayload as Prisma.InputJsonValue,
        },
      });
    }

    const evo: ThesisEvolution = {
      thesisId: t.id,
      statement: t.statement,
      from: t.confidence,
      to: next,
      delta: next - t.confidence,
      status,
      reason,
    };
    if (next < t.confidence) weaker.push(evo);
    if (next > t.confidence) {
      stronger.push(evo);
      rising.push(evo);
    }
    mutations.push({
      thesisId: t.id,
      action: "confidence_update",
      detail: `${t.confidence} → ${next} (${delta >= 0 ? "+" : ""}${delta})`,
    });
  }

  // Self-criticism: replay recent approvals — would today change the call?
  const wrong: MistakeLesson[] = [];
  if (persist) {
    const approved = decisions.filter((d) => d.userChoice === "approved").slice(0, 5);
    const replays = await Promise.all(approved.map((d) => replayDecision(wallet, d.id, loop)));
    for (let i = 0; i < approved.length; i++) {
      const d = approved[i]!;
      const replay = replays[i];
      if (!replay) continue;
      if (replay.todayVerdict === "would_change" || replay.todayVerdict === "insufficient_evidence") {
        wrong.push({
          decisionId: d.id,
          thenChoice: d.userChoice,
          thenAction: d.actionType,
          lesson: `I recommended ${d.actionType}/${d.userChoice}. Today: ${replay.todayVerdict}. ${replay.reason}`,
          todayVerdict: replay.todayVerdict,
        });
      }
    }
  }

  const whatChangedLines =
    whatChanged.deltas.length > 0
      ? whatChanged.deltas.slice(0, 5).map((d) => `${d.field}: ${String(d.from)} → ${String(d.to)}`)
      : ["No daily snapshot delta yet — baseline still building."];

  const whyChanged: string[] = [];
  if (loop.drift?.alert) {
    whyChanged.push(
      `SSI dual-source drift alert (|Δ| ${loop.drift.driftPct ?? "?"}%) — Terminal vs on-chain token diverged.`,
    );
  }
  if (loop.preflight.verdict === "BLOCK") {
    whyChanged.push("WealthPolicy preflight BLOCKED — continuity gate closed.");
  }
  if (pressureCount(falsify) > 0) {
    whyChanged.push(`${pressureCount(falsify)} open thesis under falsification pressure.`);
  }
  if (whyChanged.length === 0) {
    whyChanged.push(`Living Loop stable — preflight ${loop.preflight.verdict}, citations mostly LIVE.`);
  }

  const oppAppeared = radar
    .filter((r) => r.urgency === "now" || r.urgency === "soon")
    .map((r) => r.title);
  const oppGone =
    !loop.drift?.alert && radar.every((r) => r.kind === "hold_steady")
      ? ["No forced SSI drift opportunity — hold-steady window."]
      : [];

  const riskUp = [
    ...weaker.map((w) => `Thesis confidence ${w.from}→${w.to}: ${w.statement.slice(0, 80)}`),
    ...(loop.preflight.verdict === "BLOCK" ? ["Policy BLOCK"] : []),
  ];
  const riskDown = stronger.map(
    (s) => `Thesis confidence ${s.from}→${s.to}: ${s.statement.slice(0, 80)}`,
  );

  const headline =
    wrong.length > 0
      ? `${wrong.length} past approval${wrong.length === 1 ? "" : "s"} look different today`
      : weaker.length > 0
        ? `${weaker.length} thesis got weaker overnight`
        : oppAppeared[0] ?? String(loop.proposal.title ?? "Partner pulse");

  const summary = [
    `Pulse re-scored ${open.length} open theses.`,
    mutations.filter((m) => m.action === "auto_challenge").length
      ? `${mutations.filter((m) => m.action === "auto_challenge").length} auto-challenged.`
      : "No auto-challenges.",
    wrong.length ? `${wrong.length} self-criticism lesson${wrong.length === 1 ? "" : "s"}.` : "No approval regrets detected.",
  ].join(" ");

  if (persist) {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { walletAddress: wallet.toLowerCase() },
      });
      await prisma.agentLog.create({
        data: {
          userId: profile?.id,
          provider: "heirlock",
          model: "pulse",
          event: "fo.partner.pulse",
          detail: JSON.stringify({
            headline,
            weaker: weaker.length,
            stronger: stronger.length,
            wrong: wrong.length,
            mutations: mutations.length,
          }),
          latencyMs: 0,
        },
      });
    } catch {
      /* non-fatal */
    }

    try {
      await memory.upsertMarketSnapshot(wallet, {
        proposalTitle: String(loop.proposal.title ?? ""),
        proposalAction: String(loop.proposal.action ?? ""),
        driftPct: loop.drift?.driftPct ?? null,
        preflight: String(loop.preflight.verdict),
        liveCount: loop.citations.filter((c) => c.status === "LIVE").length,
        citationTotal: loop.citations.length,
        pulsedAt: ranAt,
      } as Prisma.InputJsonValue);
    } catch {
      /* non-fatal */
    }
  }

  return {
    status: "LIVE",
    ranAt,
    headline,
    summary,
    answers: {
      whatChanged: whatChangedLines,
      whyChanged,
      weakerTheses: weaker,
      strongerTheses: stronger,
      opportunitiesAppeared: oppAppeared,
      opportunitiesGone: oppGone,
      riskUp,
      riskDown,
      wrongRecommendations: wrong,
      confidenceRising: rising,
    },
    mutations,
    radar,
    falsify: falsify.filter((f) => f.severity !== "watch").slice(0, 5),
  };
}

function pressureCount(falsify: FalsifyAlert[]): number {
  return falsify.filter((f) => f.severity === "pressure" || f.severity === "broken").length;
}
