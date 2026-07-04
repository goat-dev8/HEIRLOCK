/**
 * Live SoSoValue smoke — real OpenAPI call, no mocks.
 */
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadEnv } from "@heirlock/config";
import { createSoSoValueClient } from "./client.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

async function main() {
  const env = loadEnv();
  const client = createSoSoValueClient(env);
  if (!client.configured) {
    console.error("FAIL: SOSO_API_KEY missing");
    process.exit(1);
  }
  const probe = await client.diagProbe();
  console.log(
    JSON.stringify(
      {
        ok: probe.ok,
        latencyMs: probe.latencyMs,
        error: probe.error,
        hasSample: probe.sample != null,
        metrics: client.getMetrics(),
      },
      null,
      2,
    ),
  );
  if (!probe.ok) process.exit(1);
  console.log("PASS: SoSoValue live diag probe");
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
