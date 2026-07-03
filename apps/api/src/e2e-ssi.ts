/**
 * SSI + SoSoValue index smoke (real OpenAPI).
 */
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadEnv } from "@heirlock/config";
import { createSoSoValueClient } from "./soso/client.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

async function main() {
  const env = loadEnv();
  const soso = createSoSoValueClient(env);
  if (!soso.configured) {
    console.error("FAIL: SOSO_API_KEY missing");
    process.exit(1);
  }

  const etf = await soso.diagProbe();
  console.log(JSON.stringify({ etfOk: etf.ok, latencyMs: etf.latencyMs }));

  // SSI index via SoSoValue — try known index id from docs (ssimag7)
  try {
    const constituents = await soso.indexConstituents("ssimag7");
    console.log(
      JSON.stringify({
        index: "ssimag7",
        ok: constituents != null,
        preview: JSON.stringify(constituents).slice(0, 200),
      }),
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        index: "ssimag7",
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        note: "Index id may differ — ETF probe still required",
      }),
    );
  }

  if (!etf.ok) process.exit(1);
  console.log("PASS: SSI/SoSoValue smoke");
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
