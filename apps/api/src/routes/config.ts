import type { FastifyInstance } from "fastify";
import { publicRuntimeConfig } from "@heirlock/config";
import type { AppContext } from "../app.js";

export async function registerConfigRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/api/config/environment", async () => {
    return {
      ...publicRuntimeConfig(ctx.env),
      apiPublicUrl: ctx.env.API_PUBLIC_URL,
      nodeEnv: ctx.env.NODE_ENV,
    };
  });
}
