/**
 * Background Partner Pulse — keeps thinking while wallets are away.
 * Runs on a schedule for wallets with Family Office activity (theses/decisions).
 */
import type { AppContext } from "../app.js";
import { prisma } from "../db.js";
import { computeLivingLoop } from "./living-loop.js";
import { runDailyPulse } from "./pulse.js";
import { canForWallet } from "../skills/persist.js";
import { readOnChainWealthPolicy } from "../valuechain/policy-read.js";

export type BackgroundPulseResult = {
  scanned: number;
  pulsed: number;
  skipped: number;
  errors: Array<{ wallet: string; error: string }>;
  ranAt: string;
};

/** Wallets with Investment Memory rows and Family Office enabled. */
export async function listPulseEligibleWallets(limit = 50): Promise<string[]> {
  const profiles = await prisma.userProfile.findMany({
    where: {
      OR: [{ theses: { some: {} } }, { decisions: { some: {} } }],
    },
    select: { walletAddress: true },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });
  return profiles.map((p) => p.walletAddress);
}

export async function runBackgroundPartnerPulse(
  ctx: AppContext,
  opts?: { force?: boolean; walletLimit?: number },
): Promise<BackgroundPulseResult> {
  const wallets = await listPulseEligibleWallets(opts?.walletLimit ?? 50);
  const ranAt = new Date().toISOString();
  let pulsed = 0;
  let skipped = 0;
  const errors: BackgroundPulseResult["errors"] = [];

  for (const wallet of wallets) {
    try {
      const fo = await canForWallet(ctx.skills.registry, wallet, "family_office", "read", "alive");
      if (!fo.ok) {
        skipped += 1;
        continue;
      }
      const [loop, policy] = await Promise.all([
        computeLivingLoop(ctx, { foEnabled: true }),
        readOnChainWealthPolicy(ctx.env, "testnet").catch(() => null),
      ]);
      await runDailyPulse({ wallet, loop, policy, force: opts?.force ?? false });
      pulsed += 1;
    } catch (err) {
      errors.push({
        wallet,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    await prisma.agentMeta.upsert({
      where: { key: "partner_background_pulse" },
      create: {
        key: "partner_background_pulse",
        value: { ranAt, scanned: wallets.length, pulsed, skipped, errors: errors.length },
      },
      update: {
        value: { ranAt, scanned: wallets.length, pulsed, skipped, errors: errors.length },
      },
    });
  } catch {
    /* non-fatal */
  }

  return { scanned: wallets.length, pulsed, skipped, errors, ranAt };
}
