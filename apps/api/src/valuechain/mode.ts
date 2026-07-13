/**
 * ModeController transitions — guardian/owner signer only (never end-user wallet).
 */
import type { Env } from "@heirlock/config";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { MODE_CONTROLLER_ABI, MODE_NAMES, WEALTH_POLICY_ABI } from "./abi.js";
import {
  valueChainAddresses,
  valueChainChainId,
  valueChainRpc,
  type ValueChainNetwork,
} from "./addresses.js";
import { resolveGuardianPrivateKey } from "./keys.js";

export type ModeTransitionResult = {
  ok: boolean;
  fromMode: string;
  toMode: string;
  txHash: string | null;
  signer: string | null;
  reason?: string;
};

function chainDef(env: Env, network: ValueChainNetwork) {
  const rpc = valueChainRpc(env, network);
  return {
    id: valueChainChainId(env, network),
    name: network === "mainnet" ? "ValueChain" : "ValueChain Testnet",
    nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  } as const;
}

async function waitTx(env: Env, network: ValueChainNetwork, hash: Hex) {
  const client = createPublicClient({
    transport: http(valueChainRpc(env, network), { timeout: 60_000 }),
    chain: chainDef(env, network),
  });
  await client.waitForTransactionReceipt({ hash, timeout: 90_000 });
}

async function readMode(env: Env, network: ValueChainNetwork): Promise<number> {
  const addrs = valueChainAddresses(env, network);
  const client = createPublicClient({
    transport: http(valueChainRpc(env, network), { timeout: 8_000 }),
    chain: chainDef(env, network),
  });
  const mode = await client.readContract({
    address: addrs.wealthPolicy,
    abi: WEALTH_POLICY_ABI,
    functionName: "mode",
  });
  return Number(mode);
}

export async function enterGuardianMode(
  env: Env,
  network: ValueChainNetwork = "mainnet",
): Promise<ModeTransitionResult> {
  const pk = resolveGuardianPrivateKey(env);
  if (!pk) {
    return {
      ok: false,
      fromMode: "Unknown",
      toMode: "Guardian",
      txHash: null,
      signer: null,
      reason: "VALUECHAIN_GUARDIAN_PRIVATE_KEY_or_DEPLOYER_missing",
    };
  }

  try {
    const from = await readMode(env, network);
    if (from === 1) {
      return {
        ok: true,
        fromMode: MODE_NAMES[1],
        toMode: MODE_NAMES[1],
        txHash: null,
        signer: privateKeyToAccount(pk).address,
        reason: "already_guardian",
      };
    }

    const account = privateKeyToAccount(pk);
    const addrs = valueChainAddresses(env, network);
    const chain = chainDef(env, network);
    const wallet = createWalletClient({
      account,
      transport: http(valueChainRpc(env, network), { timeout: 30_000 }),
      chain,
    });

    const txHash = await wallet.writeContract({
      address: addrs.modeController,
      abi: MODE_CONTROLLER_ABI,
      functionName: "enterGuardian",
      args: [],
      account,
      chain,
    });
    await waitTx(env, network, txHash);

    return {
      ok: true,
      fromMode: MODE_NAMES[from] ?? String(from),
      toMode: "Guardian",
      txHash,
      signer: account.address,
    };
  } catch (err) {
    return {
      ok: false,
      fromMode: "Unknown",
      toMode: "Guardian",
      txHash: null,
      signer: null,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Restore Alive via WealthPolicy.setMode — owner or controller only. */
export async function restoreAliveMode(
  env: Env,
  network: ValueChainNetwork = "mainnet",
): Promise<ModeTransitionResult> {
  const pk = resolveGuardianPrivateKey(env);
  if (!pk) {
    return {
      ok: false,
      fromMode: "Unknown",
      toMode: "Alive",
      txHash: null,
      signer: null,
      reason: "VALUECHAIN_GUARDIAN_PRIVATE_KEY_or_DEPLOYER_missing",
    };
  }

  try {
    const from = await readMode(env, network);
    if (from === 0) {
      return {
        ok: true,
        fromMode: MODE_NAMES[0],
        toMode: MODE_NAMES[0],
        txHash: null,
        signer: privateKeyToAccount(pk).address,
        reason: "already_alive",
      };
    }

    const account = privateKeyToAccount(pk);
    const addrs = valueChainAddresses(env, network);
    const chain = chainDef(env, network);
    const wallet = createWalletClient({
      account,
      transport: http(valueChainRpc(env, network), { timeout: 30_000 }),
      chain,
    });

    const txHash = await wallet.writeContract({
      address: addrs.wealthPolicy,
      abi: WEALTH_POLICY_ABI,
      functionName: "setMode",
      args: [0],
      account,
      chain,
    });
    await waitTx(env, network, txHash);

    return {
      ok: true,
      fromMode: MODE_NAMES[from] ?? String(from),
      toMode: "Alive",
      txHash,
      signer: account.address,
    };
  } catch (err) {
    return {
      ok: false,
      fromMode: "Unknown",
      toMode: "Alive",
      txHash: null,
      signer: null,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
