/**
 * Testnet perps e2e — LOCAL TEST WALLET ONLY.
 * Official paths: POST/DELETE ${PERPS}/trade/orders
 * EIP-712 domain: futures; action types: newOrder / cancelOrder
 *
 * If perps collateral is empty, still verifies signed relay (API accepts EIP-712
 * and returns a business rejection such as insufficient margin).
 */
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import type { Hex } from "viem";
import { loadEnv } from "@heirlock/config";
import { createSodexClient, SodexApiError } from "./sodex/client.js";
import { localTestWallet } from "./trading/policy.js";
import { signAndPlacePerpsOrder, signAndCancelPerpsOrder } from "./trading/engine.js";
import { SodexWsClient } from "./sodex/ws.js";
import { prisma } from "./db.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

async function main() {
  const env = loadEnv();
  if (!env.SODEX_LOCAL_TEST_WALLET_ONLY) {
    console.error("FAIL: SODEX_LOCAL_TEST_WALLET_ONLY must be true");
    process.exit(1);
  }

  const wallet = localTestWallet(env);
  if (!wallet.privateKey || !wallet.address) {
    console.error("FAIL: local test wallet missing");
    process.exit(1);
  }

  const address = wallet.address;
  const sodex = createSodexClient(env);
  const environment = "testnet" as const;

  const { aid: spotAid } = await sodex.getAccountState(environment, address, "spot");
  const { aid: perpsAid, raw: perpsState } = await sodex.getAccountState(
    environment,
    address,
    "perps",
  );
  console.log(JSON.stringify({ spotAid, perpsAid, sameAid: spotAid === perpsAid }));

  const availableMargin = extractAvailableMargin(perpsState);
  console.log(JSON.stringify({ availableMargin }));

  const profile = await prisma.userProfile.upsert({
    where: { walletAddress: address.toLowerCase() },
    create: { walletAddress: address.toLowerCase() },
    update: {},
  });
  await prisma.sodexAccount.upsert({
    where: {
      walletAddress_environment: {
        walletAddress: address.toLowerCase(),
        environment,
      },
    },
    create: {
      userId: profile.id,
      walletAddress: address.toLowerCase(),
      environment,
      accountId: String(perpsAid),
      verifiedAt: new Date(),
    },
    update: { accountId: String(perpsAid), verifiedAt: new Date() },
  });

  type PerpsSymbol = {
    id: number;
    name: string;
    minQuantity?: string;
    minNotional?: string;
    status?: string | number;
    state?: string;
    tradingEnabled?: boolean;
  };

  const symbolsRaw = await sodex.listPerpsSymbols(environment);
  let list: PerpsSymbol[] = [];
  if (Array.isArray(symbolsRaw)) {
    list = symbolsRaw as PerpsSymbol[];
  } else if (symbolsRaw && typeof symbolsRaw === "object") {
    const data = (symbolsRaw as { data?: unknown }).data;
    if (Array.isArray(data)) list = data as PerpsSymbol[];
  }

  const isActive = (s: PerpsSymbol) => {
    if (s.tradingEnabled === false) return false;
    const st = String(s.status ?? s.state ?? "").toUpperCase();
    if (!st) return true;
    return st === "TRADING" || st === "ACTIVE" || st === "1";
  };

  const active = list.filter(isActive);
  const sym =
    active.find((s) => s.name === "BTC-USD") ??
    active.find((s) => /^BTC/i.test(s.name)) ??
    active.find((s) => /ETH-USD/i.test(s.name)) ??
    active[0] ??
    list.find((s) => s.name === "BTC-USD") ??
    list[0];
  if (!sym) {
    console.error("FAIL: no perps symbols on testnet");
    process.exit(1);
  }

  const minNotional = Number(sym.minNotional ?? "10") || 10;
  const minQty = Number(sym.minQuantity ?? "0.001") || 0.001;
  const price = "1000";
  const quantity = String(Math.max(minQty, minNotional / Number(price)));
  const notionalUsd = Number(price) * Number(quantity);
  const clOrdID = `hl-p-${Date.now()}`;

  console.log(
    JSON.stringify({
      environment,
      market: "perps",
      symbol: sym.name,
      symbolID: sym.id,
      aid: perpsAid,
      clOrdID,
      price,
      quantity,
      notionalUsd,
      minNotional,
      mode: "limit-far-then-cancel",
    }),
  );

  const ws = SodexWsClient.fromEnv(env, environment, "perps");
  let wsMsgs = 0;
  try {
    await ws.connect();
    ws.onMessage(() => {
      wsMsgs += 1;
    });
    ws.subscribe({ type: "trades", symbol: sym.name });
  } catch (err) {
    console.log("WS_CONNECT_WARN", err instanceof Error ? err.message : err);
  }

  try {
    const placed = await signAndPlacePerpsOrder({
      env,
      sodex,
      privateKey: wallet.privateKey as Hex,
      userAddress: address,
      environment,
      accountID: perpsAid,
      symbolID: sym.id,
      side: 1,
      type: 1,
      timeInForce: 1,
      modifier: 1,
      price,
      quantity,
      clOrdID,
      reduceOnly: false,
      positionSide: 1,
      notionalUsd,
    });
    console.log(
      JSON.stringify({
        placeOk: true,
        nonce: placed.signed.nonce,
        resultPreview: JSON.stringify(placed.result).slice(0, 400),
      }),
    );

    const orderID = extractPlacedOrderId(placed.result);
    if (!orderID) {
      throw new Error("place succeeded but orderID missing");
    }

    await new Promise((r) => setTimeout(r, 1500));

    const cancelled = await signAndCancelPerpsOrder({
      env,
      sodex,
      privateKey: wallet.privateKey as Hex,
      userAddress: address,
      environment,
      accountID: perpsAid,
      symbolID: sym.id,
      orderID,
    });
    console.log(
      JSON.stringify({
        cancelOk: true,
        orderID,
        nonce: cancelled.nonce,
        resultPreview: JSON.stringify(cancelled.result).slice(0, 400),
      }),
    );
    await new Promise((r) => setTimeout(r, 2000));
    ws.close();
    console.log(JSON.stringify({ wsMessages: wsMsgs }));
    console.log("PASS: testnet perps sign+place+cancel e2e");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const body =
      err instanceof SodexApiError ? JSON.stringify(err.body).slice(0, 500) : "";
    const marginBlocked =
      /insufficient margin/i.test(msg) ||
      /insufficient margin/i.test(body) ||
      availableMargin <= 0;

    if (marginBlocked && /insufficient margin/i.test(msg + body)) {
      // Signed request reached SoDEX and was validated — EIP-712 + relay OK.
      console.log(
        JSON.stringify({
          signingRelayOk: true,
          placeAcceptedByGateway: true,
          businessReject: "insufficient margin",
          hint: "Deposit perps collateral on testnet.sodex.com then re-run pnpm test:perps",
        }),
      );
      ws.close();
      console.log("PASS: testnet perps EIP-712 signing+relay verified (cancel skipped: no margin)");
      process.exit(0);
    }

    console.error("PERPS_TRADE_ERR", msg, body);
    ws.close();
    process.exit(1);
  }
}

function extractAvailableMargin(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const root = raw as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<
    string,
    unknown
  >;
  for (const key of ["am", "av", "ami", "availableMargin", "available"]) {
    const n = Number(data[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function extractPlacedOrderId(result: unknown): number | undefined {
  if (!result || typeof result !== "object") return undefined;
  const o = result as Record<string, unknown>;
  const data = o.data;
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    const first = data[0] as Record<string, unknown>;
    if (first.orderID != null) return Number(first.orderID);
  }
  return undefined;
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
