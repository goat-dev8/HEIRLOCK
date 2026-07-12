import type { Env } from "@heirlock/config";

export class SoSoRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "SoSoRateLimitError";
  }
}

export class SoSoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "SoSoApiError";
  }
}

type CacheEntry = { expiresAt: number; value: unknown };

/**
 * Official SoSoValue OpenAPI client.
 * Auth: x-soso-api-key · Base: https://openapi.sosovalue.com/openapi/v1
 * Limits: 20 rpm / 100k month — enforced client-side governor.
 */
export class SoSoValueClient {
  private readonly baseUrl: string;
  private keys: string[];
  private keyIndex = 0;
  private readonly rpm: number;
  private timestamps: number[] = [];
  private readonly cache = new Map<string, CacheEntry>();
  private monthlyCount = 0;
  private readonly monthlyQuota: number;

  constructor(env: Env) {
    this.baseUrl = env.SOSO_BASE_URL.replace(/\/$/, "");
    this.keys = [env.SOSO_API_KEY, env.SOSO_API_KEY_2].filter(
      (k): k is string => Boolean(k),
    );
    this.rpm = env.SOSO_RATE_LIMIT_RPM;
    this.monthlyQuota = env.SOSO_MONTHLY_QUOTA;
  }

  get configured(): boolean {
    return this.keys.length > 0;
  }

  getMetrics() {
    return {
      configured: this.configured,
      keys: this.keys.length,
      rpmWindow: this.timestamps.length,
      rpmLimit: this.rpm,
      monthlyCount: this.monthlyCount,
      monthlyQuota: this.monthlyQuota,
      cacheEntries: this.cache.size,
    };
  }

  // --- Currency ---
  listCurrencies(params?: Record<string, string | number>) {
    return this.get("/currencies", params);
  }
  currencyMarketSnapshot(id: string) {
    return this.get(`/currencies/${id}/market-snapshot`);
  }

  // --- ETF ---
  etfSummaryHistory(params: {
    symbol: string;
    country_code: string;
    limit?: number;
    start_date?: string;
    end_date?: string;
  }) {
    return this.get("/etfs/summary-history", params);
  }
  listEtfs(params: { symbol: string; country_code: string }) {
    return this.get("/etfs", params);
  }
  etfMarketSnapshot(ticker: string) {
    return this.get(`/etfs/${ticker}/market-snapshot`);
  }
  etfHistory(ticker: string, params?: Record<string, string | number>) {
    return this.get(`/etfs/${ticker}/history`, params);
  }

  // --- Index / SSI ---
  listIndices(params?: Record<string, string | number>) {
    return this.get("/indices", params);
  }
  indexConstituents(indexId: string) {
    return this.get(`/indices/${indexId}/constituents`);
  }
  indexMarketSnapshot(indexId: string) {
    return this.get(`/indices/${indexId}/market-snapshot`);
  }

  // --- Feeds ---
  hotNews(params?: { page?: number; page_size?: number }) {
    return this.get("/news/hot", params);
  }
  searchNews(params: {
    keyword: string;
    sort?: string;
    page?: number;
    page_size?: number;
  }) {
    return this.get("/news/search", params);
  }

  // --- Macro ---
  macroEvents(params?: Record<string, string | number>) {
    return this.get("/macro/events", params);
  }

  // --- Fundraising ---
  fundraising(params?: Record<string, string | number>) {
    return this.get("/fundraising", params);
  }

  // --- Stocks / Treasuries / Analysis (generic passthrough) ---
  getPath(path: string, params?: Record<string, string | number | undefined>) {
    return this.get(path.startsWith("/") ? path : `/${path}`, params);
  }

  async diagProbe(): Promise<{
    ok: boolean;
    latencyMs: number;
    error?: string;
    sample?: unknown;
  }> {
    if (!this.configured) {
      return { ok: false, latencyMs: 0, error: "SOSO_API_KEY missing" };
    }
    const started = Date.now();
    try {
      const sample = await this.etfSummaryHistory({
        symbol: "BTC",
        country_code: "US",
        limit: 1,
      });
      return { ok: true, latencyMs: Date.now() - started, sample };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async get(
    path: string,
    params?: Record<string, string | number | undefined>,
    cacheTtlMs = 60_000,
  ): Promise<unknown> {
    if (!this.configured) {
      throw new Error("SoSoValue client not configured (SOSO_API_KEY)");
    }

    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
      }
    }
    const url = `${this.baseUrl}${path}${qs.size ? `?${qs}` : ""}`;
    const cacheKey = url;

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    await this.acquirePermit();

    let lastErr: unknown;
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[this.keyIndex]!;
      try {
        const res = await fetch(url, {
          headers: {
            "x-soso-api-key": key,
            accept: "application/json",
          },
        });

        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("retry-after") ?? "30");
          this.rotateKey();
          throw new SoSoRateLimitError("SoSoValue rate limited", retryAfter * 1000);
        }

        const text = await res.text();
        let body: unknown = text;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          /* keep text */
        }

        if (!res.ok) {
          // try failover key on 401/403
          if ((res.status === 401 || res.status === 403) && this.keys.length > 1) {
            this.rotateKey();
            lastErr = new SoSoApiError(`SoSoValue ${res.status}`, res.status, body);
            continue;
          }
          throw new SoSoApiError(`SoSoValue ${res.status}`, res.status, body);
        }

        this.monthlyCount += 1;
        this.cache.set(cacheKey, { value: body, expiresAt: Date.now() + cacheTtlMs });
        return body;
      } catch (err) {
        lastErr = err;
        if (err instanceof SoSoRateLimitError && this.keys.length > 1) {
          this.rotateKey();
          continue;
        }
        throw err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  private rotateKey() {
    this.keyIndex = (this.keyIndex + 1) % this.keys.length;
  }

  private async acquirePermit(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);
    if (this.monthlyCount >= this.monthlyQuota) {
      throw new SoSoRateLimitError("SoSoValue monthly quota exhausted");
    }
    if (this.timestamps.length >= this.rpm) {
      const wait = 60_000 - (now - this.timestamps[0]!);
      await sleep(Math.max(wait, 50));
      return this.acquirePermit();
    }
    this.timestamps.push(Date.now());
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function createSoSoValueClient(env: Env) {
  return new SoSoValueClient(env);
}
