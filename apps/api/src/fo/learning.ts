/**
 * Learning Engine — outcomes feed back into thesis confidence and lessons.
 * Deterministic: only adjusts from recorded HIT/STOP/DRIFT on linked decisions.
 */
import type { DecisionOutcome, Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import * as memory from "./memory.js";

export type LearningLesson = {
  thesisId: string;
  statement: string;
  outcome: DecisionOutcome;
  confidenceBefore: number;
  confidenceAfter: number;
  delta: number;
  lesson: string;
  at: string;
};

type EvidenceEnvelope = {
  confidenceHistory?: Array<{ at: string; confidence: number; reason: string; delta: number }>;
  lessonsLearned?: LearningLesson[];
};

export function outcomeDelta(outcome: DecisionOutcome, userChoice: string | null): number {
  if (outcome === "HIT") return userChoice === "approved" ? 8 : userChoice === "rejected" ? -6 : 3;
  if (outcome === "STOP") return userChoice === "approved" ? -12 : userChoice === "rejected" ? 6 : -4;
  if (outcome === "DRIFT") return -5;
  return 0;
}

function lessonText(
  outcome: DecisionOutcome,
  userChoice: string | null,
  actionType: string,
  delta: number,
): string {
  if (outcome === "HIT" && userChoice === "approved") {
    return `Outcome HIT on ${actionType} — approval was right. Confidence +${delta}.`;
  }
  if (outcome === "STOP" && userChoice === "approved") {
    return `Outcome STOP after approval on ${actionType} — partner over-trusted. Confidence ${delta}.`;
  }
  if (outcome === "STOP" && userChoice === "rejected") {
    return `Outcome STOP — your challenge avoided a bad ${actionType} path. Confidence +${Math.abs(delta)}.`;
  }
  if (outcome === "DRIFT") {
    return `Outcome DRIFT on ${actionType} — thesis needs re-validation. Confidence ${delta}.`;
  }
  return `Outcome ${outcome} recorded — adjusting confidence by ${delta >= 0 ? "+" : ""}${delta}.`;
}

/** Apply learning when a decision outcome is finalized. */
export async function applyOutcomeLearning(opts: {
  wallet: string;
  decisionId: string;
  outcome: DecisionOutcome;
}): Promise<LearningLesson | null> {
  if (opts.outcome === "PENDING") return null;

  const decision = await memory.getDecision(opts.wallet, opts.decisionId);
  if (!decision?.thesisId || !decision.thesis) return null;

  const thesis = decision.thesis;
  const delta = outcomeDelta(opts.outcome, decision.userChoice);
  if (delta === 0) return null;

  const next = Math.max(5, Math.min(95, thesis.confidence + delta));
  const at = new Date().toISOString();
  const lesson = lessonText(opts.outcome, decision.userChoice, decision.actionType, delta);

  const env = (thesis.evidenceJson && typeof thesis.evidenceJson === "object" && !Array.isArray(thesis.evidenceJson)
    ? thesis.evidenceJson
    : {}) as EvidenceEnvelope;

  const history = [...(env.confidenceHistory ?? [])];
  history.push({ at, confidence: next, reason: lesson, delta: next - thesis.confidence });
  while (history.length > 40) history.shift();

  const lessonsLearned = [...(env.lessonsLearned ?? [])];
  const entry: LearningLesson = {
    thesisId: thesis.id,
    statement: thesis.statement,
    outcome: opts.outcome,
    confidenceBefore: thesis.confidence,
    confidenceAfter: next,
    delta: next - thesis.confidence,
    lesson,
    at,
  };
  lessonsLearned.unshift(entry);
  while (lessonsLearned.length > 20) lessonsLearned.pop();

  let status = thesis.status;
  if (opts.outcome === "STOP" && decision.userChoice === "approved" && next < 35) {
    status = "challenged";
  }

  await prisma.investmentThesis.update({
    where: { id: thesis.id },
    data: {
      confidence: next,
      status,
      evidenceJson: {
        ...env,
        confidenceHistory: history,
        lessonsLearned,
      } as Prisma.InputJsonValue,
    },
  });

  return entry;
}

export async function listRecentLessons(wallet: string, limit = 10): Promise<LearningLesson[]> {
  const theses = await memory.listTheses(wallet, { limit: 50 });
  const out: LearningLesson[] = [];
  for (const t of theses) {
    const env = (t.evidenceJson && typeof t.evidenceJson === "object" && !Array.isArray(t.evidenceJson)
      ? t.evidenceJson
      : {}) as EvidenceEnvelope;
    for (const l of env.lessonsLearned ?? []) {
      out.push(l);
    }
  }
  return out
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
