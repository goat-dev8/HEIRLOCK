import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computePayloadHash,
  toTypedApiSign,
  signExchangeAction,
  buildSpotNewOrderParams,
  buildSpotBatchOrderItem,
  spotBatchOrderItemKeyOrder,
  buildPerpsOrderItem,
  buildPerpsNewOrderParams,
  buildPerpsCancelItem,
  buildPerpsCancelParams,
  buildEvmWithdrawParams,
  transferAssetKeyOrder,
  perpsOrderItemKeyOrder,
  buildRelayHeaders,
  SPOT_BATCH_NEW_ORDER,
  PERPS_NEW_ORDER,
  PERPS_CANCEL_ORDER,
  SPOT_TRANSFER_ASSET,
  EVM_WITHDRAW_TO_ACCOUNT_ID,
} from "./index.js";

test("payloadHash is deterministic for compact JSON", () => {
  const a = computePayloadHash(SPOT_BATCH_NEW_ORDER, { accountID: 1, orders: [] });
  const b = computePayloadHash(SPOT_BATCH_NEW_ORDER, { accountID: 1, orders: [] });
  assert.equal(a, b);
  assert.match(a, /^0x[a-f0-9]{64}$/);
});

test("toTypedApiSign prepends 0x01", () => {
  // 65-byte ECDSA with recovery id v=0 (valid after normalize)
  const full = (`0x${"11".repeat(64)}${"00"}`) as `0x${string}`;
  const typed = toTypedApiSign(full);
  assert.ok(typed.startsWith("0x01"));
  assert.equal(typed.length, 2 + 2 + 130);
});

test("spot BatchNewOrderItem matches Go SDK field order", () => {
  const item = buildSpotBatchOrderItem({
    symbolID: 42,
    clOrdID: "order-001",
    side: 1,
    type: 1,
    timeInForce: 1,
    price: "50000",
    quantity: "0.1",
    funds: "5000",
  });
  assert.deepEqual(Object.keys(item), spotBatchOrderItemKeyOrder());
});

test("signExchangeAction produces apiSign for master-wallet path", async () => {
  const params = buildSpotNewOrderParams({
    accountID: 12345,
    symbolID: 1,
    side: 1,
    type: 1,
    timeInForce: 1,
    quantity: "0.001",
    price: "50000",
    clOrdID: "hl-test-1",
  });

  const signed = await signExchangeAction({
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4a2dc08",
    market: "spot",
    env: "mainnet",
    actionType: SPOT_BATCH_NEW_ORDER,
    params,
    nonce: 1_700_000_000_000n,
  });

  assert.ok(signed.apiSign.startsWith("0x01"));
  assert.equal(signed.domain.name, "spot");
  assert.equal(signed.domain.chainId, 286623);

  const headers = buildRelayHeaders({
    apiSign: signed.apiSign,
    nonce: signed.nonce,
    chainId: 286623,
  });
  assert.equal(headers["X-API-Sign"], signed.apiSign);
  assert.equal(headers["X-API-Chain"], "286623");
  assert.equal(headers["X-API-Key"], undefined);
});

test("Perps RawOrder keys follow official Go SDK field order", () => {
  const item = buildPerpsOrderItem({
    clOrdID: "o1",
    modifier: 1, // NORMAL
    side: 1,
    type: 1,
    timeInForce: 1,
    price: "100",
    quantity: "1",
    funds: "100",
    stopPrice: "90",
    stopType: 1,
    triggerType: 1,
    reduceOnly: false,
    positionSide: 1, // BOTH
  });
  assert.deepEqual(Object.keys(item), perpsOrderItemKeyOrder());
  const params = buildPerpsNewOrderParams({
    accountID: 1,
    symbolID: 1,
    orders: [item],
  });
  assert.deepEqual(Object.keys(params), ["accountID", "symbolID", "orders"]);
  const hash = computePayloadHash(PERPS_NEW_ORDER, params);
  assert.match(hash, /^0x[a-f0-9]{64}$/);
});

test("Perps cancelOrder params follow Go SDK field order", () => {
  const item = buildPerpsCancelItem({ symbolID: 7, orderID: 99 });
  assert.deepEqual(Object.keys(item), ["symbolID", "orderID"]);
  const params = buildPerpsCancelParams({ accountID: 1, cancels: [item] });
  assert.deepEqual(Object.keys(params), ["accountID", "cancels"]);
  assert.match(computePayloadHash(PERPS_CANCEL_ORDER, params), /^0x[a-f0-9]{64}$/);
});

test("transferAsset EVM_WITHDRAW params follow Go SDK field order", () => {
  const params = buildEvmWithdrawParams({
    id: 42,
    fromAccountID: 54647,
    coinID: 4,
    amount: "1.5",
  });
  assert.deepEqual(Object.keys(params), transferAssetKeyOrder());
  assert.equal(params.toAccountID, EVM_WITHDRAW_TO_ACCOUNT_ID);
  assert.equal(params.type, 2);
  assert.match(computePayloadHash(SPOT_TRANSFER_ASSET, params), /^0x[a-f0-9]{64}$/);
});
