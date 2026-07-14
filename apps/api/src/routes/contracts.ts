import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app.js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadArtifact(name: string) {
  const candidates = [
    resolve(process.cwd(), `../../contracts/deployments/${name}`),
    resolve(process.cwd(), `../contracts/deployments/${name}`),
    resolve(process.cwd(), `contracts/deployments/${name}`),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
    }
  }
  return null;
}

export async function registerContractsRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/api/contracts", async () => {
    const mainnetArtifact = loadArtifact("valuechain-mainnet.json");
    const testnetArtifact = loadArtifact("valuechain-testnet.json");
    const mainnet = {
      wealthPolicy: ctx.env.WEALTH_POLICY_ADDRESS ?? null,
      actionLog: ctx.env.ACTION_LOG_ADDRESS ?? null,
      modeController: ctx.env.MODE_CONTROLLER_ADDRESS ?? null,
      attestationRegistry: ctx.env.ATTESTATION_REGISTRY_ADDRESS ?? null,
      continuityNft: ctx.env.CONTINUITY_NFT_ADDRESS ?? null,
      feeCollector: ctx.env.FEE_COLLECTOR_ADDRESS ?? null,
    };
    const testnet = {
      wealthPolicy: ctx.env.WEALTH_POLICY_ADDRESS_TESTNET ?? null,
      actionLog: ctx.env.ACTION_LOG_ADDRESS_TESTNET ?? null,
      modeController: ctx.env.MODE_CONTROLLER_ADDRESS_TESTNET ?? null,
      attestationRegistry: ctx.env.ATTESTATION_REGISTRY_ADDRESS_TESTNET ?? null,
      continuityNft: ctx.env.CONTINUITY_NFT_ADDRESS_TESTNET ?? null,
      feeCollector: ctx.env.FEE_COLLECTOR_ADDRESS_TESTNET ?? null,
    };
    return {
      mainnet: {
        chainId: ctx.env.VALUECHAIN_MAINNET_CHAIN_ID,
        explorer: ctx.env.VALUECHAIN_MAINNET_EXPLORER,
        deployed: Object.values(mainnet).every(Boolean),
        addresses: mainnet,
        artifact: mainnetArtifact,
      },
      testnet: {
        chainId: ctx.env.VALUECHAIN_TESTNET_CHAIN_ID,
        explorer: ctx.env.VALUECHAIN_TESTNET_EXPLORER,
        deployed: Object.values(testnet).every(Boolean),
        addresses: testnet,
        artifact: testnetArtifact,
      },
      fundingNote:
        "Testnet native SOSO: buy WSOSO on SoDEX → POST /accounts/transfers EVM_WITHDRAW (type=2, toAccountID=999). No public withdraw UI.",
    };
  });
}
