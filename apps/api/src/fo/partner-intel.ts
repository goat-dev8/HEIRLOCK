/**
 * Partner Intelligence — deterministic capabilities that make HEIRLOCK a
 * Falsifying Partner (not a chatbot): Portfolio DNA, thesis falsification,
 * opportunity radar, and decision replay.
 *
 * Numbers come only from Investment Memory + Living Loop citations.
 * No invented market stats.
 */
import type { LivingLoopResult } from "./living-loop.js";
import * as memory from "./memory.js";
import { listTrack } from "./track.js";
import type { OnChainWealthPolicy } from "../valuechain/policy-read.js";

export type PortfolioDna = {
  archetype: string;
  tagline: string;
  traits: Array<{ id: string; label: string; value: string; score: number }>;
  stats: {
    decisions: number;
    approveRate: number;
    challengeRate: number;
    waitRate: number;
    hitRate: number | null;
    openTheses: number;
    avgConfidence: number | null;
  };
};

export type FalsifyAlert = {
  thesisId: string;
  statement: string;
  severity: "watch" | "pressure" | "broken";
  reason: string;
  killConditions: string[];
  evidence: Array<{ field: string; value: string; status: string }>;
  suggestedStatus: "challenged" | "invalidated" | null;
};

export type RadarItem = {
  id: string;
  kind: "ssi_drift" | "policy_window" | "thesis_risk" | "hold_steady";
  title: string;
  detail: string;
  urgency: "now" | "soon" | "background";
  actionHint: "approve" | "challenge" | "wait" | "ssi" | "wealth";
};

export type ReplayResult = {
  decisionId: string;
  thenChoice: string | null;
  thenAction: string;
  thenProposalTitle: string | null;
  todayVerdict: "still_hold" | "would_change" | "insufficient_evidence";
  reason: string;
  todayProposalTitle: string;
  citationsLive: number;
  citationsTotal: number;
};

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

export async function computePortfolioDna(wallet: string): Promise<PortfolioDna> {
  const [decisions, theses, track] = await Promise.all([
    memory.listDecisions(wallet, 200),
    memory.listTheses(wallet, { limit: 100 }),
    listTrack(wallet, 100),
  ]);

  const n = decisions.length;
  const approved = decisions.filter((d) => d.userChoice === "approved").length;
  const rejected = decisions.filter((d) => d.userChoice === "rejected").length;
  const deferred = decisions.filter((d) => d.userChoice === "deferred").length;
  const resolvedTrack = track.filter((t) => t.outcome === "HIT" || t.outcome === "STOP");
  const hits = resolvedTrack.filter((t) => t.outcome === "HIT").length;
  const openTheses = theses.filter((t) => t.status === "active" || t.status === "challenged");
  const avgConfidence =
    openTheses.length > 0
      ? Math.round(openTheses.reduce((a, t) => a + t.confidence, 0) / openTheses.length)
      : null;

  const approveRate = pct(approved, n);
  const challengeRate = pct(rejected, n);
  const waitRate = pct(deferred, n);
  const hitRate = resolvedTrack.length > 0 ? pct(hits, resolvedTrack.length) : null;

  let archetype = "Blank slate";
  let tagline = "Not enough decisions yet — Approve, Challenge, or Wait to grow your DNA.";
  if (n >= 3) {
    if (challengeRate >= 40) {
      archetype = "Falsifier";
      tagline = "You stress-test proposals before acting — conviction stays earned.";
    } else if (approveRate >= 55 && (hitRate == null || hitRate >= 50)) {
      archetype = "Executor";
      tagline = "You convert evidence into action under policy.";
    } else if (waitRate >= 40) {
      archetype = "Patient capital";
      tagline = "You defer more than you act — liquidity of time is your edge.";
    } else if (openTheses.length >= 3 && (avgConfidence ?? 0) >= 65) {
      archetype = "Thesis compounder";
      tagline = "You hold multiple live beliefs and let evidence prune them.";
    } else {
      archetype = "Balanced partner";
      tagline = "Approve, challenge, and wait stay in tension — healthy.";
    }
  }

  return {
    archetype,
    tagline,
    traits: [
      { id: "approve", label: "Approve bias", value: `${approveRate}%`, score: approveRate },
      { id: "challenge", label: "Challenge bias", value: `${challengeRate}%`, score: challengeRate },
      { id: "wait", label: "Wait bias", value: `${waitRate}%`, score: waitRate },
      {
        id: "hit",
        label: "Outcome HIT rate",
        value: hitRate == null ? "n/a" : `${hitRate}%`,
        score: hitRate ?? 0,
      },
    ],
    stats: {
      decisions: n,
      approveRate,
      challengeRate,
      waitRate,
      hitRate,
      openTheses: openTheses.length,
      avgConfidence,
    },
  };
}

function defaultKillConditions(statement: string): string[] {
  const s = statement.toLowerCase();
  const kills: string[] = [];
  if (s.includes("mag7") || s.includes("ssi") || s.includes("index")) {
    kills.push("SSI terminal↔token drift alert fires");
    kills.push("Terminal 24h move reverses sharply vs token");
  }
  if (s.includes("liquidity") || s.includes("sodex") || s.includes("size")) {
    kills.push("SoDEX proxy liquidity or capability becomes UNAVAILABLE");
  }
  if (s.includes("hold") || s.includes("exposure")) {
    kills.push("Risk preflight returns BLOCK under WealthPolicy");
  }
  kills.push("Majority of live citations turn UNAVAILABLE");
  return [...new Set(kills)];
}

export async function computeFalsifyAlerts(
  wallet: string,
  loop: LivingLoopResult,
  policy?: OnChainWealthPolicy | null,
): Promise<FalsifyAlert[]> {
  const theses = await memory.listTheses(wallet, { limit: 50 });
  const active = theses.filter((t) => t.status === "active" || t.status === "challenged");
  const liveCount = loop.citations.filter((c) => c.status === "LIVE").length;
  const total = loop.citations.length || 1;
  const alerts: FalsifyAlert[] = [];

  for (const t of active) {
    const kills = defaultKillConditions(t.statement);
    const evidence: FalsifyAlert["evidence"] = [
      {
        field: "ssi_drift_alert",
        value: loop.drift?.alert ? "true" : "false",
        status: loop.drift ? "LIVE" : "UNAVAILABLE",
      },
      {
        field: "preflight",
        value: String(loop.preflight.verdict),
        status: "LIVE",
      },
      {
        field: "citations_live",
        value: `${liveCount}/${total}`,
        status: liveCount === total ? "LIVE" : "PARTIAL",
      },
      {
        field: "policy_mode",
        value: policy?.modeName ?? "unknown",
        status: policy?.source === "valuechain" ? "LIVE" : "UNAVAILABLE",
      },
    ];

    let severity: FalsifyAlert["severity"] = "watch";
    let reason = "Kill conditions not met — thesis still under observation.";
    let suggestedStatus: FalsifyAlert["suggestedStatus"] = null;

    const stmt = t.statement.toLowerCase();
    const mag7ish = /mag7|ssi|index|hold/.test(stmt);
    const liqish = /liquidity|sodex|size/.test(stmt);

    if (loop.preflight.verdict === "BLOCK") {
      severity = "broken";
      reason = "WealthPolicy preflight BLOCKED — thesis cannot be acted on under current continuity.";
      suggestedStatus = "invalidated";
    } else if (mag7ish && loop.drift?.alert) {
      severity = "pressure";
      reason = `SSI dual-source drift alert (${loop.drift.driftPct ?? "?"}%) — Terminal vs on-chain token diverged.`;
      suggestedStatus = "challenged";
    } else if (liveCount / total < 0.5) {
      severity = "pressure";
      reason = "Fewer than half of Living Loop citations are LIVE — evidence floor collapsed.";
      suggestedStatus = "challenged";
    } else if (liqish && loop.citations.some((c) => c.source === "ssi_token" && c.status === "UNAVAILABLE")) {
      severity = "pressure";
      reason = "SSI token quote UNAVAILABLE while thesis depends on liquidity/size confirmation.";
      suggestedStatus = "challenged";
    } else if (policy && policy.source !== "valuechain") {
      severity = "watch";
      reason = "On-chain WealthPolicy read UNAVAILABLE — continuity gate cannot be verified.";
    }

    if (severity !== "watch" || active.length <= 4) {
      alerts.push({
        thesisId: t.id,
        statement: t.statement,
        severity,
        reason,
        killConditions: kills,
        evidence,
        suggestedStatus,
      });
    }
  }

  return alerts.sort((a, b) => {
    const rank = { broken: 0, pressure: 1, watch: 2 } as const;
    return rank[a.severity] - rank[b.severity];
  });
}

export function computeOpportunityRadar(
  loop: LivingLoopResult,
  falsify: FalsifyAlert[],
  policy?: OnChainWealthPolicy | null,
): RadarItem[] {
  const items: RadarItem[] = [];

  if (loop.drift?.alert) {
    items.push({
      id: "ssi_drift",
      kind: "ssi_drift",
      title: "SSI dual-source drift",
      detail: `Terminal vs token |Δ| ${loop.drift.driftPct ?? "?"}%. Official SSI app is the allocate surface — HEIRLOCK does not invent mint addresses.`,
      urgency: "now",
      actionHint: "ssi",
    });
  }

  const broken = falsify.filter((f) => f.severity === "broken" || f.severity === "pressure");
  if (broken.length > 0) {
    items.push({
      id: "thesis_risk",
      kind: "thesis_risk",
      title: `${broken.length} thesis under falsification pressure`,
      detail: broken[0]!.reason,
      urgency: "now",
      actionHint: "challenge",
    });
  }

  if (policy?.source === "valuechain" && policy.modeName === "Alive" && loop.preflight.verdict === "APPROVE") {
    items.push({
      id: "policy_window",
      kind: "policy_window",
      title: "Policy window open",
      detail: `WealthPolicy Alive · cap $${policy.maxNotionalUsd ?? "?"} — Approve can route to Wealth under EIP-712.`,
      urgency: "soon",
      actionHint: "wealth",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "hold_steady",
      kind: "hold_steady",
      title: "No forced move",
      detail: String(loop.proposal.rationale ?? loop.proposal.title ?? "Hold and keep watching evidence."),
      urgency: "background",
      actionHint: "wait",
    });
  }

  return items.slice(0, 4);
}

export async function replayDecision(
  wallet: string,
  decisionId: string,
  loop: LivingLoopResult,
): Promise<ReplayResult | null> {
  const decision = await memory.getDecision(wallet, decisionId);
  if (!decision) return null;

  const proposal = (decision.proposalJson ?? {}) as Record<string, unknown>;
  const thenTitle =
    typeof proposal.title === "string"
      ? proposal.title
      : typeof proposal.action === "string"
        ? proposal.action
        : null;

  const todayTitle = String(loop.proposal.title ?? "");
  const live = loop.citations.filter((c) => c.status === "LIVE").length;
  const total = loop.citations.length;

  let todayVerdict: ReplayResult["todayVerdict"] = "still_hold";
  let reason = "Today's Living Loop still supports a similar stance.";

  if (live < Math.max(1, Math.floor(total / 2))) {
    todayVerdict = "insufficient_evidence";
    reason = "Too many citations UNAVAILABLE today — cannot faithfully replay.";
  } else if (loop.preflight.verdict === "BLOCK" && decision.userChoice === "approved") {
    todayVerdict = "would_change";
    reason = "You approved then; today preflight is BLOCK under WealthPolicy.";
  } else if (loop.drift?.alert && decision.actionType === "hold") {
    todayVerdict = "would_change";
    reason = "You held then; today SSI dual-source drift is alerting — allocate/confirm path is live.";
  } else if (
    thenTitle &&
    todayTitle &&
    thenTitle !== todayTitle &&
    decision.userChoice === "approved"
  ) {
    todayVerdict = "would_change";
    reason = `Proposal title shifted from "${thenTitle}" to "${todayTitle}".`;
  }

  return {
    decisionId: decision.id,
    thenChoice: decision.userChoice,
    thenAction: decision.actionType,
    thenProposalTitle: thenTitle,
    todayVerdict,
    reason,
    todayProposalTitle: todayTitle,
    citationsLive: live,
    citationsTotal: total,
  };
}
