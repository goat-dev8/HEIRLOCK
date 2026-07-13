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

test("permission kernel honors per-user enable overrides", () => {
  const { permissions, registry } = createSkillsOs();
  assert.equal(registry.get("family_office")?.enabled, true);
  const blocked = permissions.can(
    "family_office",
    "read",
    "alive",
    new Map([["family_office", false]]),
  );
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "skill_disabled");
  const allowed = permissions.can(
    "yield",
    "read",
    "alive",
    new Map([["yield", true]]),
  );
  assert.equal(allowed.ok, true);
});
