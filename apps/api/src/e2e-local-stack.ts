/**
 * Local integration smoke — uses LOCAL TEST wallet only.
 * - Redis (Upstash REST) ping
 * - SoDEX account state read (no trade)
 * - Refuses mainnet trades > 1 USDC
 *
 * Never prints private keys.
 */
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadEnv } from "@heirlock/config";
import { createSodexClient } from "./sodex/client.js";
import { probeRedis } from "./redis.js";
import {
  evaluateTradePolicy,
  localTestWallet,
  effectiveNotionalCapUsd,
} from "./trading/policy.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

async function main() {
  const env = loadEnv();
  const wallet = localTestWallet(env);

  console.log(
    JSON.stringify(
      {
        localTestWalletOnly: env.SODEX_LOCAL_TEST_WALLET_ONLY,
        testAddressPrefix: wallet.address
          ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
          : null,
        hasTestKey: Boolean(wallet.privateKey),
        hasTestAid: Boolean(wallet.accountId),
        mainnetCapUsd: effectiveNotionalCapUsd(env, "mainnet"),
        testnetCapUsd: effectiveNotionalCapUsd(env, "testnet"),
      },
      null,
      2,
    ),
  );

  const redis = await probeRedis();
  console.log("redis:", JSON.stringify(redis));
  if (!redis.connected) {
    console.error("FAIL: Redis not connected (check UPSTASH_REDIS_REST_*)");
    process.exit(1);
  }

  // Policy guards
  const block = evaluateTradePolicy(env, {
    wallet: wallet.address ?? "0x0000000000000000000000000000000000000001",
    notionalUsd: 5,
    environment: "mainnet",
  });
  if (block.ok) {
    console.error("FAIL: mainnet 5 USDC should be blocked");
    process.exit(1);
  }
  console.log("policy mainnet>1 blocked:", block.reason);

  const allowHalf = evaluateTradePolicy(env, {
    wallet: wallet.address ?? "0x0000000000000000000000000000000000000001",
    notionalUsd: 0.5,
    environment: "mainnet",
  });
  // may fail allowlist if address missing — that's ok
  console.log("policy mainnet 0.5:", allowHalf);

  if (!wallet.address) {
    console.error("FAIL: SODEX_ADDRESS / SODEX_TEST_ADDRESS missing");
    process.exit(1);
  }

  const sodex = createSodexClient(env);

  // Prefer testnet read first (safe)
  for (const environment of ["testnet", "mainnet"] as const) {
    try {
      const { aid } = await sodex.getAccountState(environment, wallet.address);
      console.log(
        JSON.stringify({
          environment,
          aidMatchesEnv:
            wallet.accountId != null ? String(aid) === String(wallet.accountId) : null,
          aidPresent: Boolean(aid),
          // do not print full aid if user prefers — actually aid is not secret, ok to show
          aid,
        }),
      );
    } catch (err) {
      console.log(
        JSON.stringify({
          environment,
          accountState: "unavailable",
          error: err instanceof Error ? err.message : String(err),
          hint:
            environment === "testnet"
              ? "Enable Trading on https://testnet.sodex.com if needed"
              : "Enable Trading on https://sodex.com if needed",
        }),
      );
    }
  }

  console.log("PASS: local redis + policy + SoDEX account probe complete");
  console.log(
    "NOTE: SODEX_* wallet is LOCAL TEST ONLY — not the multi-user production house account.",
  );
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
