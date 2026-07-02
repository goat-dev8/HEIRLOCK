import type { FastifyReply, FastifyRequest } from "fastify";
import { verifySession, type SessionClaims } from "./jwt.js";
import type { Env } from "@heirlock/config";

declare module "fastify" {
  interface FastifyRequest {
    wallet?: SessionClaims;
  }
}

export function createRequireWallet(env: Env) {
  return async function requireWallet(req: FastifyRequest, reply: FastifyReply) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Missing Bearer token" });
    }
    const token = header.slice("Bearer ".length).trim();
    try {
      req.wallet = await verifySession(env, token);
    } catch {
      return reply.code(401).send({ error: "Invalid or expired session" });
    }
  };
}
