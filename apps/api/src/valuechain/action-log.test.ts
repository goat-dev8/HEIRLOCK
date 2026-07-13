import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildFillEvidenceCid,
  buildFillRefId,
  FILL_REF_TYPE,
} from "./action-log.js";

test("fill evidence cid + refId are stable hashes", () => {
  const evidence = {
    status: "filled" as const,
    sodexOrderId: "42",
    executedQty: 0.5,
    tradeIds: ["t1"],
    historyMatch: true,
    tradesMatch: true,
    balanceChecked: true,
    note: "ok",
    raw: {},
  };
  const cid = buildFillEvidenceCid({
    signedOrderId: "ord_1",
    wallet: "0xAbC",
    evidence,
  });
  assert.match(cid, /SODEX_FILL/);
  const a = buildFillRefId(cid);
  const b = buildFillRefId(cid);
  assert.equal(a, b);
  assert.equal(a.startsWith("0x"), true);
  assert.equal(FILL_REF_TYPE.startsWith("0x"), true);
});
