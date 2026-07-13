import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCitationContentHash, CITATION_KIND } from "./attestation.js";

test("citation content hash is stable", () => {
  const citations = [
    { source: "etf", endpoint: "/etfs", at: "2026-01-01T00:00:00.000Z", status: "LIVE" },
  ];
  const a = buildCitationContentHash({
    wallet: "0xAbC",
    citations,
    proposalAction: "REVIEW",
  });
  const b = buildCitationContentHash({
    wallet: "0xabc",
    citations,
    proposalAction: "REVIEW",
  });
  assert.equal(a, b);
  assert.equal(a.startsWith("0x"), true);
  assert.equal(CITATION_KIND.startsWith("0x"), true);
});
