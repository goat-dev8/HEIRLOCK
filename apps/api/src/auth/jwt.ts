import { SignJWT, jwtVerify } from "jose";
import type { Env } from "@heirlock/config";

export type SessionClaims = {
  sub: string; // wallet address checksum/lower
  address: string;
};

function secretKey(env: Env) {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signSession(env: Env, address: string): Promise<string> {
  const normalized = address.toLowerCase();
  return new SignJWT({ address: normalized })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(normalized)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey(env));
}

export async function verifySession(
  env: Env,
  token: string,
): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secretKey(env));
  const address = String(payload.address ?? payload.sub ?? "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    throw new Error("Invalid session address");
  }
  return { sub: address, address };
}
