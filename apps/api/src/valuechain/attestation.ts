/**
 * AttestationRegistry.attest for Living Loop citation bundles.
 */
import type { Env } from "@heirlock/config";
import {
  createWalletClient,
  getAddress,
  http,
  keccak256,
  stringToHex,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { prisma } from "../db.js";
import { ATTESTATION_REGISTRY_ABI } from "./abi.js";
import {
  valueChainAddresses,
  valueChainChainId,
  valueChainRpc,
  type ValueChainNetwork,
} from "./addresses.js";
import { resolveAnchorPrivateKey } from "./keys.js";

export const CITATION_KIND = keccak256(stringToHex("FO_CITATION_BUNDLE"));

export type CitationRow = {
  source: string;
  endpoint: string;
  at: string;
  status: string;
};

export function buildCitationContentHash(input: {
  wallet: string;
  citations: CitationRow[];
  proposalAction?: string;
}): Hex {
  const normalized = {
    v: 1,
    kind: "FO_CITATION_BUNDLE",
    wallet: input.wallet.toLowerCase(),
    proposalAction: input.proposalAction ?? null,
    citations: input.citations.map((c) => ({
      source: c.source,
      endpoint: c.endpoint,
      at: c.at,
      status: c.status,
    })),
  };
  return keccak256(toBytes(JSON.stringify(normalized)));
}

export async function attestCitationBundle(opts: {
  env: Env;
  network?: ValueChainNetwork;
  subjectWallet: string;
  citations: CitationRow[];
  proposalAction?: string;
}): Promise<{
  contentHash: string;
  txHash: string | null;
  status: "attested" | "db_only" | "skipped";
  reason?: string;
  attestationId?: string;
}> {
  if (!opts.citations.length) {
    return { contentHash: "", txHash: null, status: "skipped", reason: "no_citations" };
  }

  const network = opts.network ?? "mainnet";
  const contentHash = buildCitationContentHash({
    wallet: opts.subjectWallet,
    citations: opts.citations,
    proposalAction: opts.proposalAction,
  });

  const existing = await prisma.attestation.findFirst({
    where: {
      subject: opts.subjectWallet.toLowerCase(),
      kind: "FO_CITATION_BUNDLE",
      payload: { path: ["contentHash"], equals: contentHash },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    const prev = existing.payload as { txHash?: string | null; anchorStatus?: string };
    return {
      contentHash,
      txHash: prev.txHash ?? null,
      status: (prev.anchorStatus === "attested" ? "attested" : "db_only") as
        | "attested"
        | "db_only",
      reason: "duplicate_content_hash",
      attestationId: existing.id,
    };
  }

  let txHash: string | null = null;
  let status: "attested" | "db_only" = "db_only";
  let reason: string | undefined;
  let onChainId: number | null = null;

  const pk = resolveAnchorPrivateKey(opts.env);
  if (!pk) {
    reason = "VALUECHAIN_ANCHOR_PRIVATE_KEY_missing";
  } else {
    try {
      const account = privateKeyToAccount(pk);
      const rpc = valueChainRpc(opts.env, network);
      const chainId = valueChainChainId(opts.env, network);
      const addrs = valueChainAddresses(opts.env, network);
      const subject = getAddress(opts.subjectWallet) as Address;
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
        address: addrs.attestationRegistry,
        abi: ATTESTATION_REGISTRY_ABI,
        functionName: "attest",
        args: [subject, CITATION_KIND, contentHash],
        account,
        chain: wallet.chain,
      });
      txHash = hash;
      status = "attested";
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
    }
  }

  const row = await prisma.attestation.create({
    data: {
      subject: opts.subjectWallet.toLowerCase(),
      kind: "FO_CITATION_BUNDLE",
      payload: {
        contentHash,
        txHash,
        citations: opts.citations,
        proposalAction: opts.proposalAction ?? null,
        anchorStatus: status,
        reason: reason ?? null,
        onChainId,
      },
    },
  });

  return {
    contentHash,
    txHash,
    status,
    reason,
    attestationId: row.id,
  };
}
