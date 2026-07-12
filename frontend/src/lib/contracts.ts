import type { NetworkEnv } from "./env";

export const CONTRACTS: Record<NetworkEnv, {
  chainId: number;
  explorer: string;
  addresses: {
    wealthPolicy: `0x${string}`;
    actionLog: `0x${string}`;
    modeController: `0x${string}`;
    attestationRegistry: `0x${string}`;
    continuityNft: `0x${string}`;
    feeCollector: `0x${string}`;
  };
}> = {
  mainnet: {
    chainId: 286623,
    explorer: "https://main-scan.valuechain.xyz",
    addresses: {
      wealthPolicy: "0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C",
      actionLog: "0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b",
      modeController: "0xdBAE8db588e39Ba5EBe2C749Ba06Daf24F6F3450",
      attestationRegistry: "0x3C1f4718a45e80c6D4E8772909712c1599D8D51D",
      continuityNft: "0xD7464d9182ffe02d7255Cf3e319145755eE8517d",
      feeCollector: "0x16F3B1b67461B20F889998A059526E2acfcdf060",
    },
  },
  testnet: {
    chainId: 138565,
    explorer: "https://test-scan.valuechain.xyz",
    addresses: {
      wealthPolicy: "0x3C1f4718a45e80c6D4E8772909712c1599D8D51D",
      actionLog: "0xD7464d9182ffe02d7255Cf3e319145755eE8517d",
      modeController: "0x16F3B1b67461B20F889998A059526E2acfcdf060",
      attestationRegistry: "0xfdC9A9F19441f10729769393CBBD6d870802Ace9",
      continuityNft: "0x273F1874E1acAe0aa74F04DaeAb718E1CD8d287B",
      feeCollector: "0xBd9dB4C0F048527358a8A6050fA3b5d31a49D067",
    },
  },
};

export const WEALTH_POLICY_ABI = [
  { type: "function", name: "mode", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "maxNotionalUsd", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "controller", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export const ACTION_LOG_ABI = [
  { type: "function", name: "length", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "entries",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "actor", type: "address" },
      { name: "refType", type: "bytes32" },
      { name: "refId", type: "bytes32" },
      { name: "ipfsCid", type: "string" },
      { name: "timestamp", type: "uint256" },
    ],
  },
] as const;

export const ATTESTATION_ABI = [
  { type: "function", name: "count", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const CONTINUITY_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "nextId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const MODE_NAMES = ["Alive", "Guardian", "Heir"] as const;