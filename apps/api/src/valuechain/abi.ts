export const WEALTH_POLICY_ABI = [
  {
    type: "function",
    name: "mode",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "maxNotionalUsd",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "controller",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "setMode",
    stateMutability: "nonpayable",
    inputs: [{ name: "next", type: "uint8" }],
    outputs: [],
  },
] as const;

export const ACTION_LOG_ABI = [
  {
    type: "function",
    name: "record",
    stateMutability: "nonpayable",
    inputs: [
      { name: "refType", type: "bytes32" },
      { name: "refId", type: "bytes32" },
      { name: "ipfsCid", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "length",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const ATTESTATION_REGISTRY_ABI = [
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "subject", type: "address" },
      { name: "kind", type: "bytes32" },
      { name: "contentHash", type: "bytes32" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "count",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const MODE_CONTROLLER_ABI = [
  {
    type: "function",
    name: "enterGuardian",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "enterHeir",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "guardian",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export const MODE_NAMES = ["Alive", "Guardian", "Heir"] as const;
export type WealthModeName = (typeof MODE_NAMES)[number];
