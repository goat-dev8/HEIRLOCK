import assert from "node:assert/strict";
import { test } from "node:test";
import { createSkillsOs } from "./os.js";

test("disabled skills hide tools", () => {
  const { registry } = createSkillsOs();
  registry.setEnabled("execution", false);
  const tools = registry.visibleTools("alive");
  assert.ok(!tools.includes("sodex.relay"));
  registry.setEnabled("execution", true);
  assert.ok(registry.visibleTools("alive").includes("sodex.relay"));
});

test("permission kernel blocks heir from execution relay", () => {
  const { permissions } = createSkillsOs();
  const r = permissions.can("execution", "relay", "heir");
  assert.equal(r.ok, false);
});
