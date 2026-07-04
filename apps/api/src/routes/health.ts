import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app.js";
import { probeDatabase } from "../db.js";
import { probeRedis } from "../redis.js";

export async function registerHealthRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/api/health/live", async () => ({
    status: "ok",
    ts: new Date().toISOString(),
  }));

  app.get("/api/health", async () => {
    const [db, redis] = await Promise.all([probeDatabase(), probeRedis()]);
    const sosoConfigured = Boolean(ctx.env.SOSO_API_KEY);
    const nvidiaConfigured = Boolean(ctx.env.NVIDIA_API_KEY);

    const aiHealth = ctx.ai.getHealth();
    const nvidiaOk = aiHealth.some((h) => h.id === "nvidia" && !h.circuitOpen);

    const status =
      db.connected && nvidiaConfigured
        ? "ok"
        : db.configured || nvidiaConfigured
          ? "degraded"
          : "down";

    return {
      status,
      checks: {
        database: {
          configured: db.configured,
          connected: db.connected,
          error: db.error,
        },
        redis: {
          configured: redis.configured,
          connected: redis.connected,
          error: redis.error,
        },
        sosovalue: {
          configured: sosoConfigured,
          note: sosoConfigured ? "client live" : "SOSO_API_KEY missing",
        },
        nvidia: {
          configured: nvidiaConfigured,
          circuitHealthy: nvidiaOk,
          models: aiHealth.filter((h) => h.id === "nvidia").map((h) => h.model),
        },
        sodex: {
          architecture: "per-user-non-custodial-relay",
          globalTradingKeysForbidden: true,
          mainnetSpot: ctx.env.SODEX_MAINNET_SPOT_REST,
        },
      },
      profile: ctx.env.HEIRLOCK_DEFAULT_PROFILE,
      ts: new Date().toISOString(),
    };
  });
}
