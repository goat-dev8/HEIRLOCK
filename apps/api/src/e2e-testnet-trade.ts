/**
 * Testnet trading e2e — LOCAL TEST WALLET ONLY.
 * Places a tiny limit order far from market (unlikely to fill) then cancels.
 * Never runs mainnet. Never prints private keys.
 */
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import type { Hex } from "viem";
import { loadEnv } from "@heirlock/config";
import { createSodexClient } from "./sodex/client.js";
import { localTestWallet } from "./trading/policy.js";
import { signAndPlaceSpotOrder, signAndCancelSpotOrder } from "./trading/engine.js";
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

  // Ensure aid in DB
  const { aid } = await sodex.getAccountState(environment, address);
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
      accountId: String(aid),
      verifiedAt: new Date(),
    },
    update: { accountId: String(aid), verifiedAt: new Date() },
  });

  const symbols = (await sodex.listSymbols(environment)) as Array<{
    id: number;
    name: string;
    minQuantity?: string;
    tickSize?: string;
  }>;
  const list = Array.isArray(symbols)
    ? symbols
    : ((symbols as { data?: typeof symbols }).data ?? []);
  const sym =
    list.find((s) => s.name === "vBTC_vUSDC") ??
    list.find((s) => /BTC/i.test(s.name)) ??
    list[0];
  if (!sym) {
    console.error("FAIL: no spot symbols on testnet");
    process.exit(1);
  }

  // Far-from-market limit buy meeting minNotional (≥5 on vBTC_vUSDC testnet)
  const clOrdID = `hl-e2e-${Date.now()}`;
  const price = "1000"; // well below ~64k last — unlikely to fill
  const quantity = "0.005"; // notional = 5 USDC = minNotional
  const notionalUsd = 5;
  console.log(
    JSON.stringify({
      environment,
      symbol: sym.name,
      symbolID: sym.id,
      aid,
      clOrdID,
      price,
      quantity,
      notionalUsd,
      mode: "limit-far-then-cancel",
    }),
  );

  // Best-effort cleanup of prior hl-e2e open orders (frees margin)
  try {
    const open = await sodex.getOpenOrders(environment, address, String(aid));
    const rows = Array.isArray((open as { data?: { orders?: unknown[] } })?.data?.orders)
      ? ((open as { data: { orders: Array<Record<string, unknown>> } }).data.orders)
      : [];
    for (const row of rows) {
      const cid = String(row.clOrdID ?? "");
      if (!cid.startsWith("hl-e2e-") && !cid.startsWith("hl-")) continue;
      const oid = Number(row.orderID);
      if (!Number.isFinite(oid)) continue;
      try {
        await signAndCancelSpotOrder({
          env,
          sodex,
          privateKey: wallet.privateKey as Hex,
          userAddress: address,
          environment,
          accountID: aid,
          symbolID: Number(row.symbolID ?? sym.id),
          clOrdID: cid,
          orderID: oid,
        });
        console.log(JSON.stringify({ cleanedOrderID: oid, clOrdID: cid }));
      } catch {
        /* ignore stale */
      }
    }
  } catch {
    /* ignore */
  }

  // WS smoke in parallel window
  const ws = SodexWsClient.fromEnv(env, environment, "spot");
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
    const placed = await signAndPlaceSpotOrder({
      env,
      sodex,
      privateKey: wallet.privateKey as Hex,
      userAddress: address,
      environment,
      accountID: aid,
      symbolID: sym.id,
      side: 1, // buy — enum numeric per Go SDK
      type: 1, // limit
      timeInForce: 1, // GTC
      price,
      quantity,
      clOrdID,
      notionalUsd,
    });
    console.log(
      JSON.stringify({
        placeOk: true,
        nonce: placed.signed.nonce,
        resultPreview: JSON.stringify(placed.result).slice(0, 300),
      }),
    );

    const orderID = extractPlacedOrderId(placed.result);
    if (!orderID) {
      throw new Error("place succeeded but orderID missing");
    }

    const seen = await sodex.pollOrderPresence(environment, address, orderID, {
      market: "spot",
      expectPresent: true,
      timeoutMs: 10_000,
      accountID: String(aid),
    });
    console.log(JSON.stringify({ pollOpen: seen.ok, present: seen.present }));

    await new Promise((r) => setTimeout(r, 500));

    const cancelled = await signAndCancelSpotOrder({
      env,
      sodex,
      privateKey: wallet.privateKey as Hex,
      userAddress: address,
      environment,
      accountID: aid,
      symbolID: sym.id,
      clOrdID,
      orderID,
    });
    console.log(
      JSON.stringify({
        cancelOk: true,
        orderID,
        nonce: cancelled.nonce,
        resultPreview: JSON.stringify(cancelled.result).slice(0, 300),
      }),
    );

    const gone = await sodex.pollOrderPresence(environment, address, orderID, {
      market: "spot",
      expectPresent: false,
      timeoutMs: 10_000,
      accountID: String(aid),
    });
    console.log(JSON.stringify({ pollClosed: gone.ok, present: gone.present }));
  } catch (err) {
    console.error(
      "TRADE_ERR",
      err instanceof Error ? err.message : err,
      err && typeof err === "object" && "body" in err
        ? JSON.stringify((err as { body: unknown }).body).slice(0, 400)
        : "",
    );
    ws.close();
    process.exit(1);
  }

  await new Promise((r) => setTimeout(r, 2000));
  ws.close();
  console.log(JSON.stringify({ wsMessages: wsMsgs }));
  console.log("PASS: testnet sign+place+cancel e2e");
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
