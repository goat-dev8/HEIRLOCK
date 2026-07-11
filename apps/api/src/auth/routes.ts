import type { FastifyInstance } from "fastify";
import { SiweMessage } from "siwe";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import type { AppContext } from "../app.js";
import { issueAuthNonce, consumeAuthNonce } from "../redis.js";
import { signSession } from "./jwt.js";
import { createRequireWallet } from "./requireWallet.js";
import { prisma } from "../db.js";
import {
  isAllowedSiweDomain,
  parseOriginList,
  resolveSiweFromOrigin,
} from "../lib/cors-siwe.js";

const nonceBody = z.object({
  address: z.string().refine((a) => isAddress(a), "Invalid address"),
});

const verifyBody = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);
  const corsAllowlist = parseOriginList(ctx.env.CORS_ALLOWED_ORIGINS);

  app.post("/api/auth/nonce", async (req, reply) => {
    const parsed = nonceBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const address = getAddress(parsed.data.address);
    const nonce = await issueAuthNonce(address);
    const originHeader =
      typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    const siwe = resolveSiweFromOrigin({
      originHeader,
      configuredDomain: ctx.env.SIWE_DOMAIN,
      configuredUri: ctx.env.SIWE_URI,
      corsAllowlist,
    });
    return {
      address,
      nonce,
      domain: siwe.domain,
      uri: siwe.uri,
      chainId: ctx.env.VALUECHAIN_MAINNET_CHAIN_ID,
      statement: "Sign in to HEIRLOCK",
    };
  });

  app.post("/api/auth/verify", async (req, reply) => {
    const parsed = verifyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    let siwe: SiweMessage;
    try {
      siwe = new SiweMessage(parsed.data.message);
    } catch {
      return reply.code(400).send({ error: "Invalid SIWE message" });
    }

    if (!isAllowedSiweDomain(siwe.domain, ctx.env.SIWE_DOMAIN, corsAllowlist)) {
      return reply.code(401).send({ error: "SIWE domain mismatch" });
    }

    const address = getAddress(siwe.address);
    if (!siwe.nonce || !(await consumeAuthNonce(address, siwe.nonce))) {
      return reply.code(401).send({ error: "Invalid or reused nonce" });
    }

    const result = await siwe.verify({
      signature: parsed.data.signature,
      domain: siwe.domain,
      nonce: siwe.nonce,
    });

    if (!result.success) {
      return reply.code(401).send({ error: "SIWE verification failed" });
    }

    const profile = await prisma.userProfile.upsert({
      where: { walletAddress: address.toLowerCase() },
      create: { walletAddress: address.toLowerCase() },
      update: {},
    });

    const token = await signSession(ctx.env, address);
    return {
      token,
      address: address.toLowerCase(),
      userId: profile.id,
      expiresIn: "7d",
    };
  });

  app.get("/api/auth/me", { preHandler: requireWallet }, async (req) => {
    const address = req.wallet!.address;
    const profile = await prisma.userProfile.findUnique({
      where: { walletAddress: address },
      include: { sodexAccounts: true, wealthPolicy: true },
    });
    return {
      address,
      profile,
    };
  });
}
