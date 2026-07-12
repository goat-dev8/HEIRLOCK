import type { Env } from "@heirlock/config";

export type SodexEnvironment = "mainnet" | "testnet";

export class SodexApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "SodexApiError";
  }
}

export type SodexGateways = {
  spotRest: string;
  perpsRest: string;
  spotWs: string;
  perpsWs: string;
  appUrl: string;
  chainId: number;
};

export type RelayOpts = {
  apiKeyName?: string;
  apiSign: string;
  apiNonce: string;
  method?: "POST" | "DELETE" | "PUT";
};

/**
 * SoDEX REST client — official paths use {userAddress}, not accountId-as-path.
 * Writes require X-API-Sign + X-API-Nonce; omit X-API-Key for master-wallet signing.
 * Source: https://sodex.com/documentation/trading-api/rest-v1/sodex-rest-spot-api
 */
export class SodexClient {
  constructor(private readonly env: Env) {}

  gateways(environment: SodexEnvironment): SodexGateways {
    if (environment === "testnet") {
      if (!this.env.HEIRLOCK_ALLOW_TESTNET) {
        throw new Error("Testnet disabled (HEIRLOCK_ALLOW_TESTNET=false)");
      }
      return {
        spotRest: this.env.SODEX_TESTNET_SPOT_REST,
        perpsRest: this.env.SODEX_TESTNET_PERPS_REST,
        spotWs: this.env.SODEX_TESTNET_SPOT_WS,
        perpsWs: this.env.SODEX_TESTNET_PERPS_WS,
        appUrl: this.env.SODEX_TESTNET_APP_URL,
        chainId: this.env.SODEX_TESTNET_CHAIN_ID,
      };
    }
    return {
      spotRest: this.env.SODEX_MAINNET_SPOT_REST,
      perpsRest: this.env.SODEX_MAINNET_PERPS_REST,
      spotWs: this.env.SODEX_MAINNET_SPOT_WS,
      perpsWs: this.env.SODEX_MAINNET_PERPS_WS,
      appUrl: this.env.SODEX_MAINNET_APP_URL,
      chainId: this.env.SODEX_MAINNET_CHAIN_ID,
    };
  }

  portfolioUrl(environment: SodexEnvironment): string {
    return `${this.gateways(environment).appUrl.replace(/\/$/, "")}/portfolio`;
  }

  private spot(environment: SodexEnvironment) {
    return this.gateways(environment).spotRest.replace(/\/$/, "");
  }

  private perps(environment: SodexEnvironment) {
    return this.gateways(environment).perpsRest.replace(/\/$/, "");
  }

  // --- Public market data ---
  listSymbols(environment: SodexEnvironment, symbol?: string) {
    const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return this.getJson(`${this.spot(environment)}/markets/symbols${q}`);
  }

  listPerpsSymbols(environment: SodexEnvironment, symbol?: string) {
    const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return this.getJson(`${this.perps(environment)}/markets/symbols${q}`);
  }

  getTicker(environment: SodexEnvironment, symbol?: string) {
    const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return this.getJson(`${this.spot(environment)}/markets/tickers${q}`);
  }

  getPerpsTicker(environment: SodexEnvironment, symbol?: string) {
    const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return this.getJson(`${this.perps(environment)}/markets/tickers${q}`);
  }

  getOrderbook(environment: SodexEnvironment, symbol: string, limit = 10) {
    return this.getJson(
      `${this.spot(environment)}/markets/${encodeURIComponent(symbol)}/orderbook?limit=${limit}`,
    );
  }

  getPerpsOrderbook(environment: SodexEnvironment, symbol: string, limit = 10) {
    return this.getJson(
      `${this.perps(environment)}/markets/${encodeURIComponent(symbol)}/orderbook?limit=${limit}`,
    );
  }

  // --- Account reads (by userAddress) ---
  async getAccountState(
    environment: SodexEnvironment,
    userAddress: string,
    market: "spot" | "perps" = "spot",
  ) {
    const base = market === "spot" ? this.spot(environment) : this.perps(environment);
    const raw = await this.getJson(`${base}/accounts/${userAddress}/state`);
    const aid = extractAid(raw);
    if (!aid) {
      throw new SodexApiError(
        `SoDEX ${market} account state missing aid — Enable Trading on official SoDEX first`,
        404,
        raw,
      );
    }
    return { aid: String(aid), raw };
  }

  getBalances(environment: SodexEnvironment, userAddress: string, accountID?: string) {
    const q = accountID ? `?accountID=${encodeURIComponent(accountID)}` : "";
    return this.getJson(
      `${this.spot(environment)}/accounts/${userAddress}/balances${q}`,
    );
  }

  getOpenOrders(environment: SodexEnvironment, userAddress: string, accountID?: string) {
    const q = accountID ? `?accountID=${encodeURIComponent(accountID)}` : "";
    return this.getJson(
      `${this.spot(environment)}/accounts/${userAddress}/orders${q}`,
    );
  }

  getPerpsOpenOrders(environment: SodexEnvironment, userAddress: string, accountID?: string) {
    const q = accountID ? `?accountID=${encodeURIComponent(accountID)}` : "";
    return this.getJson(
      `${this.perps(environment)}/accounts/${userAddress}/orders${q}`,
    );
  }

  getPerpsBalances(environment: SodexEnvironment, userAddress: string, accountID?: string) {
    const q = accountID ? `?accountID=${encodeURIComponent(accountID)}` : "";
    return this.getJson(
      `${this.perps(environment)}/accounts/${userAddress}/balances${q}`,
    );
  }

  /**
   * Poll open orders until orderID appears/disappears or timeout.
   * Used after place/cancel for status confirmation.
   */
  async pollOrderPresence(
    environment: SodexEnvironment,
    userAddress: string,
    orderID: number,
    opts: {
      market?: "spot" | "perps";
      expectPresent: boolean;
      timeoutMs?: number;
      intervalMs?: number;
      accountID?: string;
    },
  ) {
    const market = opts.market ?? "spot";
    const timeoutMs = opts.timeoutMs ?? 15_000;
    const intervalMs = opts.intervalMs ?? 500;
    const start = Date.now();
    let last: unknown;
    while (Date.now() - start < timeoutMs) {
      last =
        market === "perps"
          ? await this.getPerpsOpenOrders(environment, userAddress, opts.accountID)
          : await this.getOpenOrders(environment, userAddress, opts.accountID);
      const present = orderIdInOrders(last, orderID);
      if (present === opts.expectPresent) {
        return { ok: true as const, present, raw: last };
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return { ok: false as const, present: orderIdInOrders(last, orderID), raw: last };
  }

  getOrderHistory(environment: SodexEnvironment, userAddress: string) {
    return this.getJson(
      `${this.spot(environment)}/accounts/${userAddress}/orders/history`,
    );
  }

  getTrades(environment: SodexEnvironment, userAddress: string) {
    return this.getJson(
      `${this.spot(environment)}/accounts/${userAddress}/trades`,
    );
  }

  getPortfolioBundle(environment: SodexEnvironment, userAddress: string) {
    return Promise.all([
      this.getBalances(environment, userAddress),
      this.getOpenOrders(environment, userAddress),
      this.getOrderHistory(environment, userAddress),
      this.getTrades(environment, userAddress),
      this.getAccountState(environment, userAddress),
    ]).then(([balances, orders, orderHistory, trades, state]) => ({
      balances,
      orders,
      orderHistory,
      trades,
      state,
      portfolioUrl: this.portfolioUrl(environment),
    }));
  }

  /**
   * Spot place: POST /trade/orders/batch (official Spot REST, 2026 docs)
   * Body = BatchNewOrderRequest params only. Headers carry signature.
   */
  placeOrders(
    environment: SodexEnvironment,
    _userAddress: string,
    body: unknown,
    opts: RelayOpts,
  ) {
    return this.signedRequest(
      environment,
      "spot",
      `/trade/orders/batch`,
      body,
      { ...opts, method: "POST" },
    );
  }

  cancelOrders(
    environment: SodexEnvironment,
    _userAddress: string,
    body: unknown,
    opts: RelayOpts,
  ) {
    return this.signedRequest(
      environment,
      "spot",
      `/trade/orders/batch`,
      body,
      { ...opts, method: "DELETE" },
    );
  }

  /**
   * Perps place: POST /trade/orders (official Perps REST, 2026 docs)
   * Action type for EIP-712: newOrder. Domain name: futures.
   */
  placePerpsOrders(
    environment: SodexEnvironment,
    _userAddress: string,
    body: unknown,
    opts: RelayOpts,
  ) {
    return this.signedRequest(environment, "perps", `/trade/orders`, body, {
      ...opts,
      method: "POST",
    });
  }

  /** Perps cancel: DELETE /trade/orders — action type cancelOrder */
  cancelPerpsOrders(
    environment: SodexEnvironment,
    _userAddress: string,
    body: unknown,
    opts: RelayOpts,
  ) {
    return this.signedRequest(environment, "perps", `/trade/orders`, body, {
      ...opts,
      method: "DELETE",
    });
  }

  /**
   * Transfer asset (EVM/perps withdraw): POST /accounts/transfers
   * Official: toAccountID=999 + type=EVM_WITHDRAW(2) for native EVM withdraw.
   */
  transferAsset(
    environment: SodexEnvironment,
    body: unknown,
    opts: RelayOpts,
  ) {
    return this.signedRequest(environment, "spot", `/accounts/transfers`, body, {
      ...opts,
      method: "POST",
    });
  }

  listCoins(environment: SodexEnvironment) {
    return this.getJson(`${this.spot(environment)}/markets/coins`);
  }

  /** Generic relay for authenticated writes */
  async relaySignedOrder(
    environment: SodexEnvironment,
    path: string,
    body: unknown,
    opts: RelayOpts & { market?: "spot" | "perps" },
  ) {
    return this.signedRequest(
      environment,
      opts.market ?? "spot",
      path.startsWith("/") ? path : `/${path}`,
      body,
      opts,
    );
  }

  private async signedRequest(
    environment: SodexEnvironment,
    market: "spot" | "perps",
    path: string,
    body: unknown,
    opts: RelayOpts,
  ) {
    if (!this.env.TRADING_ENABLED || this.env.KILL_SWITCH_TRADING) {
      throw new Error("Trading disabled by kill switch / TRADING_ENABLED=false");
    }
    const base = market === "spot" ? this.spot(environment) : this.perps(environment);
    const url = `${base}${path}`;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
      "X-API-Sign": opts.apiSign,
      "X-API-Nonce": opts.apiNonce,
    };
    if (opts.apiKeyName) headers["X-API-Key"] = opts.apiKeyName;

    const res = await fetch(url, {
      method: opts.method ?? "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* keep */
    }
    if (!res.ok) {
      throw new SodexApiError(`SoDEX ${opts.method ?? "POST"} ${res.status}`, res.status, parsed);
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      "code" in parsed &&
      Number((parsed as { code: number }).code) !== 0
    ) {
      const errMsg =
        (parsed as { error?: string; msg?: string }).error ??
        (parsed as { msg?: string }).msg ??
        `SoDEX business code ${(parsed as { code: number }).code}`;
      throw new SodexApiError(errMsg, 200, parsed);
    }
    // Spot/perps batch responses: top-level code 0 with per-item failures
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      const data = (parsed as { data: unknown }).data;
      if (Array.isArray(data) && data.length > 0) {
        const failed = data.filter(
          (row) =>
            row &&
            typeof row === "object" &&
            "code" in row &&
            Number((row as { code: number }).code) !== 0,
        ) as Array<{ code: number; error?: string; clOrdID?: string }>;
        if (failed.length === data.length) {
          const first = failed[0]!;
          throw new SodexApiError(
            first.error ?? `SoDEX order rejected code ${first.code}`,
            200,
            parsed,
          );
        }
      }
    }
    return parsed;
  }

  private async getJson(url: string): Promise<unknown> {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* keep */
    }
    if (!res.ok) {
      throw new SodexApiError(`SoDEX ${res.status}`, res.status, parsed);
    }
    return parsed;
  }
}

function extractAid(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  if (obj.aid != null) return String(obj.aid);
  if (obj.accountId != null) return String(obj.accountId);
  if (obj.accountID != null) return String(obj.accountID);
  if (obj.data && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>;
    if (data.aid != null) return String(data.aid);
    if (data.accountId != null) return String(data.accountId);
    if (data.accountID != null) return String(data.accountID);
  }
  return undefined;
}

function orderIdInOrders(raw: unknown, orderID: number): boolean {
  const rows = flattenOrders(raw);
  return rows.some((row) => {
    const id = row.orderID ?? row.orderId ?? row.id;
    return id != null && Number(id) === orderID;
  });
}

function flattenOrders(raw: unknown): Array<Record<string, unknown>> {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((r) => r && typeof r === "object") as Array<Record<string, unknown>>;
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) return flattenOrders(o.data);
    if (o.data && typeof o.data === "object") {
      const data = o.data as Record<string, unknown>;
      if (Array.isArray(data.orders)) return flattenOrders(data.orders);
      if (Array.isArray(data.data)) return flattenOrders(data.data);
    }
    if (Array.isArray(o.orders)) return flattenOrders(o.orders);
  }
  return [];
}

export function createSodexClient(env: Env) {
  return new SodexClient(env);
}
