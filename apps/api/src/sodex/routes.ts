import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getAddress, isAddress } from "viem";
import type { AppContext } from "../app.js";
import { createRequireWallet } from "../auth/requireWallet.js";
import { prisma } from "../db.js";
import type { SodexEnvironment } from "./client.js";
import { evaluateTradePolicyWithChain, extractNotionalUsd } from "../trading/policy.js";
import { prepareSpotBatchOrder, preparePerpsOrder } from "../trading/engine.js";
import { nextSodexNonce } from "./nonce.js";
import { SodexWsClient } from "./ws.js";
import {
  buildSpotPriceMap,
  enrichBalancesWithUsd,
  mergeSymbolsWithTickers,
} from "./mark-to-market.js";
import { applyFillEvidence, reconcileFill } from "./fill-proof.js";
import { linkDecisionToOrder } from "../fo/fill-learning.js";
import {
  getCapability,
  isBuyable,
  isCancelOnlyError,
  recordCancelOnly,
  recordLiveMatcherOk,
} from "./capability.js";

const envSchema = z.enum(["mainnet", "testnet"]);

export async function registerSodexRoutes(app: FastifyInstance, ctx: AppContext) {
  const requireWallet = createRequireWallet(ctx.env);

  app.get("/api/sodex/gateways", async (req) => {
    const q = req.query as { environment?: string };
    const environment = (q.environment === "testnet" ? "testnet" : "mainnet") as SodexEnvironment;
    const gw = ctx.sodex.gateways(environment);
    return {
      environment,
      ...gw,
      portfolioUrl: ctx.sodex.portfolioUrl(environment),
      architecture: "per-user-non-custodial-relay",
      mainnetMaxNotionalUsd: ctx.env.MAINNET_TEST_MAX_NOTIONAL_USD,
      note: "Users must Enable Trading on official SoDEX; aid is stored per wallet in Supabase",
    };
  });

  app.get("/api/sodex/markets/symbols", async (req, reply) => {
    const q = req.query as { environment?: string; symbol?: string; market?: string };
    const environment = (q.environment === "testnet" ? "testnet" : "mainnet") as SodexEnvironment;
    const market = q.market === "perps" ? "perps" : "spot";
    try {
      const [symbolsRaw, tickersRaw] = await Promise.all([
        market === "perps"
          ? ctx.sodex.listPerpsSymbols(environment, q.symbol)
          : ctx.sodex.listSymbols(environment, q.symbol),
        market === "perps"
          ? ctx.sodex.getPerpsTicker(environment, q.symbol).catch(() => null)
          : ctx.sodex.getTicker(environment, q.symbol).catch(() => null),
      ]);
      const data = tickersRaw
        ? mergeSymbolsWithTickers(symbolsRaw, tickersRaw)
        : mergeSymbolsWithTickers(symbolsRaw, []);
      return { environment, market, data, priced: Boolean(tickersRaw) };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "markets failed",
      });
    }
  });

  app.get("/api/sodex/markets/tickers", async (req, reply) => {
    const q = req.query as { environment?: string; market?: string; symbol?: string };
    const environment = (q.environment === "testnet" ? "testnet" : "mainnet") as SodexEnvironment;
    const market = q.market === "perps" ? "perps" : "spot";
    try {
      const data =
        market === "perps"
          ? await ctx.sodex.getPerpsTicker(environment, q.symbol)
          : await ctx.sodex.getTicker(environment, q.symbol);
      return { environment, market, data, prices: Object.fromEntries(buildSpotPriceMap(data)) };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "tickers failed",
      });
    }
  });

  app.get("/api/sodex/markets/:symbol/orderbook", async (req, reply) => {
    const params = z.object({ symbol: z.string() }).safeParse(req.params);
    const q = req.query as { environment?: string; limit?: string; market?: string };
    if (!params.success) return reply.code(400).send({ error: "symbol required" });
    const environment = (q.environment === "testnet" ? "testnet" : "mainnet") as SodexEnvironment;
    const market = q.market === "perps" ? "perps" : "spot";
    try {
      const data =
        market === "perps"
          ? await ctx.sodex.getPerpsOrderbook(
              environment,
              params.data.symbol,
              q.limit ? Number(q.limit) : 10,
            )
          : await ctx.sodex.getOrderbook(
              environment,
              params.data.symbol,
              q.limit ? Number(q.limit) : 10,
            );
      return { environment, market, symbol: params.data.symbol, data };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "orderbook failed",
      });
    }
  });

  app.post("/api/sodex/verify-account", { preHandler: requireWallet }, async (req, reply) => {
    const body = z
      .object({
        environment: envSchema.default("mainnet"),
        address: z.string().optional(),
      })
      .safeParse(req.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten() });
    }

    const wallet = req.wallet!.address;
    const address = body.data.address
      ? getAddress(body.data.address)
      : getAddress(wallet);

    if (address.toLowerCase() !== wallet) {
      return reply.code(403).send({
        error: "Address must match authenticated wallet (non-custodial)",
      });
    }

    if (body.data.environment === "testnet" && !ctx.env.HEIRLOCK_ALLOW_TESTNET) {
      return reply.code(403).send({ error: "Testnet disabled" });
    }

    try {
      const { aid, raw } = await ctx.sodex.getAccountState(body.data.environment, address);

      const profile = await prisma.userProfile.upsert({
        where: { walletAddress: wallet },
        create: { walletAddress: wallet },
        update: {},
      });

      const account = await prisma.sodexAccount.upsert({
        where: {
          walletAddress_environment: {
            walletAddress: wallet,
            environment: body.data.environment,
          },
        },
        create: {
          userId: profile.id,
          walletAddress: wallet,
          environment: body.data.environment,
          accountId: aid,
          verifiedAt: new Date(),
          rawStateJson: raw as object,
        },
        update: {
          accountId: aid,
          verifiedAt: new Date(),
          rawStateJson: raw as object,
        },
      });

      return {
        walletAddress: wallet,
        environment: body.data.environment,
        accountId: account.accountId,
        verifiedAt: account.verifiedAt,
        portfolioUrl: ctx.sodex.portfolioUrl(body.data.environment),
        enableTradingUrl: ctx.sodex.gateways(body.data.environment).appUrl,
      };
    } catch (err) {
      req.log.error(err);
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "SoDEX verify failed",
        hint: "Open official SoDEX, connect the same wallet, and Enable Trading first",
        enableTradingUrl: ctx.sodex.gateways(body.data.environment).appUrl,
      });
    }
  });

  app.get("/api/sodex/me/account", { preHandler: requireWallet }, async (req) => {
    const q = req.query as { environment?: string };
    const environment = (q.environment === "testnet" ? "testnet" : "mainnet") as SodexEnvironment;
    const account = await prisma.sodexAccount.findUnique({
      where: {
        walletAddress_environment: {
          walletAddress: req.wallet!.address,
          environment,
        },
      },
    });
    return {
      environment,
      account,
      portfolioUrl: ctx.sodex.portfolioUrl(environment),
      verified: Boolean(account),
    };
  });

  app.get("/api/sodex/me/portfolio", { preHandler: requireWallet }, async (req, reply) => {
    const q = req.query as { environment?: string };
    const environment = (q.environment === "testnet" ? "testnet" : "mainnet") as SodexEnvironment;
    const wallet = req.wallet!.address;

    const account = await prisma.sodexAccount.findUnique({
      where: {
        walletAddress_environment: {
          walletAddress: wallet,
          environment,
        },
      },
    });
    if (!account) {
      return reply.code(404).send({
        error: "SoDEX account not verified — POST /api/sodex/verify-account first",
        enableTradingUrl: ctx.sodex.gateways(environment).appUrl,
      });
    }

    try {
      const [balancesRaw, orders, trades, state, tickersRaw] = await Promise.all([
        ctx.sodex.getBalances(environment, wallet, account.accountId).catch((e) => ({
          error: String(e),
        })),
        ctx.sodex.getOpenOrders(environment, wallet, account.accountId).catch((e) => ({
          error: String(e),
        })),
        ctx.sodex.getTrades(environment, wallet).catch((e) => ({ error: String(e) })),
        ctx.sodex.getAccountState(environment, wallet).catch((e) => ({ error: String(e) })),
        ctx.sodex.getTicker(environment).catch(() => null),
      ]);

      let orderHistory: unknown = null;
      try {
        orderHistory = await ctx.sodex.getOrderHistory(environment, wallet);
      } catch (e) {
        orderHistory = {
          unavailable: true,
          error: e instanceof Error ? e.message : String(e),
        };
      }

      const prices = buildSpotPriceMap(tickersRaw);
      const marked =
        tickersRaw && !(balancesRaw as { error?: string }).error
          ? enrichBalancesWithUsd(balancesRaw, prices)
          : {
              balances: balancesRaw,
              totals: {
                usd: null,
                assets: 0,
                pricedAssets: 0,
                note: "USD marks unavailable",
              },
            };

      return {
        environment,
        accountId: account.accountId,
        walletAddress: wallet,
        balances: marked.balances,
        totals: marked.totals,
        orders,
        trades,
        orderHistory,
        state,
        portfolioUrl: ctx.sodex.portfolioUrl(environment),
        pricing: {
          source: "sodex-spot-tickers-lastPx",
          tickerCount: prices.size,
        },
      };
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "SoDEX portfolio read failed",
      });
    }
  });

  app.post("/api/sodex/orders/prepare", { preHandler: requireWallet }, async (req, reply) => {
    const parsed = z
      .object({
        environment: envSchema.default("testnet"),
        market: z.enum(["spot", "perps"]).default("spot"),
        symbolID: z.number().int().positive(),
        side: z.union([z.string(), z.number()]),
        type: z.union([z.string(), z.number()]),
        timeInForce: z.union([z.string(), z.number()]),
        modifier: z.union([z.string(), z.number()]).optional(),
        price: z.string().optional(),
        quantity: z.string().optional(),
        funds: z.string().optional(),
        clOrdID: z.string().optional(),
        reduceOnly: z.boolean().optional(),
        positionSide: z.union([z.string(), z.number()]).optional(),
        notionalUsd: z.number().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const wallet = req.wallet!.address;
    const account = await prisma.sodexAccount.findUnique({
      where: {
        walletAddress_environment: {
          walletAddress: wallet,
          environment: parsed.data.environment,
        },
      },
    });
    if (!account) {
      return reply.code(404).send({ error: "Verify SoDEX account first" });
    }

    const prepared =
      parsed.data.market === "perps"
        ? await preparePerpsOrder(ctx.env, {
            environment: parsed.data.environment,
            accountID: account.accountId,
            symbolID: parsed.data.symbolID,
            side: parsed.data.side,
            type: parsed.data.type,
            timeInForce: parsed.data.timeInForce,
            modifier: parsed.data.modifier,
            price: parsed.data.price,
            quantity: parsed.data.quantity,
            funds: parsed.data.funds,
            clOrdID: parsed.data.clOrdID,
            reduceOnly: parsed.data.reduceOnly,
            positionSide: parsed.data.positionSide,
            notionalUsd: parsed.data.notionalUsd,
            wallet,
          })
        : await prepareSpotBatchOrder(ctx.env, {
            environment: parsed.data.environment,
            accountID: account.accountId,
            symbolID: parsed.data.symbolID,
            side: parsed.data.side,
            type: parsed.data.type,
            timeInForce: parsed.data.timeInForce,
            price: parsed.data.price,
            quantity: parsed.data.quantity,
            funds: parsed.data.funds,
            clOrdID: parsed.data.clOrdID,
            notionalUsd: parsed.data.notionalUsd,
            wallet,
          });

    if (!prepared.ok) {
      return reply.code(403).send({
        error: "policy_blocked",
        reason: prepared.reason,
        effectiveCapUsd: prepared.effectiveCapUsd,
        onChain: prepared.onChain ?? null,
      });
    }

    const nonce = await nextSodexNonce(wallet);
    return {
      ...prepared,
      suggestedNonce: nonce.toString(),
      signHint:
        "EIP-712 ExchangeAction{payloadHash,nonce} under domain spot/futures; prepend 0x01 to sig",
    };
  });

  app.get("/api/sodex/markets/capability", { preHandler: requireWallet }, async (req) => {
    const q = req.query as { environment?: string; symbol?: string };
    const environment = (q.environment === "testnet" ? "testnet" : "mainnet") as
      | "mainnet"
      | "testnet";
    const symbol = String(q.symbol ?? "").trim();
    if (!symbol) {
      return { environment, capability: null, buyable: false, note: "symbol required" };
    }
    const capability = await getCapability({ environment, symbol });
    return {
      environment,
      symbol: symbol.toUpperCase(),
      capability,
      buyable: isBuyable(capability),
      note: capability
        ? "Cached signed capability"
        : "UNVERIFIED — capability seeds after a signed matcher accept or verified fill",
    };
  });

  app.post("/api/sodex/orders/place", { preHandler: requireWallet }, async (req, reply) => {
    const parsed = z
      .object({
        environment: envSchema.default("testnet"),
        params: z.unknown(),
        apiSign: z.string().regex(/^0x01[0-9a-fA-F]{130}$/),
        apiNonce: z.string().min(1),
        apiKeyName: z.string().optional(),
        notionalUsd: z.number().optional(),
        market: z.enum(["spot", "perps"]).default("spot"),
        side: z.string().optional(),
        decisionId: z.string().min(1).optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const wallet = req.wallet!.address;
    const notionalUsd =
      parsed.data.notionalUsd ?? extractNotionalUsd(parsed.data.params);
    const policy = await evaluateTradePolicyWithChain(ctx.env, {
      wallet,
      notionalUsd,
      environment: parsed.data.environment,
    });
    if (!policy.ok) {
      return reply.code(403).send({
        error: "policy_blocked",
        reason: policy.reason,
        effectiveCapUsd: policy.effectiveCapUsd,
        onChain: policy.onChain ?? null,
      });
    }

    const account = await prisma.sodexAccount.findUnique({
      where: {
        walletAddress_environment: {
          walletAddress: wallet,
          environment: parsed.data.environment,
        },
      },
    });
    if (!account) {
      return reply.code(404).send({ error: "Verify SoDEX account first" });
    }

    const market = parsed.data.market;
    const order = await prisma.signedOrder.create({
      data: {
        userId: account.userId,
        walletAddress: wallet,
        environment: parsed.data.environment,
        accountId: account.accountId,
        market,
        side: parsed.data.side ?? "unknown",
        orderType: market === "perps" ? "newOrder" : "batchNewOrder",
        notionalUsd: notionalUsd != null ? notionalUsd : undefined,
        payloadJson: parsed.data.params as object,
        signature: parsed.data.apiSign,
        status: "submitted",
        proofUrl: ctx.sodex.portfolioUrl(parsed.data.environment),
      },
    });

    if (parsed.data.decisionId) {
      await linkDecisionToOrder({
        wallet,
        decisionId: parsed.data.decisionId,
        signedOrderId: order.id,
      }).catch(() => undefined);
    }

    try {
      const relayOpts = {
        apiSign: parsed.data.apiSign,
        apiNonce: parsed.data.apiNonce,
        apiKeyName: parsed.data.apiKeyName,
      };
      const result =
        market === "perps"
          ? await ctx.sodex.placePerpsOrders(
              parsed.data.environment,
              wallet,
              parsed.data.params,
              relayOpts,
            )
          : await ctx.sodex.placeOrders(
              parsed.data.environment,
              wallet,
              parsed.data.params,
              relayOpts,
            );

      const sodexOrderId = extractOrderId(result);
      // Gateway HTTP success = submitted only — never claim filled here.
      await prisma.signedOrder.update({
        where: { id: order.id },
        data: {
          status: "submitted",
          sodexOrderId,
          payloadJson: { request: parsed.data.params, response: result } as object,
        },
      });

      const evidence = await reconcileFill({
        sodex: ctx.sodex,
        environment: parsed.data.environment,
        wallet,
        sodexOrderId: sodexOrderId ?? null,
      });
      await applyFillEvidence({
        signedOrderId: order.id,
        userId: account.userId,
        environment: parsed.data.environment,
        market,
        wallet,
        evidence,
      });

      if (sodexOrderId) {
        await recordLiveMatcherOk({
          environment: parsed.data.environment,
          symbol: order.market !== "unknown" && order.market !== "spot" && order.market !== "perps"
            ? order.market
            : "MARKET",
          filled: evidence.status === "filled" || evidence.status === "partial",
        }).catch(() => undefined);
      } else if (evidence.status === "filled" || evidence.status === "partial" || evidence.historyMatch) {
        await recordLiveMatcherOk({
          environment: parsed.data.environment,
          symbol: order.market,
          filled: true,
        }).catch(() => undefined);
      }

      return {
        orderId: order.id,
        sodexOrderId,
        status: evidence.status,
        fillProof: {
          executedQty: evidence.executedQty,
          tradeIds: evidence.tradeIds,
          historyMatch: evidence.historyMatch,
          tradesMatch: evidence.tradesMatch,
          balanceChecked: evidence.balanceChecked,
          note: evidence.note,
        },
        result,
        proofUrl: order.proofUrl,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isCancelOnlyError(msg)) {
        await recordCancelOnly({
          environment: parsed.data.environment,
          symbol: order.market,
          reason: msg,
        }).catch(() => undefined);
      }
      await prisma.signedOrder.update({
        where: { id: order.id },
        data: {
          status: "failed",
          errorMessage: msg,
        },
      });
      return reply.code(502).send({
        error: msg || "Place order failed",
        orderId: order.id,
      });
    }
  });

  app.post("/api/sodex/relay", { preHandler: requireWallet }, async (req, reply) => {
    if (!ctx.env.TRADING_ENABLED || ctx.env.KILL_SWITCH_TRADING) {
      return reply.code(403).send({ error: "Trading kill switch active" });
    }

    const parsed = z
      .object({
        environment: envSchema.default("mainnet"),
        path: z.string().min(1),
        body: z.unknown(),
        signer: z.string().refine((a) => isAddress(a), "Invalid signer"),
        apiSign: z
          .string()
          .regex(/^0x01[0-9a-fA-F]{130}$/, "X-API-Sign must be 0x01 + 65-byte sig"),
        apiNonce: z.string().min(1),
        apiKeyName: z.string().optional(),
        method: z.enum(["POST", "DELETE", "PUT"]).optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const signer = getAddress(parsed.data.signer).toLowerCase();
    if (signer !== req.wallet!.address) {
      return reply.code(403).send({ error: "Signer must equal JWT wallet" });
    }

    const notionalUsd = extractNotionalUsd(parsed.data.body);
    const policy = await evaluateTradePolicyWithChain(ctx.env, {
      wallet: signer,
      notionalUsd,
      environment: parsed.data.environment,
    });
    if (!policy.ok) {
      return reply.code(403).send({
        error: "policy_blocked",
        reason: policy.reason,
        effectiveCapUsd: policy.effectiveCapUsd,
        onChain: policy.onChain ?? null,
      });
    }

    const account = await prisma.sodexAccount.findUnique({
      where: {
        walletAddress_environment: {
          walletAddress: signer,
          environment: parsed.data.environment,
        },
      },
    });
    if (!account) {
      return reply.code(404).send({ error: "Verify SoDEX account before relay" });
    }

    const order = await prisma.signedOrder.create({
      data: {
        userId: account.userId,
        walletAddress: signer,
        environment: parsed.data.environment,
        accountId: account.accountId,
        market: "unknown",
        side: "unknown",
        orderType: "relay",
        notionalUsd: notionalUsd != null ? notionalUsd : undefined,
        payloadJson: parsed.data.body as object,
        signature: parsed.data.apiSign,
        status: "submitted",
        proofUrl: ctx.sodex.portfolioUrl(parsed.data.environment),
      },
    });

    try {
      const result = await ctx.sodex.relaySignedOrder(
        parsed.data.environment,
        parsed.data.path,
        parsed.data.body,
        {
          apiSign: parsed.data.apiSign,
          apiNonce: parsed.data.apiNonce,
          apiKeyName: parsed.data.apiKeyName,
          method: parsed.data.method,
        },
      );
      const sodexOrderId = extractOrderId(result);
      await prisma.signedOrder.update({
        where: { id: order.id },
        data: {
          status: "submitted",
          sodexOrderId,
          payloadJson: { request: parsed.data.body, response: result } as object,
        },
      });

      const evidence = await reconcileFill({
        sodex: ctx.sodex,
        environment: parsed.data.environment,
        wallet: signer,
        sodexOrderId: sodexOrderId ?? null,
      });
      await applyFillEvidence({
        signedOrderId: order.id,
        userId: account.userId,
        environment: parsed.data.environment,
        market: "relay",
        wallet: signer,
        evidence,
      });

      return {
        orderId: order.id,
        sodexOrderId,
        status: evidence.status,
        fillProof: {
          executedQty: evidence.executedQty,
          tradeIds: evidence.tradeIds,
          historyMatch: evidence.historyMatch,
          tradesMatch: evidence.tradesMatch,
          balanceChecked: evidence.balanceChecked,
          note: evidence.note,
        },
        result,
        proofUrl: order.proofUrl,
      };
    } catch (err) {
      await prisma.signedOrder.update({
        where: { id: order.id },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "Relay failed",
        orderId: order.id,
      });
    }
  });

  /** Re-run fill reconciliation for an existing signed order. */
  app.post("/api/sodex/orders/:id/reconcile", { preHandler: requireWallet }, async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid id" });

    const order = await prisma.signedOrder.findUnique({ where: { id: params.data.id } });
    if (!order) return reply.code(404).send({ error: "order_not_found" });
    if (order.walletAddress.toLowerCase() !== req.wallet!.address.toLowerCase()) {
      return reply.code(403).send({ error: "wallet_mismatch" });
    }

    const evidence = await reconcileFill({
      sodex: ctx.sodex,
      environment: order.environment,
      wallet: order.walletAddress,
      sodexOrderId: order.sodexOrderId,
      timeoutMs: 10_000,
    });
    await applyFillEvidence({
      signedOrderId: order.id,
      userId: order.userId,
      environment: order.environment,
      market: order.market,
      wallet: order.walletAddress,
      evidence,
    });

    return {
      orderId: order.id,
      status: evidence.status,
      fillProof: evidence,
      proofUrl: order.proofUrl,
    };
  });

  app.get("/api/sodex/me/orders", { preHandler: requireWallet }, async (req) => {
    const wallet = req.wallet!.address.toLowerCase();
    const orders = await prisma.signedOrder.findMany({
      where: { walletAddress: wallet },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { trades: true },
    });
    return { status: "LIVE", orders };
  });

  /** Smoke: connect WS, subscribe trades, wait for one message or timeout */
  app.post("/api/sodex/ws/smoke", { preHandler: requireWallet }, async (req, reply) => {
    const body = z
      .object({
        environment: envSchema.default("testnet"),
        symbol: z.string().default("vBTC_vUSDC"),
        timeoutMs: z.number().int().positive().max(15000).default(8000),
      })
      .safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const client = SodexWsClient.fromEnv(ctx.env, body.data.environment, "spot");
    const messages: unknown[] = [];
    try {
      await client.connect();
      client.onMessage((m) => messages.push(m));
      client.subscribe({ type: "trades", symbol: body.data.symbol });
      const deadline = Date.now() + body.data.timeoutMs;
      while (Date.now() < deadline && messages.length < 2) {
        await new Promise((r) => setTimeout(r, 200));
      }
      client.close();
      return {
        ok: messages.length > 0,
        messageCount: messages.length,
        sample: messages.slice(0, 3),
        environment: body.data.environment,
        symbol: body.data.symbol,
      };
    } catch (err) {
      client.close();
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "WS smoke failed",
      });
    }
  });
}

function extractOrderId(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const o = result as Record<string, unknown>;
  if (o.orderID != null) return String(o.orderID);
  if (o.orderId != null) return String(o.orderId);
  if (Array.isArray(o.data) && o.data[0] && typeof o.data[0] === "object") {
    const first = o.data[0] as Record<string, unknown>;
    if (first.orderID != null) return String(first.orderID);
  }
  if (o.data && typeof o.data === "object") {
    const d = o.data as Record<string, unknown>;
    if (d.orderID != null) return String(d.orderID);
  }
  return undefined;
}
