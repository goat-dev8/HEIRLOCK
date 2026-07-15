import type { Env } from "@heirlock/config";
import type { AIProviderManager } from "@heirlock/ai-provider";
import type { SoSoValueClient } from "../soso/client.js";
import type { AppContext } from "../app.js";
import { prisma } from "../db.js";
import { probeRedis } from "../redis.js";
import { probeDatabase } from "../db.js";
import { runBackgroundPartnerPulse } from "../fo/partner-background.js";

export type WorkerHandles = {
  stop: () => void;
};

/**
 * Background workers: health heartbeat + optional SoSoValue cache warm.
 * No fake data — only real probes / real API reads.
 */
export function startWorkers(input: {
  env: Env;
  ai: AIProviderManager;
  soso: SoSoValueClient;
  ctx?: AppContext;
  log?: (msg: string, extra?: unknown) => void;
}): WorkerHandles {
  const log = input.log ?? ((msg, extra) => console.log(`[worker] ${msg}`, extra ?? ""));
  const timers: NodeJS.Timeout[] = [];

  // Heartbeat every 60s — persist agent meta
  timers.push(
    setInterval(async () => {
      try {
        const [db, redis] = await Promise.all([probeDatabase(), probeRedis()]);
        await prisma.agentMeta.upsert({
          where: { key: "heartbeat" },
          create: {
            key: "heartbeat",
            value: {
              at: new Date().toISOString(),
              db: db.connected,
              redis: redis.connected,
              aiRequests: input.ai.getMetrics().totalRequests,
            },
          },
          update: {
            value: {
              at: new Date().toISOString(),
              db: db.connected,
              redis: redis.connected,
              aiRequests: input.ai.getMetrics().totalRequests,
            },
          },
        });
      } catch (err) {
        log("heartbeat_failed", err instanceof Error ? err.message : err);
      }
    }, 60_000),
  );

  // Warm SoSoValue ETF cache every 5 minutes if key present
  if (input.soso.configured) {
    timers.push(
      setInterval(async () => {
        try {
          await input.soso.etfSummaryHistory({
            symbol: "BTC",
            country_code: "US",
            limit: 1,
          });
          log("soso_cache_warm_ok");
        } catch (err) {
          log("soso_cache_warm_fail", err instanceof Error ? err.message : err);
        }
      }, 5 * 60_000),
    );
  }

  // Persist AI metrics snapshot every 2 minutes
  timers.push(
    setInterval(async () => {
      try {
        const day = new Date();
        day.setUTCHours(0, 0, 0, 0);
        for (const h of input.ai.getHealth()) {
          await prisma.aiProviderMetric.upsert({
            where: {
              provider_model_day: {
                provider: h.id,
                model: h.model,
                day,
              },
            },
            create: {
              provider: h.id,
              model: h.model,
              successCount: Math.max(0, h.totalRequests - h.totalFailures),
              failureCount: h.totalFailures,
              totalLatency: h.totalLatencyMs,
              costUsd: h.estimatedCostUsd,
              day,
            },
            update: {
              successCount: Math.max(0, h.totalRequests - h.totalFailures),
              failureCount: h.totalFailures,
              totalLatency: h.totalLatencyMs,
              costUsd: h.estimatedCostUsd,
            },
          });
        }
      } catch (err) {
        log("ai_metrics_persist_fail", err instanceof Error ? err.message : err);
      }
    }, 120_000),
  );

  // Partner background pulse every 15 minutes (throttled per-thesis inside runDailyPulse)
  if (input.ctx) {
    const ctx = input.ctx;
    timers.push(
      setInterval(async () => {
        try {
          const result = await runBackgroundPartnerPulse(ctx);
          log("partner_background_pulse_ok", {
            pulsed: result.pulsed,
            skipped: result.skipped,
            errors: result.errors.length,
          });
        } catch (err) {
          log("partner_background_pulse_fail", err instanceof Error ? err.message : err);
        }
      }, 15 * 60_000),
    );
  }

  return {
    stop() {
      for (const t of timers) clearInterval(t);
    },
  };
}
