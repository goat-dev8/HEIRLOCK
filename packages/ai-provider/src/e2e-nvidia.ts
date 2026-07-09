/**
 * Real end-to-end NVIDIA smoke test.
 * Uses NVIDIA_API_KEY from repo-root .env — never prints the key.
 */
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadEnv } from "@heirlock/config";
import { AIProviderManager } from "./manager.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv({ path: resolve(process.cwd(), ".env") });
loadDotenv();

async function main() {
  const env = loadEnv();
  if (!env.NVIDIA_API_KEY) {
    console.error("FAIL: NVIDIA_API_KEY missing");
    process.exit(1);
  }

  const mgr = new AIProviderManager(env);
  const endpoints = mgr.listEndpoints().filter((e) => e.id === "nvidia");
  console.log(
    "NVIDIA endpoints:",
    endpoints.map((e) => e.model).join(" | ") || "(none)",
  );

  const started = Date.now();
  const res = await mgr.chat({
    messages: [
      {
        role: "system",
        content: "You are a concise systems assistant for HEIRLOCK.",
      },
      {
        role: "user",
        content:
          "Reply with a single JSON object: {\"ok\":true,\"product\":\"HEIRLOCK\"}. No markdown.",
      },
    ],
    temperature: 0.2,
    maxTokens: 256,
    thinking: true,
    preferProvider: "nvidia",
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: res.provider,
        model: res.model,
        latencyMs: res.latencyMs,
        wallMs: Date.now() - started,
        contentPreview: (res.content || "").slice(0, 200),
        hasReasoning: Boolean(res.reasoning),
        usage: res.usage,
      },
      null,
      2,
    ),
  );

  if (!res.content || res.provider !== "nvidia") {
    console.error("FAIL: unexpected response");
    process.exit(1);
  }
  console.log("PASS: NVIDIA e2e chat completion succeeded");
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
