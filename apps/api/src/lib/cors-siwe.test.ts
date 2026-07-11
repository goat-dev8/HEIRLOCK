import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedCorsOrigin,
  isAllowedSiweDomain,
  resolveSiweFromOrigin,
} from "./cors-siwe.js";

describe("cors-siwe", () => {
  it("allows vercel.app preview origins", () => {
    assert.equal(
      isAllowedCorsOrigin("https://heirlock-abc123.vercel.app", []),
      true,
    );
  });

  it("resolves SIWE domain from Origin", () => {
    const r = resolveSiweFromOrigin({
      originHeader: "https://heirlock.vercel.app",
      configuredDomain: "localhost",
      configuredUri: "http://localhost:8080",
      corsAllowlist: [],
    });
    assert.equal(r.domain, "heirlock.vercel.app");
    assert.equal(r.uri, "https://heirlock.vercel.app");
  });

  it("accepts vercel SIWE domains", () => {
    assert.equal(
      isAllowedSiweDomain("foo.vercel.app", "localhost", []),
      true,
    );
  });
});
