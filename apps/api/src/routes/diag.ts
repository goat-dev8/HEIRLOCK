import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app.js";
import { probeDatabase } from "../db.js";
import { probeRedis } from "../redis.js";
import {
  SODEX_CHAIN_IDS,
  SODEX_VERIFYING_CONTRACT,
  SPOT_BATCH_NEW_ORDER,
  SPOT_BATCH_CANCEL_ORDER,
  PERPS_NEW_ORDER,
  PERPS_CANCEL_ORDER,
} from "@heirlock/sodex-signing";

export async function registerDiagRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/api/diag", async () => {
    const [db, redis, soso] = await Promise.all([
      probeDatabase(),
      probeRedis(),
      ctx.soso.diagProbe(),
    ]);

    const ai = ctx.ai.getMetrics();
    const aiHealth = ctx.ai.getHealth();
    const nvidiaConfigured = Boolean(ctx.env.NVIDIA_API_KEY);
    const contractAddrs = {
      wealthPolicy: ctx.env.WEALTH_POLICY_ADDRESS ?? null,
      actionLog: ctx.env.ACTION_LOG_ADDRESS ?? null,
      modeController: ctx.env.MODE_CONTROLLER_ADDRESS ?? null,
      attestationRegistry: ctx.env.ATTESTATION_REGISTRY_ADDRESS ?? null,
      continuityNft: ctx.env.CONTINUITY_NFT_ADDRESS ?? null,
      feeCollector: ctx.env.FEE_COLLECTOR_ADDRESS ?? null,
    };
    const contractsDeployed = Object.values(contractAddrs).some(Boolean);

    return {
      service: "heirlock-api",
      profile: ctx.env.HEIRLOCK_DEFAULT_PROFILE,
      sodexArchitecture: "per-user-non-custodial-relay",
      globalSodexTradingKeysForbidden: true,
      checks: {
        database: db,
        redis,
        sosovalue: {
          configured: ctx.soso.configured,
          probeOk: soso.ok,
          latencyMs: soso.latencyMs,
          error: soso.error,
        },
        nvidia: {
          configured: nvidiaConfigured,
          primaryModel: ctx.env.NVIDIA_MODEL_PRIMARY,
          primaryProvider: ctx.env.AI_PRIMARY_PROVIDER,
          health: aiHealth,
          metrics: ai,
        },
        sodex: {
          mainnetSpot: ctx.env.SODEX_MAINNET_SPOT_REST,
          mainnetPerps: ctx.env.SODEX_MAINNET_PERPS_REST,
          testnetSpot: ctx.env.SODEX_TESTNET_SPOT_REST,
          testnetPerps: ctx.env.SODEX_TESTNET_PERPS_REST,
          tradingEnabled: ctx.env.TRADING_ENABLED && !ctx.env.KILL_SWITCH_TRADING,
          killSwitch: ctx.env.KILL_SWITCH_TRADING,
          allowTestnet: ctx.env.HEIRLOCK_ALLOW_TESTNET,
          maxNotionalUsd: ctx.env.TRADING_MAX_NOTIONAL_USD,
          mainnetHardCapUsd: Math.min(ctx.env.MAINNET_TEST_MAX_NOTIONAL_USD, 1),
          localTestWalletOnly: ctx.env.SODEX_LOCAL_TEST_WALLET_ONLY,
          paths: {
            spotPlace: "POST /trade/orders/batch",
            spotCancel: "DELETE /trade/orders/batch",
            perpsPlace: "POST /trade/orders",
            perpsCancel: "DELETE /trade/orders",
          },
          eip712: {
            version: ctx.env.SODEX_EIP712_VERSION,
            verifyingContract: SODEX_VERIFYING_CONTRACT,
            spotDomain: ctx.env.SODEX_EIP712_SPOT_NAME,
            perpsDomain: ctx.env.SODEX_EIP712_PERPS_NAME,
            chainIds: SODEX_CHAIN_IDS,
            actions: {
              spotPlace: SPOT_BATCH_NEW_ORDER,
              spotCancel: SPOT_BATCH_CANCEL_ORDER,
              perpsPlace: PERPS_NEW_ORDER,
              perpsCancel: PERPS_CANCEL_ORDER,
            },
            wireSig: "normalize ECDSA v to 0|1 then prepend 0x01",
          },
        },
        contracts: {
          deployed: contractsDeployed,
          addresses: contractAddrs,
          note: contractsDeployed
            ? "Addresses loaded from env"
            : "Not deployed — need forge + DEPLOYER_PRIVATE_KEY",
        },
        skills: {
          count: ctx.skills.registry.list().length,
          enabled: ctx.skills.registry.list().filter((s) => s.enabled).map((s) => s.id),
        },
        render: {
          healthCheckPath: "/api/health/live",
          blueprint: "render.yaml",
          secretsRequired: [
            "DATABASE_URL",
            "DIRECT_DATABASE_URL",
            "JWT_SECRET",
            "NVIDIA_API_KEY",
            "SOSO_API_KEY",
            "UPSTASH_REDIS_REST_URL",
            "UPSTASH_REDIS_REST_TOKEN",
            "CRON_SECRET",
            "TRADING_ALLOWLIST",
          ],
        },
      },
      ts: new Date().toISOString(),
    };
  });
}
