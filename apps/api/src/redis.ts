import { webcrypto as crypto } from "node:crypto";
import { Redis as UpstashRedis } from "@upstash/redis";
import { Redis as IoRedis } from "ioredis";

type Kv = {
  set(key: string, value: string, opts?: { ex?: number }): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<unknown>;
  ping(): Promise<string>;
};

let kv: Kv | null | undefined;

function createKv(): Kv | null {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (restUrl && restToken) {
    const client = new UpstashRedis({ url: restUrl, token: restToken });
    return {
      async set(key, value, opts) {
        if (opts?.ex) return client.set(key, value, { ex: opts.ex });
        return client.set(key, value);
      },
      async get(key) {
        const v = await client.get<string>(key);
        return v == null ? null : String(v);
      },
      async del(key) {
        return client.del(key);
      },
      async ping() {
        const pong = await client.ping();
        return String(pong);
      },
    };
  }

  const url = process.env.REDIS_URL;
  if (!url) return null;

  const client = new IoRedis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  return {
    async set(key, value, opts) {
      if (client.status !== "ready") await client.connect();
      if (opts?.ex) return client.set(key, value, "EX", opts.ex);
      return client.set(key, value);
    },
    async get(key) {
      if (client.status !== "ready") await client.connect();
      return client.get(key);
    },
    async del(key) {
      if (client.status !== "ready") await client.connect();
      return client.del(key);
    },
    async ping() {
      if (client.status !== "ready") await client.connect();
      return client.ping();
    },
  };
}

export function getKv(): Kv | null {
  if (kv === undefined) kv = createKv();
  return kv;
}

export async function probeRedis(): Promise<{
  configured: boolean;
  connected: boolean;
  backend?: "upstash-rest" | "ioredis" | "none";
  error?: string;
}> {
  const backend = process.env.UPSTASH_REDIS_REST_URL
    ? "upstash-rest"
    : process.env.REDIS_URL
      ? "ioredis"
      : "none";

  if (backend === "none") {
    return { configured: false, connected: false, backend, error: "No Redis configured" };
  }

  try {
    const client = getKv();
    if (!client) return { configured: false, connected: false, backend };
    const pong = await client.ping();
    return {
      configured: true,
      connected: /pong/i.test(pong),
      backend,
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      backend,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const mem = new Map<string, { nonce: string; expiresAt: number }>();

function cryptoRandom() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex");
}

export async function issueAuthNonce(address: string): Promise<string> {
  const key = `heirlock:siwe:${address.toLowerCase()}`;
  const nonce = cryptoRandom();
  const ttl = 600;
  const r = getKv();
  if (r) {
    try {
      await r.set(key, nonce, { ex: ttl });
      return nonce;
    } catch {
      /* fall through to memory */
    }
  }
  mem.set(key, { nonce, expiresAt: Date.now() + ttl * 1000 });
  return nonce;
}

export async function consumeAuthNonce(address: string, nonce: string): Promise<boolean> {
  const key = `heirlock:siwe:${address.toLowerCase()}`;
  const r = getKv();
  if (r) {
    try {
      const val = await r.get(key);
      if (!val || val !== nonce) return false;
      await r.del(key);
      return true;
    } catch {
      /* fall through */
    }
  }
  const rec = mem.get(key);
  if (!rec) return false;
  if (rec.expiresAt < Date.now()) {
    mem.delete(key);
    return false;
  }
  if (rec.nonce !== nonce) return false;
  mem.delete(key);
  return true;
}
