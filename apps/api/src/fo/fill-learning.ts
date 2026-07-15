/**
 * Auto-learning from verified SoDEX fills → Partner Investment Memory.
 */
import type { Prisma } from "@prisma/client";
import type { FillEvidence } from "../sodex/fill-proof.js";
import { prisma } from "../db.js";
import { applyOutcomeLearning } from "./learning.js";
import type { DecisionOutcome } from "@prisma/client";

function fillToOutcome(evidence: FillEvidence, predictedAction?: string): DecisionOutcome {
  if (evidence.status === "filled") return "HIT";
  if (evidence.status === "partial") return "DRIFT";
  if (evidence.status === "open" || evidence.status === "submitted") return "PENDING";
  if (predictedAction === "sodex_trade" && evidence.status === "unconfirmed") return "DRIFT";
  return "STOP";
}

/** After fill reconciliation, update the linked Partner decision and learn. */
export async function applyFillToPartnerMemory(opts: {
  wallet: string;
  signedOrderId: string;
  evidence: FillEvidence;
}): Promise<{ decisionId: string; outcome: DecisionOutcome } | null> {
  const address = opts.wallet.toLowerCase();
  const profile = await prisma.userProfile.findUnique({ where: { walletAddress: address } });
  if (!profile) return null;

  let decision = await prisma.investmentDecision.findFirst({
    where: { userId: profile.id, signedOrderId: opts.signedOrderId },
    orderBy: { createdAt: "desc" },
  });

  if (!decision) {
    decision = await prisma.investmentDecision.findFirst({
      where: {
        userId: profile.id,
        userChoice: "approved",
        outcome: "PENDING",
        signedOrderId: null,
      },
      orderBy: { createdAt: "desc" },
    });
    if (decision) {
      await prisma.investmentDecision.update({
        where: { id: decision.id },
        data: { signedOrderId: opts.signedOrderId },
      });
    }
  }

  if (!decision) return null;

  const proposal = (decision.proposalJson ?? {}) as Record<string, unknown>;
  const actionType = String(proposal.action ?? decision.actionType);
  const outcome = fillToOutcome(opts.evidence, actionType);

  const fillProof = {
    status: opts.evidence.status,
    sodexOrderId: opts.evidence.sodexOrderId,
    executedQty: opts.evidence.executedQty,
    tradeIds: opts.evidence.tradeIds,
    historyMatch: opts.evidence.historyMatch,
    tradesMatch: opts.evidence.tradesMatch,
    balanceChecked: opts.evidence.balanceChecked,
    note: opts.evidence.note,
    verifiedAt: new Date().toISOString(),
  };

  await prisma.investmentDecision.update({
    where: { id: decision.id },
    data: {
      outcome,
      fillProofJson: fillProof as Prisma.InputJsonValue,
      signedOrderId: opts.signedOrderId,
    },
  });

  if (outcome !== "PENDING") {
    await applyOutcomeLearning({
      wallet: opts.wallet,
      decisionId: decision.id,
      outcome,
    }).catch(() => undefined);
  }

  return { decisionId: decision.id, outcome };
}

/** Link a pending approved decision to a signed order before relay. */
export async function linkDecisionToOrder(opts: {
  wallet: string;
  decisionId: string;
  signedOrderId: string;
}): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({
    where: { walletAddress: opts.wallet.toLowerCase() },
  });
  if (!profile) return false;
  const decision = await prisma.investmentDecision.findFirst({
    where: { id: opts.decisionId, userId: profile.id },
  });
  if (!decision) return false;
  await prisma.investmentDecision.update({
    where: { id: decision.id },
    data: { signedOrderId: opts.signedOrderId },
  });
  return true;
}
