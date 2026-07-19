import { keccak256, stringToBytes, type Hex } from "viem";
import { env } from "@/lib/env";

export const SODEX_CHAIN_IDS = {
  mainnet: 286623,
  testnet: 138565,
} as const;

export const SODEX_VERIFYING_CONTRACT =
  "0x0000000000000000000000000000000000000000" as const;

export const SPOT_BATCH_NEW_ORDER = "batchNewOrder";
export const PERPS_NEW_ORDER = "newOrder";

/** Official SoDEX payloadHash = keccak256(JSON.stringify({ type, params })) — compact, no spaces. */
export function computePayloadHash(actionType: string, params: unknown): Hex {
  return keccak256(stringToBytes(JSON.stringify({ type: actionType, params })));
}

export function buildExchangeDomain(market: "spot" | "perps", environment: "mainnet" | "testnet") {
  return {
    name: market === "spot" ? "spot" : "futures",
    version: "1",
    chainId: SODEX_CHAIN_IDS[environment],
    verifyingContract: SODEX_VERIFYING_CONTRACT,
  } as const;
}

export const exchangeActionTypes = {
  ExchangeAction: [
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

/** ECDSA v 27/28 → 0/1, then prepend 0x01 for X-API-Sign. */
export function toTypedApiSign(signature: Hex): Hex {
  const raw = signature.startsWith("0x") ? signature.slice(2) : signature;
  if (raw.length !== 130) {
    throw new Error(`Expected 65-byte signature, got ${raw.length / 2} bytes`);
  }
  const r = raw.slice(0, 64);
  const s = raw.slice(64, 128);
  let v = Number.parseInt(raw.slice(128, 130), 16);
  if (v >= 27) v -= 27;
  if (v !== 0 && v !== 1) throw new Error(`Invalid recovery id v=${v}`);
  return `0x01${r}${s}${v.toString(16).padStart(2, "0")}` as Hex;
}

/** Switch / add ValueChain so MetaMask shows the EIP-712 popup on the correct network. */
export async function ensureValueChain(targetChainId: number): Promise<void> {
  const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } })
    .ethereum;
  if (!eth?.request) return;

  const currentHex = (await eth.request({ method: "eth_chainId" })) as string;
  const current = Number.parseInt(currentHex, 16);
  if (current === targetChainId) return;

  const targetHex = `0x${targetChainId.toString(16)}`;
  const isTestnet = targetChainId === SODEX_CHAIN_IDS.testnet;
  const rpc = isTestnet ? env.VALUECHAIN.testnet.rpc : env.VALUECHAIN.mainnet.rpc;
  const explorer = isTestnet ? env.VALUECHAIN.testnet.explorer : env.VALUECHAIN.mainnet.explorer;

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetHex }],
    });
  } catch (switchErr: unknown) {
    const code = (switchErr as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: targetHex,
            chainName: isTestnet ? "ValueChain Testnet" : "ValueChain",
            nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
            rpcUrls: [rpc],
            blockExplorerUrls: [explorer],
          },
        ],
      });
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetHex }],
      });
    } else {
      throw new Error(
        `Switch wallet to ValueChain ${isTestnet ? "Testnet" : "Mainnet"} (chain ${targetChainId}) and retry.`,
      );
    }
  }
}

/** Strip trailing zeros — SoDEX rejects "0.4500". */
export function stripTrailingZeros(decimal: string): string {
  const t = String(decimal).trim();
  if (!t.includes(".")) return t;
  const stripped = t.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return stripped === "" || stripped === "-" ? "0" : stripped;
}

export function unwrapArray(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (!input || typeof input !== "object") return [];
  const o = input as Record<string, unknown>;
  for (const key of ["data", "list", "items", "symbols", "orders", "balances", "trades", "result"]) {
    const v = o[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      const nested = unwrapArray(v);
      if (nested.length) return nested;
    }
  }
  return [];
}

export function unwrapObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const o = input as Record<string, unknown>;
  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
    const inner = o.data as Record<string, unknown>;
    if (inner.data && typeof inner.data === "object" && !Array.isArray(inner.data)) {
      return inner.data as Record<string, unknown>;
    }
    return inner;
  }
  return o;
}
