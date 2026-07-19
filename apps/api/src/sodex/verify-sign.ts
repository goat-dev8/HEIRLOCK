/**
 * Verify wallet EIP-712 ExchangeAction before forwarding to SoDEX.
 * Aligns with official signing guide + parent-sign relay pattern.
 */
import { type Hex, recoverTypedDataAddress } from "viem";
import {
  SODEX_CHAIN_IDS,
  buildExchangeDomain,
  computePayloadHash,
  exchangeActionTypes,
} from "@heirlock/sodex-signing";

/** Canonical wire format: 0x01 + r/s/v(0|1). */
export function normalizeWireApiSign(apiSign: string): Hex {
  const raw = apiSign.startsWith("0x") ? apiSign.slice(2) : apiSign;
  let ecdsa: string;
  if (raw.length === 132 && raw.startsWith("01")) {
    ecdsa = raw.slice(2);
  } else if (raw.length === 130) {
    ecdsa = raw;
  } else {
    throw new Error(`Invalid X-API-Sign length ${raw.length / 2} bytes`);
  }
  let v = Number.parseInt(ecdsa.slice(128, 130), 16);
  if (v >= 27) v -= 27;
  if (v !== 0 && v !== 1) throw new Error(`Invalid recovery id v=${v}`);
  return `0x01${ecdsa.slice(0, 128)}${v.toString(16).padStart(2, "0")}` as Hex;
}

export async function assertWalletSignedExchange(input: {
  wallet: string;
  market: "spot" | "perps";
  environment: "mainnet" | "testnet";
  actionType: string;
  params: unknown;
  apiSign: string;
  apiNonce: string;
  payloadHash?: string;
}): Promise<{ payloadHash: Hex; signer: string; chainId: number; wireApiSign: Hex }> {
  const chainId = SODEX_CHAIN_IDS[input.environment];
  const domainMarket = input.market === "spot" ? "spot" : "futures";
  const payloadHash = computePayloadHash(input.actionType, input.params);

  if (input.payloadHash && input.payloadHash.toLowerCase() !== payloadHash.toLowerCase()) {
    throw new Error(
      "payload_hash_mismatch: body does not match signed payloadHash — re-prepare and re-sign",
    );
  }

  const wireApiSign = normalizeWireApiSign(input.apiSign);
  const ecdsa = `0x${wireApiSign.slice(4)}` as Hex;
  const nonce = BigInt(input.apiNonce);

  let signer: string;
  try {
    signer = await recoverTypedDataAddress({
      domain: buildExchangeDomain(domainMarket, input.environment),
      types: exchangeActionTypes,
      primaryType: "ExchangeAction",
      message: { payloadHash, nonce },
      signature: ecdsa,
    });
  } catch (e) {
    throw new Error(`sig_verify_failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (signer.toLowerCase() !== input.wallet.toLowerCase()) {
    throw new Error(`signer_mismatch: expected ${input.wallet}, recovered ${signer}`);
  }

  return { payloadHash, signer, chainId, wireApiSign };
}

export function buildUnsignedTypedData(input: {
  market: "spot" | "perps";
  environment: "mainnet" | "testnet";
  actionType: string;
  params: unknown;
  nonce: string | bigint;
}) {
  const domainMarket = input.market === "spot" ? "spot" : "futures";
  const payloadHash = computePayloadHash(input.actionType, input.params);
  const nonce = typeof input.nonce === "bigint" ? input.nonce : BigInt(input.nonce);
  const domain = buildExchangeDomain(domainMarket, input.environment);
  return {
    payloadHash,
    nonce: nonce.toString(),
    chainId: domain.chainId,
    typedData: {
      domain,
      types: exchangeActionTypes,
      primaryType: "ExchangeAction" as const,
      message: {
        payloadHash,
        nonce: nonce.toString(),
      },
    },
  };
}
