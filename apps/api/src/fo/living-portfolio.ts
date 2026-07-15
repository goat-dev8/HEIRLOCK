/**
 * Living Portfolio — holdings + theses + why confidence/risk changed.
 * Not balances only: explains allocation, risk, and confidence shifts.
 */
import type { AppContext } from "../app.js";
import type { LivingLoopResult } from "./living-loop.js";
import * as memory from "./memory.js";
import type { OnChainWealthPolicy } from "../valuechain/policy-read.js";
import type { DailyPulse } from "./pulse.js";
import { prisma } from "../db.js";

export type LivingPortfolio = {
  status: "LIVE" | "PARTIAL";
  holdings: {
    environment: string;
    totalUsd: number | null;
    assetCount: number;
    note?: string;
  };
  narratives: {
    allocation: string;
    risk: string;
    confidence: string;
  };
  linkedTheses: Array<{ id: string; statement: string; confidence: number; status: string }>;
  recentShifts: string[];
};

export async function computeLivingPortfolio(opts: {
  ctx: AppContext;
  wallet: string;
  loop: LivingLoopResult;
  pulse?: DailyPulse | null;
  policy?: OnChainWealthPolicy | null;
}): Promise<LivingPortfolio> {
  const { ctx, wallet, loop, pulse, policy } = opts;
  const theses = await memory.listTheses(wallet, { limit: 20 });
  const open = theses.filter((t) => t.status === "active" || t.status === "challenged");

  let totalUsd: number | null = null;
  let assetCount = 0;
  let holdingsNote = "Connect and verify SoDEX to see live holdings.";

  const account = await prisma.sodexAccount.findUnique({
    where: {
      walletAddress_environment: {
        walletAddress: wallet.toLowerCase(),
        environment: "testnet",
      },
    },
  });

  if (account) {
    try {
      const balances = await ctx.sodex.getBalances("testnet", wallet, account.accountId);
      const rows = Array.isArray(balances) ? balances : (balances as { balances?: unknown[] })?.balances ?? [];
      assetCount = Array.isArray(rows) ? rows.length : 0;
      holdingsNote = `${assetCount} balance row(s) on SoDEX testnet`;
    } catch {
      holdingsNote = "SoDEX balances UNAVAILABLE — verify account and retry.";
    }
  }

  const allocation =
    loop.drift?.alert
      ? `SSI dual-source drift (${loop.drift.driftPct?.toFixed(1) ?? "?"}%) suggests reviewing MAG7 allocation via official SSI app — not auto-minting.`
      : open.length > 0
        ? `${open.length} open ${open.length === 1 ? "thesis" : "theses"} anchor current stance — hold unless pulse weakens conviction.`
        : "No open theses — portfolio stance follows Living Loop proposal only.";

  const risk =
    loop.preflight.verdict === "BLOCK"
      ? "Risk elevated — on-chain policy blocked this window."
      : policy?.modeName && policy.modeName !== "Alive"
        ? `Risk elevated — Continuity is in ${policy.modeName} mode.`
        : pulse?.answers.riskUp.length
          ? pulse.answers.riskUp[0]!
          : "Risk steady — policy clear and evidence live.";

  const confidence =
    pulse?.answers.strongerTheses.length
      ? `Confidence rising on ${pulse.answers.strongerTheses.length} thesis(es); avg open ${avgConf(open)}%.`
      : pulse?.answers.weakerTheses.length
        ? `Confidence falling on ${pulse.answers.weakerTheses.length} thesis(es); review before you approve.`
        : open.length
          ? `Open thesis confidence avg ${avgConf(open)}% — no shift this cycle.`
          : "No thesis confidence baseline yet.";

  const recentShifts = [
    ...(pulse?.answers.whatChanged ?? []).slice(0, 2),
    ...(pulse?.mutations ?? []).slice(0, 2).map((m) => `${m.action}: ${m.detail}`),
  ]
    .slice(0, 4)
    .map((line) => {
      const m = line.match(/^([^:]+):\s*(.+?)\s*→\s*(.+)$/);
      if (!m?.[1] || m[2] == null || m[3] == null) return line;
      return `${m[1]}: ${fmt(m[2])} → ${fmt(m[3])}`;
    });

  return {
    status: account ? "LIVE" : "PARTIAL",
    holdings: {
      environment: "testnet",
      totalUsd,
      assetCount,
      note: holdingsNote,
    },
    narratives: { allocation, risk, confidence },
    linkedTheses: open.slice(0, 5).map((t) => ({
      id: t.id,
      statement: t.statement,
      confidence: t.confidence,
      status: t.status,
    })),
    recentShifts,
  };
}

function avgConf(theses: Array<{ confidence: number }>): number {
  if (!theses.length) return 0;
  return Math.round(theses.reduce((a, t) => a + t.confidence, 0) / theses.length);
}

function fmt(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n) || value.trim() === "" || /[a-zA-Z]/.test(value)) return value;
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  const abs = Math.abs(n);
  if (abs >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
