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

function envAddress(
  env: Env,
  network: ValueChainNetwork,
  mainnetKey: keyof Env,
  testnetKey: keyof Env,
  fallback: Address,
): Address {
  const key = network === "testnet" ? testnetKey : mainnetKey;
  const override = env[key];
  return (typeof override === "string" && override ? override : fallback) as Address;
}

/** Resolve ValueChain addresses — env override wins when set (network-specific). */
export function valueChainAddresses(
  env: Env,
  network: ValueChainNetwork = "mainnet",
): ValueChainAddresses {
  const base = CACHED[network];
  return {
    wealthPolicy: envAddress(env, network, "WEALTH_POLICY_ADDRESS", "WEALTH_POLICY_ADDRESS_TESTNET", base.wealthPolicy),
    actionLog: envAddress(env, network, "ACTION_LOG_ADDRESS", "ACTION_LOG_ADDRESS_TESTNET", base.actionLog),
    modeController: envAddress(
      env,
      network,
      "MODE_CONTROLLER_ADDRESS",
      "MODE_CONTROLLER_ADDRESS_TESTNET",
      base.modeController,
    ),
    attestationRegistry: envAddress(
      env,
      network,
      "ATTESTATION_REGISTRY_ADDRESS",
      "ATTESTATION_REGISTRY_ADDRESS_TESTNET",
      base.attestationRegistry,
    ),
    continuityNft: envAddress(
      env,
      network,
      "CONTINUITY_NFT_ADDRESS",
      "CONTINUITY_NFT_ADDRESS_TESTNET",
      base.continuityNft,
    ),
    feeCollector: envAddress(
      env,
      network,
      "FEE_COLLECTOR_ADDRESS",
      "FEE_COLLECTOR_ADDRESS_TESTNET",
      base.feeCollector,
    ),
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
