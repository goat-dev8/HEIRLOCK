import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadEnv } from "@heirlock/config";
import { buildApp } from "./app.js";
import { startWorkers } from "./workers/index.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv({ path: resolve(process.cwd(), ".env") });
loadDotenv();

async function main() {
  const env = loadEnv();
  const app = await buildApp(env);
  const workers = startWorkers({
    env,
    ai: app.ctx.ai,
    soso: app.ctx.soso,
    ctx: app.ctx,
    log: (msg, extra) => app.log.info({ extra }, msg),
  });

  const shutdown = async () => {
    workers.stop();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      {
        port: env.PORT,
        profile: env.HEIRLOCK_DEFAULT_PROFILE,
        ai: env.AI_PRIMARY_PROVIDER,
        nvidiaModel: env.NVIDIA_MODEL_PRIMARY,
        mainnetCap: env.MAINNET_TEST_MAX_NOTIONAL_USD,
      },
      "HEIRLOCK API listening",
    );
  } catch (err) {
    app.log.error(err);
    workers.stop();
    process.exit(1);
  }
}

main();
