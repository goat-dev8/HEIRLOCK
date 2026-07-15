import assert from "node:assert/strict";
import { test } from "node:test";
import { outcomeDelta } from "./learning.js";

test("outcomeDelta — HIT on approval raises confidence", () => {
  assert.equal(outcomeDelta("HIT", "approved"), 8);
});

test("outcomeDelta — STOP after approval penalizes", () => {
  assert.equal(outcomeDelta("STOP", "approved"), -12);
});

test("outcomeDelta — STOP after challenge rewards", () => {
  assert.equal(outcomeDelta("STOP", "rejected"), 6);
});

test("outcomeDelta — PENDING is neutral", () => {
  assert.equal(outcomeDelta("PENDING", "approved"), 0);
});
