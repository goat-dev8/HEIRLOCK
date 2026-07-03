/**
 * Official Testnet SOSO gas funding workflow (moderator-confirmed):
 * 1. Verify Test USDC (vUSDC) on SoDEX spot
 * 2. Buy WSOSO with vUSDC (WSOSO_vUSDC)
 * 3. EVM_WITHDRAW via POST /accounts/transfers (toAccountID=999, type=2)
 * 4. Wait for native SOSO on the connected EVM wallet
 * 5. If deployer != SoDEX wallet, send native SOSO on-chain to deployer
 *
 * Sources:
 * - https://sodex.com/documentation/trading-api/rest-v1/sodex-rest-spot-api
 * - TransferAssetRequest / transferAsset (Go SDK)
 */
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { loadEnv } from "@heirlock/config";
import {
  SPOT_TRANSFER_ASSET,
  buildEvmWithdrawParams,
  buildRelayHeaders,
  signExchangeAction,
} from "@heirlock/sodex-signing";
import { createSodexClient } from "./sodex/client.js";
import { localTestWallet } from "./trading/policy.js";
import { signAndPlaceSpotOrder } from "./trading/engine.js";
import { nextSodexNonce } from "./sodex/nonce.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

const WSOSO_SYMBOL = "WSOSO_vUSDC";
const WSOSO_COIN_ID = 4;
/** Enough for contract deploy (~0.000025 SOSO on mainnet) with buffer */
const BUY_FUNDS_USDC = "2";
const WITHDRAW_AMOUNT = "1";

/** SoDEX rejects padded decimals like "0.4500" / "10.00" — strip trailing zeros. */
function fmtDec(n: number, maxFrac: number): string {
  const fixed = n.toFixed(maxFrac);
  return fixed.replace(/\.?0+$/, "") || "0";
}

async function main() {
  const env = loadEnv();
  if (!env.SODEX_LOCAL_TEST_WALLET_ONLY) {
    console.error("FAIL: SODEX_LOCAL_TEST_WALLET_ONLY must be true");
    process.exit(1);
  }

  const wallet = localTestWallet(env);
  if (!wallet.privateKey || !wallet.address) {
    console.error("FAIL: local SoDEX test wallet missing");
    process.exit(1);
  }

  const sodexAddress = wallet.address as `0x${string}`;
  const sodexPk = wallet.privateKey as Hex;
  const sodex = createSodexClient(env);
  const environment = "testnet" as const;

  const deployerPkRaw = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerPkRaw) {
    console.error("FAIL: DEPLOYER_PRIVATE_KEY missing");
    process.exit(1);
  }
  const deployerPk = (
    deployerPkRaw.startsWith("0x") ? deployerPkRaw : `0x${deployerPkRaw}`
  ) as Hex;
  const deployerAccount = privateKeyToAccount(deployerPk);
  const deployer = deployerAccount.address;

  console.log(
    JSON.stringify({
      step: "start",
      sodexAddress,
      deployer,
      sameWallet: sodexAddress.toLowerCase() === deployer.toLowerCase(),
    }),
  );

  const { aid } = await sodex.getAccountState(environment, sodexAddress, "spot");
  const balancesRaw = await sodex.getBalances(environment, sodexAddress, String(aid));
  const vUsdc = extractCoinBalance(balancesRaw, "vUSDC");
  console.log(JSON.stringify({ step: "verify_vusdc", aid, vUsdc }));

  if (vUsdc < Number(BUY_FUNDS_USDC)) {
    console.error(
      `FAIL: need >= ${BUY_FUNDS_USDC} vUSDC on spot (have ${vUsdc}). Claim faucet USDC first.`,
    );
    process.exit(1);
  }

  // Resolve WSOSO symbol id from live markets
  const symbolsRaw = await sodex.listSymbols(environment, WSOSO_SYMBOL);
  const symbols = normalizeList<{ id: number; name: string; minNotional?: string }>(symbolsRaw);
  const pair =
    symbols.find((s) => s.name === WSOSO_SYMBOL) ??
    (await (async () => {
      const all = normalizeList<{ id: number; name: string }>(
        await sodex.listSymbols(environment),
      );
      return all.find((s) => s.name === WSOSO_SYMBOL);
    })());
  if (!pair) {
    console.error(`FAIL: ${WSOSO_SYMBOL} not found on testnet`);
    process.exit(1);
  }

  let wsosoSpot = extractCoinBalance(balancesRaw, "WSOSO");
  if (wsosoSpot < Number(WITHDRAW_AMOUNT)) {
    // Prefer aggressive limit at ask — market IOC can cancel unfilled when ask >> lastPx
    const tickerRaw = await sodex.getTicker(environment, WSOSO_SYMBOL);
    const ticker = normalizeList<{
      symbol?: string;
      askPx?: string;
      bidPx?: string;
      lastPx?: string;
    }>(tickerRaw)[0];
    const last = Number(ticker?.lastPx ?? ticker?.bidPx ?? "0.3");
    const ask = Number(ticker?.askPx ?? last);
    // Cross the ask when possible (validated live: "0.45" works, "0.4500" is rejected)
    let priceNum = ask > 0 ? ask : last;
    const price = fmtDec(priceNum, 4);
    const qty = Math.max(0.01, Number(BUY_FUNDS_USDC) / priceNum);
    const quantity = fmtDec(Math.floor(qty * 100) / 100, 2);
    const notionalUsd = priceNum * Number(quantity);
    console.log(
      JSON.stringify({
        step: "buy_wsoso",
        symbolID: pair.id,
        mode: "limit_cross_ask",
        ask,
        price,
        quantity,
        notionalUsd,
      }),
    );
    const placed = await signAndPlaceSpotOrder({
      env,
      sodex,
      privateKey: sodexPk,
      userAddress: sodexAddress,
      environment,
      accountID: aid,
      symbolID: pair.id,
      side: 1, // BUY
      type: 1, // LIMIT
      timeInForce: 3, // IOC — fill immediately or cancel
      price,
      quantity,
      clOrdID: `hl-gas-${Date.now()}`,
      notionalUsd,
    });
    console.log(
      JSON.stringify({
        step: "buy_result",
        preview: JSON.stringify(placed.result).slice(0, 400),
      }),
    );
    await sleep(2500);
    const afterBuy = await sodex.getBalances(environment, sodexAddress, String(aid));
    wsosoSpot = extractCoinBalance(afterBuy, "WSOSO");
    console.log(JSON.stringify({ step: "wsoso_after_buy", wsosoSpot }));

    if (wsosoSpot < Number(WITHDRAW_AMOUNT)) {
      // Fallback: GTC limit at ask (rests if needed)
      const gtcPrice = fmtDec(ask, 4);
      const gtcQty = fmtDec(Math.max(0.01, Number(BUY_FUNDS_USDC) / ask), 2);
      console.log(
        JSON.stringify({
          step: "buy_wsoso_gtc_fallback",
          price: gtcPrice,
          quantity: gtcQty,
        }),
      );
      await signAndPlaceSpotOrder({
        env,
        sodex,
        privateKey: sodexPk,
        userAddress: sodexAddress,
        environment,
        accountID: aid,
        symbolID: pair.id,
        side: 1,
        type: 1,
        timeInForce: 1, // GTC
        price: gtcPrice,
        quantity: gtcQty,
        clOrdID: `hl-gas-gtc-${Date.now()}`,
        notionalUsd: Number(gtcPrice) * Number(gtcQty),
      });
      // Poll for fill up to 60s
      for (let i = 0; i < 20; i++) {
        await sleep(3000);
        const b = await sodex.getBalances(environment, sodexAddress, String(aid));
        wsosoSpot = extractCoinBalance(b, "WSOSO");
        if (wsosoSpot >= Number(WITHDRAW_AMOUNT)) break;
        console.log(JSON.stringify({ step: "poll_wsoso", i, wsosoSpot }));
      }
    }
  } else {
    console.log(JSON.stringify({ step: "buy_skipped", wsosoSpot }));
  }

  if (wsosoSpot < Number(WITHDRAW_AMOUNT)) {
    console.error(`FAIL: WSOSO spot balance ${wsosoSpot} < ${WITHDRAW_AMOUNT}`);
    process.exit(1);
  }

  const withdrawAmt =
    wsosoSpot >= Number(WITHDRAW_AMOUNT) ? WITHDRAW_AMOUNT : String(wsosoSpot);
  const transferId = Date.now();
  const params = buildEvmWithdrawParams({
    id: transferId,
    fromAccountID: aid,
    coinID: WSOSO_COIN_ID,
    amount: withdrawAmt,
  });

  console.log(
    JSON.stringify({
      step: "evm_withdraw",
      path: "POST /accounts/transfers",
      actionType: SPOT_TRANSFER_ASSET,
      params,
    }),
  );

  const nonce = await nextSodexNonce(sodexAddress);
  const signed = await signExchangeAction({
    privateKey: sodexPk,
    market: "spot",
    env: environment,
    actionType: SPOT_TRANSFER_ASSET,
    params,
    nonce,
  });
  const headers = buildRelayHeaders({
    apiSign: signed.apiSign,
    nonce: signed.nonce,
  });

  const transferResult = await sodex.transferAsset(environment, params, {
    apiSign: headers["X-API-Sign"]!,
    apiNonce: headers["X-API-Nonce"]!,
  });
  console.log(
    JSON.stringify({
      step: "evm_withdraw_result",
      preview: JSON.stringify(transferResult).slice(0, 400),
    }),
  );

  const rpc = env.VALUECHAIN_TESTNET_RPC;
  const publicClient = createPublicClient({
    transport: http(rpc),
  });

  console.log(JSON.stringify({ step: "wait_native_soso", wallet: sodexAddress }));
  const sodexNative = await waitForBalance(publicClient, sodexAddress, 0n, 180_000);
  console.log(
    JSON.stringify({
      step: "sodex_wallet_native",
      wei: sodexNative.toString(),
      soso: formatEther(sodexNative),
    }),
  );

  if (sodexNative === 0n) {
    console.error("FAIL: native SOSO still 0 after EVM_WITHDRAW timeout");
    process.exit(1);
  }

  let deployerBal = await publicClient.getBalance({ address: deployer });
  if (sodexAddress.toLowerCase() !== deployer.toLowerCase()) {
    // Official withdraw credits the connected SoDEX master wallet only.
    // Forward gas to DEPLOYER for forge broadcast.
    const leave = parseEther("0.01");
    const sendAmt =
      sodexNative > leave + parseEther("0.05")
        ? parseEther("0.5")
        : sodexNative / 2n;
    if (sendAmt <= 0n) {
      console.error("FAIL: insufficient native SOSO to forward to deployer");
      process.exit(1);
    }
    const walletClient = createWalletClient({
      account: privateKeyToAccount(sodexPk),
      transport: http(rpc),
    });
    const chainId = await publicClient.getChainId();
    const hash = await walletClient.sendTransaction({
      to: deployer,
      value: sendAmt,
      chain: {
        id: chainId,
        name: "ValueChain Testnet",
        nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
        rpcUrls: { default: { http: [rpc] } },
      },
    });
    console.log(JSON.stringify({ step: "forward_to_deployer", hash, sendAmt: formatEther(sendAmt) }));
    await publicClient.waitForTransactionReceipt({ hash });
    deployerBal = await waitForBalance(publicClient, deployer, 0n, 120_000);
  }

  console.log(
    JSON.stringify({
      step: "deployer_native",
      wei: deployerBal.toString(),
      soso: formatEther(deployerBal),
    }),
  );

  if (deployerBal === 0n) {
    console.error("FAIL: deployer still has 0 native SOSO");
    process.exit(1);
  }

  console.log("PASS: testnet native SOSO funded for deployer");
}

function extractCoinBalance(raw: unknown, coin: string): number {
  const rows = flattenBalances(raw);
  const hit = rows.find((r) => String(r.coin ?? r.name ?? "").toUpperCase() === coin.toUpperCase());
  if (!hit) return 0;
  return Number(hit.total ?? hit.available ?? hit.free ?? 0) || 0;
}

function flattenBalances(raw: unknown): Array<Record<string, unknown>> {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((r) => r && typeof r === "object") as Array<Record<string, unknown>>;
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) return flattenBalances(o.data);
    if (o.data && typeof o.data === "object") {
      const d = o.data as Record<string, unknown>;
      if (Array.isArray(d.balances)) return flattenBalances(d.balances);
    }
    if (Array.isArray(o.balances)) return flattenBalances(o.balances);
  }
  return [];
}

function normalizeList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const d = (raw as { data?: unknown }).data;
    if (Array.isArray(d)) return d as T[];
  }
  return [];
}

async function waitForBalance(
  client: { getBalance: (args: { address: `0x${string}` }) => Promise<bigint> },
  address: `0x${string}`,
  minExclusive: bigint,
  timeoutMs: number,
): Promise<bigint> {
  const start = Date.now();
  let last = 0n;
  while (Date.now() - start < timeoutMs) {
    last = await client.getBalance({ address });
    if (last > minExclusive) return last;
    await sleep(3000);
  }
  return last;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  if (e && typeof e === "object" && "body" in e) {
    console.error(JSON.stringify((e as { body: unknown }).body).slice(0, 500));
  }
  process.exit(1);
});
