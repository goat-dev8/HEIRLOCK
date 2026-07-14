import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { loadEnv, publicRuntimeConfig, type Env } from "@heirlock/config";
import { createAIProviderManager, type AIProviderManager } from "@heirlock/ai-provider";
import { createSoSoValueClient, type SoSoValueClient } from "./soso/client.js";
import { createSodexClient, type SodexClient } from "./sodex/client.js";
import { createSkillsOs } from "./skills/os.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerConfigRoutes } from "./routes/config.js";
import { registerAiRoutes } from "./routes/ai.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerSosoRoutes } from "./soso/routes.js";
import { registerSodexRoutes } from "./sodex/routes.js";
import { registerSsiRoutes } from "./ssi/routes.js";
import { registerSkillRoutes } from "./skills/routes.js";
import { registerDiagRoutes } from "./routes/diag.js";
import { registerContractsRoutes } from "./routes/contracts.js";
import { registerCronRoutes } from "./routes/cron.js";
import { registerLivingRoutes } from "./routes/living.js";
import { registerPartnerRoutes } from "./routes/partner.js";

export type AppContext = {
  env: Env;
  ai: AIProviderManager;
  soso: SoSoValueClient;
  sodex: SodexClient;
  skills: ReturnType<typeof createSkillsOs>;
};

export async function buildApp(env: Env = loadEnv()) {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });

  const origins = env.CORS_ALLOWED_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { isAllowedCorsOrigin } = await import("./lib/cors-siwe.js");

  await app.register(cors, {
    origin: (origin, cb) => {
      cb(null, isAllowedCorsOrigin(origin, origins));
    },
    credentials: true,
  });

  const ctx: AppContext = {
    env,
    ai: createAIProviderManager(env),
    soso: createSoSoValueClient(env),
    sodex: createSodexClient(env),
    skills: createSkillsOs(),
  };

  app.decorate("ctx", ctx);

  await registerHealthRoutes(app, ctx);
  await registerConfigRoutes(app, ctx);
  await registerAiRoutes(app, ctx);
  await registerAuthRoutes(app, ctx);
  await registerSosoRoutes(app, ctx);
  await registerSodexRoutes(app, ctx);
  await registerSsiRoutes(app, ctx);
  await registerSkillRoutes(app, ctx);
  await registerDiagRoutes(app, ctx);
  await registerContractsRoutes(app, ctx);
  await registerLivingRoutes(app, ctx);
  await registerPartnerRoutes(app, ctx);
  await registerCronRoutes(app, ctx);

  app.get("/", async () => ({
    name: "HEIRLOCK API",
    status: "ok",
    profile: env.HEIRLOCK_DEFAULT_PROFILE,
    sodexArchitecture: "per-user-non-custodial-relay",
    aiPrimary: env.AI_PRIMARY_PROVIDER,
  }));

  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    ctx: AppContext;
  }
}

void publicRuntimeConfig;
