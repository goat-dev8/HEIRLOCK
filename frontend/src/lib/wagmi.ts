import type { Chain } from "viem";
import { env } from "./env";

export const valuechainMainnet: Chain = {
  id: env.VALUECHAIN.mainnet.chainId,
  name: "ValueChain",
  nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
  rpcUrls: { default: { http: [env.VALUECHAIN.mainnet.rpc] } },
  blockExplorers: {
    default: { name: "ValueScan", url: env.VALUECHAIN.mainnet.explorer },
  },
};

export const valuechainTestnet: Chain = {
  id: env.VALUECHAIN.testnet.chainId,
  name: "ValueChain Testnet",
  nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
  rpcUrls: { default: { http: [env.VALUECHAIN.testnet.rpc] } },
  blockExplorers: {
    default: { name: "ValueScan Testnet", url: env.VALUECHAIN.testnet.explorer },
  },
  testnet: true,
};

export const heirlockNetworks = [valuechainMainnet, valuechainTestnet] as const;
