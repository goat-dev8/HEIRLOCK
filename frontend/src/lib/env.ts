export const env = {
  API_URL: (import.meta.env.VITE_API_URL as string) || "https://heirlock-api.onrender.com",
  DEFAULT_ENVIRONMENT: (import.meta.env.VITE_DEFAULT_ENVIRONMENT as string) || "mainnet",
  REOWN_PROJECT_ID: (import.meta.env.VITE_REOWN_PROJECT_ID as string) || "",
  VALUECHAIN: {
    mainnet: {
      chainId: 286623,
      rpc: "https://mainnet.valuechain.xyz",
      explorer: "https://main-scan.valuechain.xyz",
      nativeSymbol: "SOSO",
    },
    testnet: {
      chainId: 138565,
      rpc: "https://testnet-v2.valuechain.xyz",
      explorer: "https://test-scan.valuechain.xyz",
      nativeSymbol: "SOSO",
    },
  },
  SODEX: {
    mainnetAppUrl: "https://sodex.com",
    testnetAppUrl: "https://testnet.sodex.com",
  },
  SSI: {
    appUrl: "https://ssi.sosovalue.com",
    earnUrl: "https://ssi.sosovalue.com/earn",
    rewardUrl: "https://ssi.sosovalue.com/reward",
  },
} as const;

export type NetworkEnv = "mainnet" | "testnet";