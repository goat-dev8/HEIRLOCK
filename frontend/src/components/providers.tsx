"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { WagmiProvider } from "wagmi";
import type { ReactNode } from "react";
import { env } from "@/lib/env";
import { valuechainMainnet, valuechainTestnet } from "@/lib/wagmi";

const projectId = env.REOWN_PROJECT_ID || "5f50ddf3aa17cc1fb435598a4eada801";

const metadata = {
  name: "HEIRLOCK",
  description: "AI Finance OS. On-chain Family Office on SoSoValue.",
  url: "https://getheirlock.vercel.app",
  icons: ["https://getheirlock.vercel.app/favicon.ico"],
};

const networks = [valuechainMainnet, valuechainTestnet] as [
  typeof valuechainMainnet,
  typeof valuechainTestnet,
];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  themeMode: "dark",
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return <WagmiProvider config={wagmiAdapter.wagmiConfig}>{children}</WagmiProvider>;
}
