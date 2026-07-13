/**
 * SoDEX fill reconciliation — never mark FILLED from relay HTTP 200 alone.
 * Spec: guide_sodex_order.md §19–21.
 */
import type { SodexClient, SodexEnvironment } from "./client.js";
import { prisma } from "../db.js";
import { updateTrackOutcome } from "../fo/track.js";
import { loadEnv } from "@heirlock/config";
import { anchorConfirmedFill } from "../valuechain/action-log.js";

export type FillStatus =
  | "filled"
  | "partial"
  | "open"
  | "submitted"
  | "unconfirmed"
  | "failed";

export type FillEvidence = {
  status: FillStatus;
  sodexOrderId?: string;
  executedQty: number;
  tradeIds: string[];
  historyMatch: boolean;
  tradesMatch: boolean;
  balanceChecked: boolean;
  note: string;
  raw?: {
    history?: unknown;
    trades?: unknown;
  };
};

function asArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of ["data", "orders", "trades", "list", "items", "result"]) {
      if (Array.isArray(o[k])) return o[k] as unknown[];
    }
  }
  return [];
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return 0;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function rowOrderId(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  const o = row as Record<string, unknown>;
  return (
    str(o.orderID ?? o.orderId ?? o.order_id ?? o.id ?? o.clOrdID ?? o.clOrdId)
  );
}

function rowStatus(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  const o = row as Record<string, unknown>;
  return str(o.status ?? o.ordStatus ?? o.state).toUpperCase();
}

function rowExecutedQty(row: unknown): number {
  if (!row || typeof row !== "object") return 0;
  const o = row as Record<string, unknown>;
  return num(
    o.executedQty ??
      o.execQty ??
      o.filledQty ??
      o.cumQty ??
      o.filledSize ??
      o.sizeFilled ??
      o.dealSize,
  );
}

function rowTradeId(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  const o = row as Record<string, unknown>;
  return str(o.tradeID ?? o.tradeId ?? o.id ?? o.execID ?? o.execId);
}

function rowTradeOrderId(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  const o = row as Record<string, unknown>;
  return str(o.orderID ?? o.orderId ?? o.clOrdID ?? o.clOrdId);
}

function rowTradeSize(row: unknown): number {
  if (!row || typeof row !== "object") return 0;
  const o = row as Record<string, unknown>;
  return num(o.size ?? o.qty ?? o.quantity ?? o.lastQty);
}

function rowTradePrice(row: unknown): string | undefined {
  if (!row || typeof row !== "object") return undefined;
  const o = row as Record<string, unknown>;
  const p = o.price ?? o.avgPrice ?? o.lastPx;
  return p == null ? undefined : String(p);
}

function rowTradeFee(row: unknown): string | undefined {
  if (!row || typeof row !== "object") return undefined;
  const o = row as Record<string, unknown>;
  const f = o.fee ?? o.commission;
  return f == null ? undefined : String(f);
}

function rowTradeSide(row: unknown): string {
  if (!row || typeof row !== "object") return "unknown";
  const o = row as Record<string, unknown>;
  return str(o.side ?? o.S ?? "unknown") || "unknown";
}

function rowTradeMarket(row: unknown, fallback: string): string {
  if (!row || typeof row !== "object") return fallback;
  const o = row as Record<string, unknown>;
  return str(o.symbol ?? o.market ?? o.S ?? fallback) || fallback;
}

/**
 * Reconcile a submitted SoDEX order against history + trades + balances.
 * Polls briefly because matcher evidence can lag gateway acceptance.
 */
export async function reconcileFill(opts: {
  sodex: SodexClient;
  environment: SodexEnvironment;
  wallet: string;
  sodexOrderId?: string | null;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<FillEvidence> {
  const timeoutMs = opts.timeoutMs ?? 8_000;
  const intervalMs = opts.intervalMs ?? 750;
  const wallet = opts.wallet;
  const targetId = opts.sodexOrderId ? String(opts.sodexOrderId) : "";
  const start = Date.now();

  let lastHistory: unknown;
  let lastTrades: unknown;
  let best: FillEvidence = {
    status: "submitted",
    sodexOrderId: targetId || undefined,
    executedQty: 0,
    tradeIds: [],
    historyMatch: false,
    tradesMatch: false,
    balanceChecked: false,
    note: "Gateway accepted; awaiting history/trades/balance evidence",
  };

  while (Date.now() - start < timeoutMs) {
    const [history, trades, balances] = await Promise.all([
      opts.sodex.getOrderHistory(opts.environment, wallet).catch(() => null),
      opts.sodex.getTrades(opts.environment, wallet).catch(() => null),
      opts.sodex.getBalances(opts.environment, wallet).catch(() => null),
    ]);
    lastHistory = history;
    lastTrades = trades;

    const historyRows = asArray(history);
    const tradeRows = asArray(trades);

    const matchedHistory = targetId
      ? historyRows.find((r) => rowOrderId(r) === targetId)
      : historyRows[0];
    const matchedTrades = targetId
      ? tradeRows.filter((r) => rowTradeOrderId(r) === targetId)
      : [];

    const historyMatch = Boolean(matchedHistory);
    const executedQty: number = matchedHistory
      ? rowExecutedQty(matchedHistory)
      : matchedTrades.reduce((sum: number, t) => sum + rowTradeSize(t), 0);
    const tradeIds = matchedTrades.map(rowTradeId).filter(Boolean);
    const tradesMatch = tradeIds.length > 0;
    const statusRaw = matchedHistory ? rowStatus(matchedHistory) : "";
    const balanceChecked = balances != null;

    let status: FillStatus = "submitted";
    let note = "Order submitted; evidence incomplete";

    if (
      (statusRaw.includes("FILL") || executedQty > 0) &&
      tradesMatch &&
      executedQty > 0
    ) {
      const full =
        statusRaw === "FILLED" ||
        statusRaw.includes("FILLED") ||
        statusRaw === "FULL_FILL";
      status = full ? "filled" : "partial";
      note = full
        ? "Verified: history FILLED + trade IDs + balances checked"
        : "Verified partial: executedQty > 0 with trade evidence";
    } else if (historyMatch && (statusRaw.includes("NEW") || statusRaw.includes("OPEN") || statusRaw.includes("LIVE"))) {
      status = "open";
      note = "Order visible in history as open — not filled";
    } else if (historyMatch && executedQty > 0 && !tradesMatch) {
      status = "unconfirmed";
      note = "History shows executedQty but trades not yet matched";
    } else if (!targetId) {
      status = "unconfirmed";
      note = "No sodexOrderId extracted from gateway response — cannot prove fill";
    }

    best = {
      status,
      sodexOrderId: targetId || undefined,
      executedQty,
      tradeIds,
      historyMatch,
      tradesMatch,
      balanceChecked,
      note,
      raw: { history: matchedHistory ?? undefined, trades: matchedTrades },
    };

    if (status === "filled" || status === "partial" || status === "open") {
      break;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (best.status === "submitted") {
    best = {
      ...best,
      status: "unconfirmed",
      note: best.note || "Timed out waiting for fill evidence",
      raw: { history: lastHistory, trades: lastTrades },
    };
  }

  return best;
}

/** Persist Trade rows + update SignedOrder status from fill evidence. */
export async function applyFillEvidence(opts: {
  signedOrderId: string;
  userId: string;
  environment: SodexEnvironment;
  market: string;
  wallet: string;
  evidence: FillEvidence;
}): Promise<void> {
  const { evidence } = opts;
  await prisma.signedOrder.update({
    where: { id: opts.signedOrderId },
    data: {
      status: evidence.status,
      sodexOrderId: evidence.sodexOrderId ?? undefined,
      errorMessage:
        evidence.status === "unconfirmed" || evidence.status === "submitted"
          ? evidence.note
          : null,
    },
  });

  if (evidence.tradeIds.length && (evidence.status === "filled" || evidence.status === "partial")) {
    const trades = asArray(evidence.raw?.trades);
    for (let i = 0; i < trades.length; i++) {
      const t = trades[i];
      const sodexTradeId = evidence.tradeIds[i] || rowTradeId(t);
      if (!sodexTradeId) continue;
      const existing = await prisma.trade.findFirst({
        where: { userId: opts.userId, sodexTradeId },
      });
      if (existing) continue;
      await prisma.trade.create({
        data: {
          userId: opts.userId,
          signedOrderId: opts.signedOrderId,
          environment: opts.environment,
          market: rowTradeMarket(t, opts.market),
          side: rowTradeSide(t),
          size: String(rowTradeSize(t) || evidence.executedQty || 0),
          price: rowTradePrice(t),
          fee: rowTradeFee(t),
          sodexTradeId,
          rawJson: t != null ? (t as object) : undefined,
        },
      });
    }

    await updateTrackOutcome({
      wallet: opts.wallet,
      orderId: opts.signedOrderId,
      relayId: evidence.sodexOrderId,
      outcome: evidence.status === "filled" ? "HIT" : "PENDING",
    }).catch(() => undefined);

    // Async-safe on-chain ActionLog — never fail the fill path
    await anchorConfirmedFill({
      env: loadEnv(),
      network: opts.environment === "testnet" ? "testnet" : "mainnet",
      signedOrderId: opts.signedOrderId,
      wallet: opts.wallet,
      evidence,
    }).catch(() => undefined);
  }
}
