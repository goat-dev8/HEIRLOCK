/**
 * Persisted Family Office Track outcomes (SkillEvent.eventType = track.outcome).
 * Survives Render redeploys — replaces the former in-memory trackStore.
 */
import { prisma } from "../db.js";

export type Outcome = "HIT" | "STOP" | "DRIFT" | "PENDING";

export type TrackRow = {
  id: string;
  wallet: string;
  kind: string;
  thesis: string;
  symbol?: string;
  orderId?: string;
  relayId?: string;
  createdAt: number;
  outcome: Outcome;
  citations: Array<{ source: string; endpoint: string; at: string }>;
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

export async function pushTrack(
  row: Omit<TrackRow, "id" | "createdAt" | "outcome"> & { outcome?: Outcome },
): Promise<TrackRow> {
  const entry: TrackRow = {
    ...row,
    wallet: row.wallet.toLowerCase(),
    id: `trk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    outcome: row.outcome ?? "PENDING",
  };
  const userId = await resolveUserId(entry.wallet);
  await prisma.skillEvent.create({
    data: {
      userId,
      skillId: "family_office",
      eventType: "track.outcome",
      payload: entry,
    },
  });
  return entry;
}

export async function listTrack(wallet: string, limit = 100): Promise<TrackRow[]> {
  const address = wallet.toLowerCase();
  const profile = await prisma.userProfile.findUnique({
    where: { walletAddress: address },
  });
  if (!profile) return [];

  const events = await prisma.skillEvent.findMany({
    where: { userId: profile.id, eventType: "track.outcome" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return events.map((e) => {
    const p = e.payload as TrackRow;
    return {
      id: p.id ?? e.id,
      wallet: p.wallet ?? address,
      kind: p.kind ?? "unknown",
      thesis: p.thesis ?? "",
      symbol: p.symbol,
      orderId: p.orderId,
      relayId: p.relayId,
      createdAt: p.createdAt ?? e.createdAt.getTime(),
      outcome: p.outcome ?? "PENDING",
      citations: Array.isArray(p.citations) ? p.citations : [],
    };
  });
}

/** Update the latest track row matching orderId / relayId with a new outcome. */
export async function updateTrackOutcome(opts: {
  wallet: string;
  orderId?: string;
  relayId?: string;
  outcome: Outcome;
}): Promise<TrackRow | null> {
  const address = opts.wallet.toLowerCase();
  const profile = await prisma.userProfile.findUnique({
    where: { walletAddress: address },
  });
  if (!profile) return null;

  const events = await prisma.skillEvent.findMany({
    where: { userId: profile.id, eventType: "track.outcome" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  for (const e of events) {
    const p = e.payload as TrackRow;
    const matchOrder =
      opts.orderId && p.orderId && p.orderId === opts.orderId;
    const matchRelay =
      opts.relayId && p.relayId && p.relayId === opts.relayId;
    if (!matchOrder && !matchRelay) continue;

    const next: TrackRow = { ...p, outcome: opts.outcome };
    await prisma.skillEvent.update({
      where: { id: e.id },
      data: { payload: next },
    });
    return next;
  }
  return null;
}
