import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Env } from "@heirlock/config";
import type { Address } from "viem";

export type ValueChainNetwork = "mainnet" | "testnet";

export type ValueChainAddresses = {
  wealthPolicy: Address;
  actionLog: Address;
  modeController: Address;
  attestationRegistry: Address;
  continuityNft: Address;
  feeCollector: Address;
};

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDeployment(network: ValueChainNetwork): ValueChainAddresses {
  const file =
    network === "mainnet"
      ? "valuechain-mainnet.json"
      : "valuechain-testnet.json";
  const path = join(__dirname, "../../../../contracts/deployments", file);
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    contracts: Record<string, string>;
  };
  const c = raw.contracts;
  return {
    wealthPolicy: c.WealthPolicy as Address,
    actionLog: c.ActionLog as Address,
    modeController: c.ModeController as Address,
    attestationRegistry: c.AttestationRegistry as Address,
    continuityNft: c.ContinuityNFT as Address,
    feeCollector: c.FeeCollector as Address,
  };
}

const CACHED: Record<ValueChainNetwork, ValueChainAddresses> = {
  mainnet: loadDeployment("mainnet"),
  testnet: loadDeployment("testnet"),
};

/** Resolve ValueChain addresses — env override wins when set. */
export function valueChainAddresses(
  env: Env,
  network: ValueChainNetwork = "mainnet",
): ValueChainAddresses {
  const base = CACHED[network];
  return {
    wealthPolicy: (env.WEALTH_POLICY_ADDRESS as Address | undefined) || base.wealthPolicy,
    actionLog: (env.ACTION_LOG_ADDRESS as Address | undefined) || base.actionLog,
    modeController: (env.MODE_CONTROLLER_ADDRESS as Address | undefined) || base.modeController,
    attestationRegistry:
      (env.ATTESTATION_REGISTRY_ADDRESS as Address | undefined) || base.attestationRegistry,
    continuityNft: (env.CONTINUITY_NFT_ADDRESS as Address | undefined) || base.continuityNft,
    feeCollector: (env.FEE_COLLECTOR_ADDRESS as Address | undefined) || base.feeCollector,
  };
}

export function valueChainRpc(env: Env, network: ValueChainNetwork = "mainnet"): string {
  return network === "testnet" ? env.VALUECHAIN_TESTNET_RPC : env.VALUECHAIN_MAINNET_RPC;
}

export function valueChainChainId(env: Env, network: ValueChainNetwork = "mainnet"): number {
  return network === "testnet"
    ? env.VALUECHAIN_TESTNET_CHAIN_ID
    : env.VALUECHAIN_MAINNET_CHAIN_ID;
}
