import type { Env } from "@heirlock/config";
import type { Hex } from "viem";
import {
  SPOT_BATCH_NEW_ORDER,
  SPOT_BATCH_CANCEL_ORDER,
  PERPS_NEW_ORDER,
  PERPS_CANCEL_ORDER,
  buildSpotBatchNewOrderParams,
  buildSpotBatchOrderItem,
  buildSpotBatchCancelParams,
  buildPerpsNewOrderParams,
  buildPerpsOrderItem,
  buildPerpsCancelParams,
  buildPerpsCancelItem,
  signExchangeAction,
  buildRelayHeaders,
} from "@heirlock/sodex-signing";
import type { SodexClient, SodexEnvironment } from "../sodex/client.js";
import { nextSodexNonce } from "../sodex/nonce.js";
import { evaluateTradePolicyWithChain, extractNotionalUsd } from "./policy.js";

export type PrepareSpotOrderInput = {
  environment: SodexEnvironment;
  accountID: number | string;
  symbolID: number;
  side: string | number;
  type: string | number;
  timeInForce: string | number;
  price?: string;
  quantity?: string;
  funds?: string;
  clOrdID?: string;
  notionalUsd?: number;
  wallet: string;
};

/**
 * Build official batchNewOrder params + policy check (no private key required).
 * Client signs EIP-712 and posts to /api/sodex/orders/place.
 */
export async function prepareSpotBatchOrder(env: Env, input: PrepareSpotOrderInput) {
  const notional =
    input.notionalUsd ??
    extractNotionalUsd({ funds: input.funds, quantity: input.quantity, price: input.price });

  const policy = await evaluateTradePolicyWithChain(env, {
    wallet: input.wallet,
    notionalUsd: notional,
    environment: input.environment,
  });
  if (!policy.ok) {
    return {
      ok: false as const,
      reason: policy.reason,
      effectiveCapUsd: policy.effectiveCapUsd,
      onChain: policy.onChain,
    };
  }

  const params = buildSpotBatchNewOrderParams({
    accountID: input.accountID,
    orders: [
      buildSpotBatchOrderItem({
        symbolID: input.symbolID,
        clOrdID: input.clOrdID ?? `hl-${Date.now()}`,
        side: input.side,
        type: input.type,
        timeInForce: input.timeInForce,
        price: input.price,
        quantity: input.quantity,
        funds: input.funds,
      }),
    ],
  });

  return {
    ok: true as const,
    actionType: SPOT_BATCH_NEW_ORDER,
    params,
    market: "spot" as const,
    chainId:
      input.environment === "testnet"
        ? env.SODEX_TESTNET_CHAIN_ID
        : env.SODEX_MAINNET_CHAIN_ID,
    effectiveCapUsd: policy.effectiveCapUsd,
    path: `/trade/orders/batch`,
  };
}

/** Local-test helper: sign + place using test wallet private key (never for multi-user prod). */
export async function signAndPlaceSpotOrder(input: {
  env: Env;
  sodex: SodexClient;
  privateKey: Hex;
  userAddress: string;
  environment: SodexEnvironment;
  accountID: number | string;
  symbolID: number;
  side: string | number;
  type: string | number;
  timeInForce: string | number;
  price?: string;
  quantity?: string;
  funds?: string;
  clOrdID?: string;
  notionalUsd?: number;
}) {
  const prepared = await prepareSpotBatchOrder(input.env, {
    environment: input.environment,
    accountID: input.accountID,
    symbolID: input.symbolID,
    side: input.side,
    type: input.type,
    timeInForce: input.timeInForce,
    price: input.price,
    quantity: input.quantity,
    funds: input.funds,
    clOrdID: input.clOrdID,
    notionalUsd: input.notionalUsd,
    wallet: input.userAddress,
  });
  if (!prepared.ok) {
    throw new Error(`policy_blocked:${prepared.reason}`);
  }

  const nonce = await nextSodexNonce(input.userAddress);
  const signed = await signExchangeAction({
    privateKey: input.privateKey,
    market: "spot",
    env: input.environment,
    actionType: prepared.actionType,
    params: prepared.params,
    nonce,
  });

  const chainId =
    input.environment === "testnet"
      ? input.env.SODEX_TESTNET_CHAIN_ID
      : input.env.SODEX_MAINNET_CHAIN_ID;
  const headers = buildRelayHeaders({
    apiSign: signed.apiSign,
    nonce: signed.nonce,
    chainId,
  });

  const result = await input.sodex.placeOrders(
    input.environment,
    input.userAddress,
    prepared.params,
    {
      apiSign: headers["X-API-Sign"]!,
      apiNonce: headers["X-API-Nonce"]!,
    },
  );

  return { prepared, signed: { nonce: signed.nonce.toString(), payloadHash: signed.payloadHash }, result };
}

export async function signAndCancelSpotOrder(input: {
  env: Env;
  sodex: SodexClient;
  privateKey: Hex;
  userAddress: string;
  environment: SodexEnvironment;
  accountID: number | string;
  symbolID: number;
  clOrdID: string;
  orderID?: number;
}) {
  if (!input.env.TRADING_ENABLED || input.env.KILL_SWITCH_TRADING) {
    throw new Error("Trading disabled");
  }
  const params = buildSpotBatchCancelParams({
    accountID: input.accountID,
    cancels: [
      {
        symbolID: input.symbolID,
        clOrdID: input.clOrdID,
        orderID: input.orderID,
      },
    ],
  });
  const nonce = await nextSodexNonce(input.userAddress);
  const signed = await signExchangeAction({
    privateKey: input.privateKey,
    market: "spot",
    env: input.environment,
    actionType: SPOT_BATCH_CANCEL_ORDER,
    params,
    nonce,
  });
  const headers = buildRelayHeaders({
    apiSign: signed.apiSign,
    nonce: signed.nonce,
    chainId:
      input.environment === "testnet"
        ? input.env.SODEX_TESTNET_CHAIN_ID
        : input.env.SODEX_MAINNET_CHAIN_ID,
  });
  const result = await input.sodex.cancelOrders(
    input.environment,
    input.userAddress,
    params,
    {
      apiSign: headers["X-API-Sign"]!,
      apiNonce: headers["X-API-Nonce"]!,
    },
  );
  return { params, result, nonce: signed.nonce.toString() };
}

export type PreparePerpsOrderInput = {
  environment: SodexEnvironment;
  accountID: number | string;
  symbolID: number;
  side: string | number;
  type: string | number;
  timeInForce: string | number;
  modifier?: string | number;
  price?: string;
  quantity?: string;
  funds?: string;
  clOrdID?: string;
  reduceOnly?: boolean;
  positionSide?: string | number;
  notionalUsd?: number;
  wallet: string;
};

/**
 * Build official perps newOrder params + policy check.
 * Client signs under EIP-712 domain name "futures".
 */
export async function preparePerpsOrder(env: Env, input: PreparePerpsOrderInput) {
  const notional =
    input.notionalUsd ??
    extractNotionalUsd({ funds: input.funds, quantity: input.quantity, price: input.price });

  const policy = await evaluateTradePolicyWithChain(env, {
    wallet: input.wallet,
    notionalUsd: notional,
    environment: input.environment,
  });
  if (!policy.ok) {
    return {
      ok: false as const,
      reason: policy.reason,
      effectiveCapUsd: policy.effectiveCapUsd,
      onChain: policy.onChain,
    };
  }

  const params = buildPerpsNewOrderParams({
    accountID: input.accountID,
    symbolID: input.symbolID,
    orders: [
      buildPerpsOrderItem({
        clOrdID: input.clOrdID ?? `hl-p-${Date.now()}`,
        modifier: input.modifier ?? 1, // NORMAL
        side: input.side,
        type: input.type,
        timeInForce: input.timeInForce,
        price: input.price,
        quantity: input.quantity,
        funds: input.funds,
        reduceOnly: input.reduceOnly ?? false,
        positionSide: input.positionSide ?? 1, // BOTH
      }),
    ],
  });

  return {
    ok: true as const,
    actionType: PERPS_NEW_ORDER,
    params,
    market: "futures" as const,
    chainId:
      input.environment === "testnet"
        ? env.SODEX_TESTNET_CHAIN_ID
        : env.SODEX_MAINNET_CHAIN_ID,
    effectiveCapUsd: policy.effectiveCapUsd,
    path: `/trade/orders`,
  };
}

/** Local-test helper: sign + place perps using test wallet (never multi-user prod). */
export async function signAndPlacePerpsOrder(input: {
  env: Env;
  sodex: SodexClient;
  privateKey: Hex;
  userAddress: string;
  environment: SodexEnvironment;
  accountID: number | string;
  symbolID: number;
  side: string | number;
  type: string | number;
  timeInForce: string | number;
  modifier?: string | number;
  price?: string;
  quantity?: string;
  funds?: string;
  clOrdID?: string;
  reduceOnly?: boolean;
  positionSide?: string | number;
  notionalUsd?: number;
}) {
  const prepared = await preparePerpsOrder(input.env, {
    environment: input.environment,
    accountID: input.accountID,
    symbolID: input.symbolID,
    side: input.side,
    type: input.type,
    timeInForce: input.timeInForce,
    modifier: input.modifier,
    price: input.price,
    quantity: input.quantity,
    funds: input.funds,
    clOrdID: input.clOrdID,
    reduceOnly: input.reduceOnly,
    positionSide: input.positionSide,
    notionalUsd: input.notionalUsd,
    wallet: input.userAddress,
  });
  if (!prepared.ok) {
    throw new Error(`policy_blocked:${prepared.reason}`);
  }

  const nonce = await nextSodexNonce(input.userAddress);
  const signed = await signExchangeAction({
    privateKey: input.privateKey,
    market: "futures",
    env: input.environment,
    actionType: prepared.actionType,
    params: prepared.params,
    nonce,
  });

  const headers = buildRelayHeaders({
    apiSign: signed.apiSign,
    nonce: signed.nonce,
    chainId:
      input.environment === "testnet"
        ? input.env.SODEX_TESTNET_CHAIN_ID
        : input.env.SODEX_MAINNET_CHAIN_ID,
  });

  const result = await input.sodex.placePerpsOrders(
    input.environment,
    input.userAddress,
    prepared.params,
    {
      apiSign: headers["X-API-Sign"]!,
      apiNonce: headers["X-API-Nonce"]!,
    },
  );

  return { prepared, signed: { nonce: signed.nonce.toString(), payloadHash: signed.payloadHash }, result };
}

export async function signAndCancelPerpsOrder(input: {
  env: Env;
  sodex: SodexClient;
  privateKey: Hex;
  userAddress: string;
  environment: SodexEnvironment;
  accountID: number | string;
  symbolID: number;
  orderID?: number;
  clOrdID?: string;
}) {
  if (!input.env.TRADING_ENABLED || input.env.KILL_SWITCH_TRADING) {
    throw new Error("Trading disabled");
  }
  if (input.orderID == null && !input.clOrdID) {
    throw new Error("perps cancel requires orderID or clOrdID");
  }
  const params = buildPerpsCancelParams({
    accountID: input.accountID,
    cancels: [
      buildPerpsCancelItem({
        symbolID: input.symbolID,
        orderID: input.orderID,
        // Official: either orderID or clOrdID, not both
        clOrdID: input.orderID != null ? undefined : input.clOrdID,
      }),
    ],
  });
  const nonce = await nextSodexNonce(input.userAddress);
  const signed = await signExchangeAction({
    privateKey: input.privateKey,
    market: "futures",
    env: input.environment,
    actionType: PERPS_CANCEL_ORDER,
    params,
    nonce,
  });
  const headers = buildRelayHeaders({
    apiSign: signed.apiSign,
    nonce: signed.nonce,
    chainId:
      input.environment === "testnet"
        ? input.env.SODEX_TESTNET_CHAIN_ID
        : input.env.SODEX_MAINNET_CHAIN_ID,
  });
  const result = await input.sodex.cancelPerpsOrders(
    input.environment,
    input.userAddress,
    params,
    {
      apiSign: headers["X-API-Sign"]!,
      apiNonce: headers["X-API-Nonce"]!,
    },
  );
  return { params, result, nonce: signed.nonce.toString() };
}
