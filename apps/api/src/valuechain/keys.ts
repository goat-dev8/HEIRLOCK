import type { Env } from "@heirlock/config";
import type { Hex } from "viem";

function normalizePk(raw: string | undefined | null): Hex | null {
  if (!raw) return null;
  const hex = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
  if (hex.length < 66) return null;
  return hex;
}

/** Gas signer for ActionLog / Attestation — never the end-user trading key. */
export function resolveAnchorPrivateKey(env: Env): Hex | null {
  return normalizePk(
    env.VALUECHAIN_ANCHOR_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || "",
  );
}

/**
 * ModeController guardian/owner signer for enterGuardian / enterHeir.
 * Prefer dedicated VALUECHAIN_GUARDIAN_PRIVATE_KEY; DEPLOYER is owner-authorized fallback.
 */
export function resolveGuardianPrivateKey(env: Env): Hex | null {
  return normalizePk(
    env.VALUECHAIN_GUARDIAN_PRIVATE_KEY ||
      process.env.VALUECHAIN_GUARDIAN_PRIVATE_KEY ||
      env.VALUECHAIN_ANCHOR_PRIVATE_KEY ||
      process.env.DEPLOYER_PRIVATE_KEY ||
      "",
  );
}
