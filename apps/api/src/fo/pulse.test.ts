import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreDelta } from "./pulse.js";

test("scoreDelta — broken or BLOCK is severe negative", () => {
  assert.equal(scoreDelta("broken", false, "APPROVE"), -25);
  assert.equal(scoreDelta("watch", false, "BLOCK"), -25);
});

test("scoreDelta — pressure drifts down", () => {
  assert.equal(scoreDelta("pressure", false, "APPROVE"), -12);
  assert.equal(scoreDelta("watch", true, "APPROVE"), -8);
});

test("scoreDelta — clean approve nudges up", () => {
  assert.equal(scoreDelta("watch", false, "APPROVE"), 4);
});
