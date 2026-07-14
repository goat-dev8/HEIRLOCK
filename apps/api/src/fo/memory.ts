/**
 * Investment Memory — persisted theses, decisions, and daily market snapshots.
 * This is the substrate that makes HEIRLOCK a partner that remembers instead
 * of a stateless chatbot: every AI claim and every user choice can be traced
 * back to a row here, and outcomes feed back into future confidence.
 */
import { prisma } from "../db.js";
import type {
  DecisionActionType,
  DecisionChoice,
  DecisionOutcome,
  InvestmentDecision,
  InvestmentThesis,
  Prisma,
  ThesisStatus,
} from "@prisma/client";

export type EvidenceCitation = {
  source: string;
  endpoint: string;
  at: string;
  status: string;
};

async function resolveUserId(wallet: string): Promise<string> {
  const address = wallet.toLowerCase();
  const profile = await prisma.userProfile.upsert({
    where: { walletAddress: address },
    create: { walletAddress: address },
    update: {},
  });
  return profile.id;
}

export async function createThesis(opts: {
  wallet: string;
  statement: string;
  confidence?: number;
  source?: "ai" | "user";
  evidence?: EvidenceCitation[];
}): Promise<InvestmentThesis> {
  const userId = await resolveUserId(opts.wallet);
  return prisma.investmentThesis.create({
    data: {
      userId,
      statement: opts.statement,
      confidence: Math.max(0, Math.min(100, opts.confidence ?? 50)),
      source: opts.source ?? "ai",
      evidenceJson: opts.evidence ?? [],
    },
  });
}

export async function listTheses(
  wallet: string,
  opts?: { status?: ThesisStatus; limit?: number },
): Promise<InvestmentThesis[]> {
  const address = wallet.toLowerCase();
  const profile = await prisma.userProfile.findUnique({ where: { walletAddress: address } });
  if (!profile) return [];
  return prisma.investmentThesis.findMany({
    where: { userId: profile.id, ...(opts?.status ? { status: opts.status } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
  });
}

export async function getThesis(wallet: string, thesisId: string): Promise<InvestmentThesis | null> {
  const address = wallet.toLowerCase();
  const thesis = await prisma.investmentThesis.findUnique({ where: { id: thesisId } });
  if (!thesis) return null;
  const profile = await prisma.userProfile.findUnique({ where: { id: thesis.userId } });
  if (!profile || profile.walletAddress !== address) return null;
  return thesis;
}

export async function updateThesis(opts: {
  wallet: string;
  thesisId: string;
  status?: ThesisStatus;
  confidence?: number;
  invalidatedReason?: string;
  evidence?: EvidenceCitation[];
}): Promise<InvestmentThesis | null> {
  const existing = await getThesis(opts.wallet, opts.thesisId);
  if (!existing) return null;
  return prisma.investmentThesis.update({
    where: { id: opts.thesisId },
    data: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.confidence != null ? { confidence: Math.max(0, Math.min(100, opts.confidence)) } : {}),
      ...(opts.invalidatedReason ? { invalidatedReason: opts.invalidatedReason } : {}),
      ...(opts.evidence ? { evidenceJson: opts.evidence } : {}),
    },
  });
}

export async function recordDecision(opts: {
  wallet: string;
  thesisId?: string;
  actionType: DecisionActionType;
  proposal: Prisma.InputJsonValue;
  userChoice?: DecisionChoice;
  outcome?: DecisionOutcome;
  livingLoopHash?: string;
  citations?: EvidenceCitation[];
}): Promise<InvestmentDecision> {
  const userId = await resolveUserId(opts.wallet);
  if (opts.thesisId) {
    const owns = await getThesis(opts.wallet, opts.thesisId);
    if (!owns) throw new Error("thesis_not_found");
  }
  return prisma.investmentDecision.create({
    data: {
      userId,
      thesisId: opts.thesisId,
      actionType: opts.actionType,
      proposalJson: opts.proposal,
      userChoice: opts.userChoice,
      outcome: opts.outcome ?? "PENDING",
      livingLoopHash: opts.livingLoopHash,
      citationsJson: opts.citations ?? [],
    },
  });
}

export async function listDecisions(
  wallet: string,
  limit = 50,
): Promise<Array<InvestmentDecision & { thesis: InvestmentThesis | null }>> {
  const address = wallet.toLowerCase();
  const profile = await prisma.userProfile.findUnique({ where: { walletAddress: address } });
  if (!profile) return [];
  return prisma.investmentDecision.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { thesis: true },
  });
}

export async function getDecision(
  wallet: string,
  decisionId: string,
): Promise<(InvestmentDecision & { thesis: InvestmentThesis | null }) | null> {
  const address = wallet.toLowerCase();
  const decision = await prisma.investmentDecision.findUnique({
    where: { id: decisionId },
    include: { thesis: true },
  });
  if (!decision) return null;
  const profile = await prisma.userProfile.findUnique({ where: { id: decision.userId } });
  if (!profile || profile.walletAddress !== address) return null;
  return decision;
}

export async function updateDecisionOutcome(opts: {
  wallet: string;
  decisionId: string;
  outcome: DecisionOutcome;
}): Promise<InvestmentDecision | null> {
  const existing = await getDecision(opts.wallet, opts.decisionId);
  if (!existing) return null;
  return prisma.investmentDecision.update({
    where: { id: opts.decisionId },
    data: { outcome: opts.outcome },
  });
}

/** Upsert today's (UTC) MarketSnapshot for a wallet — cheap append-only digest. */
export async function upsertMarketSnapshot(
  wallet: string,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  const address = wallet.toLowerCase();
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  await prisma.marketSnapshot.upsert({
    where: { walletAddress_day: { walletAddress: address, day } },
    create: { walletAddress: address, day, payloadJson: payload },
    update: { payloadJson: payload },
  });
}

export type WhatChanged = {
  status: "LIVE" | "NO_BASELINE";
  today: Record<string, unknown> | null;
  yesterday: Record<string, unknown> | null;
  deltas: Array<{ field: string; from: unknown; to: unknown }>;
};

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** Diff today's digest vs yesterday's — the "What Changed Since Yesterday" feed. */
export async function getWhatChanged(wallet: string): Promise<WhatChanged> {
  const address = wallet.toLowerCase();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const [todaySnap, yesterdaySnap] = await Promise.all([
    prisma.marketSnapshot.findUnique({
      where: { walletAddress_day: { walletAddress: address, day: today } },
    }),
    prisma.marketSnapshot.findUnique({
      where: { walletAddress_day: { walletAddress: address, day: yesterday } },
    }),
  ]);

  if (!todaySnap || !yesterdaySnap) {
    return {
      status: "NO_BASELINE",
      today: (todaySnap?.payloadJson as Record<string, unknown>) ?? null,
      yesterday: (yesterdaySnap?.payloadJson as Record<string, unknown>) ?? null,
      deltas: [],
    };
  }

  const t = flatten(todaySnap.payloadJson as Record<string, unknown>);
  const y = flatten(yesterdaySnap.payloadJson as Record<string, unknown>);
  const deltas: WhatChanged["deltas"] = [];
  const keys = new Set([...Object.keys(t), ...Object.keys(y)]);
  for (const key of keys) {
    const from = y[key];
    const to = t[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      deltas.push({ field: key, from: from ?? null, to: to ?? null });
    }
  }

  return {
    status: "LIVE",
    today: todaySnap.payloadJson as Record<string, unknown>,
    yesterday: yesterdaySnap.payloadJson as Record<string, unknown>,
    deltas,
  };
}

/**
 * Compact, factual memory digest injected into the AI system prompt. Only
 * summarizes rows that already exist in Postgres — never invents numbers.
 */
export async function memoryContextForAI(wallet: string): Promise<string> {
  const [theses, decisions] = await Promise.all([
    listTheses(wallet, { limit: 5 }),
    listDecisions(wallet, 5),
  ]);

  if (theses.length === 0 && decisions.length === 0) {
    return "No prior theses or decisions recorded yet for this wallet — this is a fresh memory.";
  }

  const thesesBlock = theses.length
    ? theses
        .map(
          (t) =>
            `- [${t.status}] (${t.confidence}% confidence) ${t.statement} — recorded ${t.createdAt.toISOString()}`,
        )
        .join("\n")
    : "(none)";

  const decisionsBlock = decisions.length
    ? decisions
        .map(
          (d) =>
            `- ${d.actionType} → ${d.userChoice ?? "undecided"} (outcome: ${d.outcome ?? "PENDING"}) at ${d.createdAt.toISOString()}${
              d.thesis ? ` [thesis: ${d.thesis.statement.slice(0, 80)}]` : ""
            }`,
        )
        .join("\n")
    : "(none)";

  return `RECENT THESES (most recent first):\n${thesesBlock}\n\nRECENT DECISIONS (most recent first):\n${decisionsBlock}`;
}
