import {
  type Hex,
  type PrivateKeyAccount,
  concat,
  keccak256,
  stringToBytes,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export type SodexMarket = "spot" | "futures";
export type SodexEnv = "mainnet" | "testnet";

export const SODEX_CHAIN_IDS = {
  mainnet: 286623,
  testnet: 138565,
} as const;

export const SODEX_VERIFYING_CONTRACT =
  "0x0000000000000000000000000000000000000000" as const;

export const SPOT_BATCH_NEW_ORDER = "batchNewOrder";
export const SPOT_BATCH_CANCEL_ORDER = "batchCancelOrder";
export const PERPS_NEW_ORDER = "newOrder";
export const PERPS_CANCEL_ORDER = "cancelOrder";

/** Compact JSON — no whitespace; key order must match Go struct field order. */
export function compactJson(value: unknown): string {
  return JSON.stringify(value);
}

/** payloadHash = Keccak256(json.Marshal({ type, params })) */
export function computePayloadHash(actionType: string, params: unknown): Hex {
  const payload = { type: actionType, params };
  return keccak256(stringToBytes(compactJson(payload)));
}

export function buildExchangeDomain(market: SodexMarket, env: SodexEnv) {
  return {
    name: market === "spot" ? "spot" : "futures",
    version: "1",
    chainId: SODEX_CHAIN_IDS[env],
    verifyingContract: SODEX_VERIFYING_CONTRACT,
  } as const;
}

export const exchangeActionTypes = {
  ExchangeAction: [
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

/** After EIP-712 sig (65 bytes), prepend 0x01 for X-API-Sign. */
export function normalizeEcdsaSignature(signature: Hex): Hex {
  const raw = signature.startsWith("0x") ? signature.slice(2) : signature;
  if (raw.length !== 130) {
    throw new Error(`Expected 65-byte signature hex, got length ${raw.length / 2}`);
  }
  const r = raw.slice(0, 64);
  const s = raw.slice(64, 128);
  let v = Number.parseInt(raw.slice(128, 130), 16);
  if (v >= 27) v -= 27;
  if (v !== 0 && v !== 1) {
    throw new Error(`Invalid recovery id v=${v}`);
  }
  return `0x${r}${s}${v.toString(16).padStart(2, "0")}` as Hex;
}

export function toTypedApiSign(signature: Hex): Hex {
  const normalized = normalizeEcdsaSignature(signature);
  return `0x01${normalized.slice(2)}` as Hex;
}

export function recommendedNonceMs(now = Date.now()): bigint {
  return BigInt(now);
}

export async function signExchangeAction(input: {
  privateKey: Hex;
  market: SodexMarket;
  env: SodexEnv;
  actionType: string;
  params: unknown;
  nonce?: bigint;
}): Promise<{
  payloadHash: Hex;
  nonce: bigint;
  signature: Hex;
  apiSign: Hex;
  domain: ReturnType<typeof buildExchangeDomain>;
  account: PrivateKeyAccount;
}> {
  const account = privateKeyToAccount(input.privateKey);
  const payloadHash = computePayloadHash(input.actionType, input.params);
  const nonce = input.nonce ?? recommendedNonceMs();
  const domain = buildExchangeDomain(input.market, input.env);

  const signature = await account.signTypedData({
    domain,
    types: exchangeActionTypes,
    primaryType: "ExchangeAction",
    message: { payloadHash, nonce },
  });

  return {
    payloadHash,
    nonce,
    signature,
    apiSign: toTypedApiSign(signature),
    domain,
    account,
  };
}

/**
 * Spot BatchNewOrderItem — official Go SDK order:
 * symbolID, clOrdID, side, type, timeInForce, price?, quantity?, funds?
 * https://github.com/sodex-tech/sodex-go-sdk-public/blob/main/spot/types/batch_new_order_request.go
 */
export function buildSpotBatchOrderItem(input: {
  symbolID: number;
  clOrdID: string;
  side: string | number;
  type: string | number;
  timeInForce: string | number;
  price?: string;
  quantity?: string;
  funds?: string;
}): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  item.symbolID = input.symbolID;
  item.clOrdID = input.clOrdID;
  item.side = input.side;
  item.type = input.type;
  item.timeInForce = input.timeInForce;
  if (input.price !== undefined) item.price = stripTrailingZeros(input.price);
  if (input.quantity !== undefined) item.quantity = stripTrailingZeros(input.quantity);
  if (input.funds !== undefined) item.funds = stripTrailingZeros(input.funds);
  return item;
}

export function buildSpotBatchNewOrderParams(input: {
  accountID: string | number;
  orders: Array<ReturnType<typeof buildSpotBatchOrderItem>>;
}) {
  const params: Record<string, unknown> = {};
  params.accountID =
    typeof input.accountID === "number" ? input.accountID : Number(input.accountID);
  params.orders = input.orders;
  return params;
}

/** Convenience wrapper around official batchNewOrder shape. */
export function buildSpotNewOrderParams(input: {
  accountID: string | number;
  symbolID: number;
  side: string | number;
  type: string | number;
  timeInForce: string | number;
  quantity?: string;
  price?: string;
  funds?: string;
  clOrdID?: string;
}) {
  return buildSpotBatchNewOrderParams({
    accountID: input.accountID,
    orders: [
      buildSpotBatchOrderItem({
        symbolID: input.symbolID,
        clOrdID: input.clOrdID ?? "",
        side: input.side,
        type: input.type,
        timeInForce: input.timeInForce,
        price: input.price,
        quantity: input.quantity,
        funds: input.funds,
      }),
    ],
  });
}

export function spotBatchOrderItemKeyOrder(): string[] {
  return ["symbolID", "clOrdID", "side", "type", "timeInForce", "price", "quantity", "funds"];
}

/**
 * Perps RawOrder — official Go SDK order:
 * clOrdID, modifier, side, type, timeInForce, price?, quantity?, funds?,
 * stopPrice?, stopType?, triggerType?, reduceOnly, positionSide
 * Params: accountID, symbolID, orders
 * https://github.com/sodex-tech/sodex-go-sdk-public/blob/main/perps/types/new_order_request.go
 */
export function buildPerpsOrderItem(input: {
  clOrdID: string;
  modifier: string | number;
  side: string | number;
  type: string | number;
  timeInForce: string | number;
  price?: string;
  quantity?: string;
  funds?: string;
  stopPrice?: string;
  stopType?: string | number;
  triggerType?: string | number;
  reduceOnly: boolean;
  positionSide: string | number;
}): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  item.clOrdID = input.clOrdID;
  item.modifier = input.modifier;
  item.side = input.side;
  item.type = input.type;
  item.timeInForce = input.timeInForce;
  if (input.price !== undefined) item.price = stripTrailingZeros(input.price);
  if (input.quantity !== undefined) item.quantity = stripTrailingZeros(input.quantity);
  if (input.funds !== undefined) item.funds = stripTrailingZeros(input.funds);
  if (input.stopPrice !== undefined) item.stopPrice = stripTrailingZeros(input.stopPrice);
  if (input.stopType !== undefined) item.stopType = input.stopType;
  if (input.triggerType !== undefined) item.triggerType = input.triggerType;
  item.reduceOnly = input.reduceOnly;
  item.positionSide = input.positionSide;
  return item;
}

export function buildPerpsNewOrderParams(input: {
  accountID: string | number;
  symbolID: number;
  orders: Array<ReturnType<typeof buildPerpsOrderItem>>;
}) {
  const params: Record<string, unknown> = {};
  params.accountID =
    typeof input.accountID === "number" ? input.accountID : Number(input.accountID);
  params.symbolID = input.symbolID;
  params.orders = input.orders;
  return params;
}

export function buildSpotBatchCancelParams(input: {
  accountID: string | number;
  cancels: Array<{
    symbolID: number;
    clOrdID: string;
    orderID?: number;
    origClOrdID?: string;
  }>;
}) {
  const params: Record<string, unknown> = {};
  params.accountID =
    typeof input.accountID === "number" ? input.accountID : Number(input.accountID);
  params.cancels = input.cancels.map((c) => {
    const row: Record<string, unknown> = {};
    row.symbolID = c.symbolID;
    row.clOrdID = c.clOrdID;
    if (c.orderID !== undefined) row.orderID = c.orderID;
    if (c.origClOrdID !== undefined) row.origClOrdID = c.origClOrdID;
    return row;
  });
  return params;
}

export function buildCancelOrderParams(input: {
  accountID: string | number;
  symbolID: number;
  clOrdID: string;
  orderID?: number;
}) {
  return buildSpotBatchCancelParams({
    accountID: input.accountID,
    cancels: [
      {
        symbolID: input.symbolID,
        clOrdID: input.clOrdID,
        orderID: input.orderID,
      },
    ],
  });
}

/**
 * Perps CancelOrder — official Go SDK order: symbolID, orderID?, clOrdID?
 * Provide either orderID or clOrdID, not both.
 * https://github.com/sodex-tech/sodex-go-sdk-public/blob/main/perps/types/cancel_order_request.go
 */
export function buildPerpsCancelItem(input: {
  symbolID: number;
  orderID?: number;
  clOrdID?: string;
}): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  item.symbolID = input.symbolID;
  if (input.orderID !== undefined) item.orderID = input.orderID;
  if (input.clOrdID !== undefined) item.clOrdID = input.clOrdID;
  return item;
}

export function buildPerpsCancelParams(input: {
  accountID: string | number;
  cancels: Array<ReturnType<typeof buildPerpsCancelItem>>;
}) {
  const params: Record<string, unknown> = {};
  params.accountID =
    typeof input.accountID === "number" ? input.accountID : Number(input.accountID);
  params.cancels = input.cancels;
  return params;
}

/**
 * TransferAsset — official Go SDK field order:
 * id, fromAccountID, toAccountID, coinID, amount, type
 * Action type: transferAsset
 * EVM withdraw: toAccountID=999, type=2 (EVM_WITHDRAW)
 * https://github.com/sodex-tech/sodex-go-sdk-public/blob/main/common/types/transfer_asset_request.go
 * https://sodex.com/documentation/trading-api/rest-v1/sodex-rest-spot-api
 */
export const SPOT_TRANSFER_ASSET = "transferAsset";
export const TRANSFER_TYPE_EVM_WITHDRAW = 2;
export const TRANSFER_TYPE_PERPS_WITHDRAW = 3;
export const EVM_WITHDRAW_TO_ACCOUNT_ID = 999;

export function buildTransferAssetParams(input: {
  id: number | string;
  fromAccountID: number | string;
  toAccountID: number | string;
  coinID: number;
  amount: string;
  type: number;
}) {
  const params: Record<string, unknown> = {};
  params.id = typeof input.id === "number" ? input.id : Number(input.id);
  params.fromAccountID =
    typeof input.fromAccountID === "number"
      ? input.fromAccountID
      : Number(input.fromAccountID);
  params.toAccountID =
    typeof input.toAccountID === "number" ? input.toAccountID : Number(input.toAccountID);
  params.coinID = input.coinID;
  params.amount = input.amount;
  params.type = input.type;
  return params;
}

export function buildEvmWithdrawParams(input: {
  id: number | string;
  fromAccountID: number | string;
  coinID: number;
  amount: string;
}) {
  return buildTransferAssetParams({
    id: input.id,
    fromAccountID: input.fromAccountID,
    toAccountID: EVM_WITHDRAW_TO_ACCOUNT_ID,
    coinID: input.coinID,
    amount: input.amount,
    type: TRANSFER_TYPE_EVM_WITHDRAW,
  });
}

export function transferAssetKeyOrder(): string[] {
  return ["id", "fromAccountID", "toAccountID", "coinID", "amount", "type"];
}

export function perpsOrderItemKeyOrder(): string[] {
  return [
    "clOrdID",
    "modifier",
    "side",
    "type",
    "timeInForce",
    "price",
    "quantity",
    "funds",
    "stopPrice",
    "stopType",
    "triggerType",
    "reduceOnly",
    "positionSide",
  ];
}

export function perpsCancelItemKeyOrder(): string[] {
  return ["symbolID", "orderID", "clOrdID"];
}

/** SoDEX rejects padded decimals (use "0.45" not "0.4500"). */
export function stripTrailingZeros(decimal: string): string {
  const t = String(decimal).trim();
  if (!t.includes(".")) return t;
  const stripped = t.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return stripped === "" || stripped === "-" ? "0" : stripped;
}

export function buildRelayHeaders(input: {
  apiSign: Hex;
  nonce: bigint;
  /** Required by SoDEX gateway — must match EIP-712 domain.chainId */
  chainId: number;
  apiKeyName?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Sign": input.apiSign,
    "X-API-Nonce": input.nonce.toString(),
    "X-API-Chain": String(input.chainId),
  };
  if (input.apiKeyName) headers["X-API-Key"] = input.apiKeyName;
  return headers;
}

export function hashPreview(hex: Hex): string {
  return `${hex.slice(0, 10)}…${hex.slice(-6)}`;
}

void concat;
void toHex;
