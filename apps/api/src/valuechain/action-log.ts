/**
 * On-chain ActionLog.record for confirmed SoDEX fills.
 * Uses VALUECHAIN_ANCHOR_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY fallback) — never the user trading key.
 */
import type { Env } from "@heirlock/config";
import {
  createWalletClient,
  http,
  keccak256,
  stringToHex,
  toBytes,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { prisma } from "../db.js";
import { ACTION_LOG_ABI } from "./abi.js";
import {
  valueChainAddresses,
  valueChainChainId,
  valueChainRpc,
  type ValueChainNetwork,
} from "./addresses.js";
import type { FillEvidence } from "../sodex/fill-proof.js";

import { resolveAnchorPrivateKey } from "./keys.js";

function resolveAnchorKey(env: Env): Hex | null {
  return resolveAnchorPrivateKey(env);
}

export function buildFillEvidenceCid(input: {
  signedOrderId: string;
  wallet: string;
  evidence: FillEvidence;
}): string {
  return JSON.stringify({
    v: 1,
    kind: "SODEX_FILL",
    orderId: input.signedOrderId,
    wallet: input.wallet.toLowerCase(),
    sodexOrderId: input.evidence.sodexOrderId,
    status: input.evidence.status,
    executedQty: input.evidence.executedQty,
    tradeIds: input.evidence.tradeIds,
    historyMatch: input.evidence.historyMatch,
    tradesMatch: input.evidence.tradesMatch,
    balanceChecked: input.evidence.balanceChecked,
  });
}

export function buildFillRefId(cid: string): Hex {
  return keccak256(toBytes(cid));
}

export const FILL_REF_TYPE = keccak256(stringToHex("SODEX_FILL"));

/**
 * Persist Prisma ActionLogRef always; write on-chain when anchor key + gas available.
 * Never throws to callers — anchoring must not break fill UX.
 */
export async function anchorConfirmedFill(opts: {
  env: Env;
  network?: ValueChainNetwork;
  signedOrderId: string;
  wallet: string;
  evidence: FillEvidence;
}): Promise<{
  refId: string;
  txHash: string | null;
  status: "anchored" | "db_only" | "skipped";
  reason?: string;
}> {
  if (opts.evidence.status !== "filled" && opts.evidence.status !== "partial") {
    return { refId: "", txHash: null, status: "skipped", reason: "not_confirmed_fill" };
  }

  const network = opts.network ?? "mainnet";
  const cid = buildFillEvidenceCid({
    signedOrderId: opts.signedOrderId,
    wallet: opts.wallet,
    evidence: opts.evidence,
  });
  const refId = buildFillRefId(cid);
  const refTypeHex = FILL_REF_TYPE;

  let txHash: string | null = null;
  let status: "anchored" | "db_only" = "db_only";
  let reason: string | undefined;

  const pk = resolveAnchorKey(opts.env);
  if (!pk) {
    reason = "VALUECHAIN_ANCHOR_PRIVATE_KEY_missing";
  } else {
    try {
      const account = privateKeyToAccount(pk);
      const rpc = valueChainRpc(opts.env, network);
      const chainId = valueChainChainId(opts.env, network);
      const addrs = valueChainAddresses(opts.env, network);
      const wallet = createWalletClient({
        account,
        transport: http(rpc, { timeout: 20_000 }),
        chain: {
          id: chainId,
          name: network === "mainnet" ? "ValueChain" : "ValueChain Testnet",
          nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
          rpcUrls: { default: { http: [rpc] } },
        },
      });

      const hash = await wallet.writeContract({
        address: addrs.actionLog,
        abi: ACTION_LOG_ABI,
        functionName: "record",
        args: [refTypeHex, refId, cid],
        account,
        chain: wallet.chain,
      });
      txHash = hash;
      status = "anchored";
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
    }
  }

  await prisma.actionLogRef.create({
    data: {
      refType: "SODEX_FILL",
      refId: refId,
      ipfsCid: cid,
      txHash,
      payload: {
        signedOrderId: opts.signedOrderId,
        wallet: opts.wallet.toLowerCase(),
        evidenceStatus: opts.evidence.status,
        tradeIds: opts.evidence.tradeIds,
        anchorStatus: status,
        reason: reason ?? null,
      },
    },
  });

  return { refId, txHash, status, reason };
}
