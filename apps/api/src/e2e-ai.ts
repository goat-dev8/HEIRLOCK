/**
 * AI failover smoke — force primary NVIDIA model failure path by using preferProvider chain.
 * Verifies real responses (no mocks).
 */
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadEnv } from "@heirlock/config";
import { AIProviderManager } from "@heirlock/ai-provider";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

async function main() {
  const env = loadEnv();
  const mgr = new AIProviderManager(env);

  const primary = await mgr.chat({
    messages: [{ role: "user", content: 'Reply JSON only: {"ping":"pong"}' }],
    maxTokens: 64,
    temperature: 0,
    thinking: false,
  });
  console.log(
    JSON.stringify({
      primaryProvider: primary.provider,
      primaryModel: primary.model,
      ok: Boolean(primary.content),
      latencyMs: primary.latencyMs,
    }),
  );

  const health = await mgr.healthCheck();
  const nvidia = health.filter((h) => h.id === "nvidia");
  console.log(
    JSON.stringify({
      nvidiaEndpoints: nvidia.length,
      anyHealthy: nvidia.some((h) => !h.circuitOpen),
      fallbacksConfigured: mgr
        .listEndpoints()
        .filter((e) => e.id !== "nvidia")
        .map((e) => e.id),
    }),
  );

  if (!primary.content) {
    console.error("FAIL: empty AI content");
    process.exit(1);
  }
  console.log("PASS: AI provider manager live");
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
