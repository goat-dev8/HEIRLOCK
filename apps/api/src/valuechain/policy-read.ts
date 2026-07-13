import type { Env } from "@heirlock/config";
import { createPublicClient, http, type PublicClient } from "viem";
import { MODE_NAMES, WEALTH_POLICY_ABI, type WealthModeName } from "./abi.js";
import {
  valueChainAddresses,
  valueChainChainId,
  valueChainRpc,
  type ValueChainNetwork,
} from "./addresses.js";

export type OnChainWealthPolicy = {
  mode: number;
  modeName: WealthModeName | "Unknown";
  maxNotionalUsd: number | null;
  address: string;
  chainId: number;
  source: "valuechain" | "unavailable";
  error?: string;
};

const clients = new Map<string, PublicClient>();

function getClient(env: Env, network: ValueChainNetwork): PublicClient {
  const rpc = valueChainRpc(env, network);
  const key = `${network}:${rpc}`;
  let client = clients.get(key);
  if (!client) {
    const chainId = valueChainChainId(env, network);
    client = createPublicClient({
      transport: http(rpc, { timeout: 8_000 }),
      chain: {
        id: chainId,
        name: network === "mainnet" ? "ValueChain" : "ValueChain Testnet",
        nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
        rpcUrls: { default: { http: [rpc] } },
      },
    });
    clients.set(key, client);
  }
  return client;
}

export async function readOnChainWealthPolicy(
  env: Env,
  network: ValueChainNetwork = "mainnet",
): Promise<OnChainWealthPolicy> {
  const addrs = valueChainAddresses(env, network);
  const chainId = valueChainChainId(env, network);
  const base: OnChainWealthPolicy = {
    mode: 0,
    modeName: "Alive",
    maxNotionalUsd: null,
    address: addrs.wealthPolicy,
    chainId,
    source: "unavailable",
  };

  try {
    const client = getClient(env, network);
    const [modeRaw, capRaw] = await Promise.all([
      client.readContract({
        address: addrs.wealthPolicy,
        abi: WEALTH_POLICY_ABI,
        functionName: "mode",
      }),
      client.readContract({
        address: addrs.wealthPolicy,
        abi: WEALTH_POLICY_ABI,
        functionName: "maxNotionalUsd",
      }),
    ]);

    const mode = Number(modeRaw);
    const modeName = MODE_NAMES[mode] ?? "Unknown";
    const cap = Number(capRaw);
    return {
      mode,
      modeName,
      maxNotionalUsd: Number.isFinite(cap) ? cap : null,
      address: addrs.wealthPolicy,
      chainId,
      source: "valuechain",
    };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
