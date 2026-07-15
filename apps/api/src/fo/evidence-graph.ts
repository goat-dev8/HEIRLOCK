/**
 * Evidence Graph — links recommendations to SoSoValue, SSI, SoDEX, Memory, Policy.
 * Flat node/edge model for Partner UI and Why packs (not a graph DB).
 */
import type { LivingLoopResult } from "./living-loop.js";
import * as memory from "./memory.js";
import type { OnChainWealthPolicy } from "../valuechain/policy-read.js";
import { prisma } from "../db.js";

export type GraphNode = {
  id: string;
  kind:
    | "proposal"
    | "thesis"
    | "decision"
    | "citation"
    | "policy"
    | "order"
    | "radar"
    | "portfolio";
  label: string;
  status?: string;
  meta?: Record<string, unknown>;
};

export type GraphEdge = {
  from: string;
  to: string;
  relation: "cites" | "supports" | "contradicts" | "led_to" | "governs" | "holds";
};

export type EvidenceGraph = {
  status: "LIVE";
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: string;
};

export async function buildEvidenceGraph(opts: {
  wallet: string;
  loop: LivingLoopResult;
  policy?: OnChainWealthPolicy | null;
  focusDecisionId?: string;
}): Promise<EvidenceGraph> {
  const { wallet, loop, policy } = opts;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const proposalId = "proposal:live";
  nodes.push({
    id: proposalId,
    kind: "proposal",
    label: String(loop.proposal.title ?? "Live proposal"),
    status: String(loop.preflight.verdict),
    meta: { action: loop.proposal.action },
  });

  for (const c of loop.citations) {
    const id = `citation:${c.source}`;
    if (!nodes.some((n) => n.id === id)) {
      nodes.push({
        id,
        kind: "citation",
        label: c.source,
        status: c.status,
        meta: { endpoint: c.endpoint, at: c.at },
      });
    }
    edges.push({
      from: proposalId,
      to: id,
      relation: c.status === "LIVE" ? "supports" : "contradicts",
    });
  }

  if (policy) {
    const policyId = "policy:wealth";
    nodes.push({
      id: policyId,
      kind: "policy",
      label: `WealthPolicy · ${policy.modeName ?? "unknown"}`,
      status: policy.source === "valuechain" ? "LIVE" : "UNAVAILABLE",
      meta: {
        maxNotionalUsd: policy.maxNotionalUsd,
        address: policy.address,
      },
    });
    edges.push({ from: policyId, to: proposalId, relation: "governs" });
  }

  const theses = await memory.listTheses(wallet, { limit: 12 });
  for (const t of theses.filter((x) => x.status === "active" || x.status === "challenged").slice(0, 6)) {
    const id = `thesis:${t.id}`;
    nodes.push({
      id,
      kind: "thesis",
      label: t.statement.slice(0, 120),
      status: t.status,
      meta: { confidence: t.confidence },
    });
    edges.push({
      from: id,
      to: proposalId,
      relation: t.status === "challenged" ? "contradicts" : "supports",
    });
  }

  const decisions = await memory.listDecisions(wallet, 8);
  for (const d of decisions.slice(0, 5)) {
    const id = `decision:${d.id}`;
    nodes.push({
      id,
      kind: "decision",
      label: `${d.actionType} · ${d.userChoice ?? "?"}`,
      status: d.outcome ?? "PENDING",
      meta: { at: d.createdAt.toISOString() },
    });
    edges.push({ from: id, to: proposalId, relation: "led_to" });
    if (d.thesisId) {
      edges.push({ from: `thesis:${d.thesisId}`, to: id, relation: "supports" });
    }
  }

  const orders = await prisma.signedOrder.findMany({
    where: { walletAddress: wallet.toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  for (const o of orders) {
    const id = `order:${o.id}`;
    nodes.push({
      id,
      kind: "order",
      label: `${o.side} ${o.market}`,
      status: o.status,
      meta: { notionalUsd: o.notionalUsd?.toString() },
    });
    edges.push({ from: proposalId, to: id, relation: "led_to" });
  }

  if (loop.drift?.alert) {
    const radarId = "radar:ssi_drift";
    nodes.push({
      id: radarId,
      kind: "radar",
      label: `SSI drift ${loop.drift.driftPct ?? "?"}%`,
      status: "LIVE",
    });
    edges.push({ from: radarId, to: proposalId, relation: "supports" });
  }

  const live = loop.citations.filter((c) => c.status === "LIVE").length;
  const summary = `${nodes.length} nodes · ${edges.length} edges · ${live}/${loop.citations.length} citations LIVE`;

  return { status: "LIVE", nodes, edges, summary };
}
