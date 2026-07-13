import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useToken } from "./auth-store";
import { useNetwork } from "./network-store";
import { unwrapArray, unwrapObject } from "./sodex-sign";

export interface HealthResponse {
  status: string;
  checks?: Record<string, Record<string, unknown>>;
  profile?: string;
  ts?: string;
}
export interface EnvConfig {
  profile: string;
  allowTestnet: boolean;
  valuechain: Record<string, { chainId: number; rpc: string; explorer: string; nativeSymbol?: string }>;
  sodex: {
    mainnetAppUrl: string;
    testnetAppUrl: string;
    tradingEnabled: boolean;
    maxNotionalUsd: number;
    architecture: string;
  };
  ssi: { appUrl: string; baseChainId: number };
  ai: { primaryProvider: string; models: string[] };
  apiPublicUrl: string;
}
export interface ContractsResponse {
  mainnet: NetworkContracts;
  testnet: NetworkContracts;
}
export interface NetworkContracts {
  chainId: number;
  explorer: string;
  deployed: boolean;
  addresses: Record<string, string>;
  artifact?: Record<string, unknown>;
}
export interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  modes: string[];
  permissions: string[];
  tools: string[];
}
export interface SkillEvent {
  id?: string;
  skillId?: string;
  type?: string;
  eventType?: string;
  ts?: string;
  createdAt?: string;
  message?: string;
  [k: string]: unknown;
}
export interface SsiConfig {
  appUrl: string;
  earnUrl?: string;
  rewardUrl?: string;
  baseChainId: number;
  baseRpc: string;
  sosoTokenBase: string;
  sosoTokenEthereum: string;
  onChain: Record<string, string | null | undefined>;
  indexTokens?: Array<{ symbol: string; address: string; basescan?: string }>;
  protocolContracts?: Array<{ role: string; address: string; basescan?: string }>;
  dataSource: string;
  defaultIndexId?: string;
  knownIndices?: string[];
  [k: string]: unknown;
}
export interface SodexGateways {
  environment: string;
  spotRest: string;
  perpsRest: string;
  spotWs: string;
  perpsWs: string;
  appUrl: string;
  chainId: number;
  portfolioUrl: string;
  architecture: string;
  mainnetMaxNotionalUsd: number;
  note?: string;
  enableTradingUrl?: string;
}
export interface AuthMe {
  userId?: string;
  address?: string;
  sodexAccounts?: Array<{ environment: string; accountId?: string; aid?: string; verifiedAt?: string }>;
  wealthPolicy?: { mode?: string | number; maxNotionalUsd?: number | string };
  profile?: Record<string, unknown>;
  [k: string]: unknown;
}
export interface SodexAccount {
  verified?: boolean;
  environment?: string;
  aid?: string;
  accountId?: string;
  enableTradingUrl?: string;
  portfolioUrl?: string;
  account?: Record<string, unknown> | null;
  [k: string]: unknown;
}
export interface SodexSymbol {
  id?: number;
  symbol: string;
  displayName?: string;
  price?: number | string;
  change24h?: number | string;
  [k: string]: unknown;
}
export interface SodexPortfolio {
  balances?: Array<{
    asset: string;
    free?: number | string;
    locked?: number | string;
    total?: number | string;
    usdValue?: number | string;
  }>;
  orders?: Array<Record<string, unknown>>;
  trades?: Array<Record<string, unknown>>;
  history?: Array<Record<string, unknown>>;
  totals?: { usd?: number | string | null; assets?: number; pricedAssets?: number; note?: string };
  accountId?: string;
  [k: string]: unknown;
}
export interface NewsItem {
  id?: string;
  title?: string;
  source?: string;
  url?: string;
  publishedAt?: string;
  summary?: string;
  sentiment?: string;
  [k: string]: unknown;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function mapBalance(row: unknown) {
  const r = asRecord(row);
  const asset = String(
    r.asset ?? r.coin ?? r.coinName ?? r.symbol ?? r.name ?? r.currency ?? "UNKNOWN",
  );
  const asAmount = (v: unknown): number | string =>
    typeof v === "number" || typeof v === "string" ? v : 0;
  const free = asAmount(r.free ?? r.available ?? r.avail ?? r.cash ?? 0);
  const locked = asAmount(r.locked ?? r.freeze ?? r.frozen ?? 0);
  const totalRaw = r.total ?? r.balance;
  const total = asAmount(
    totalRaw ?? (Number(free) || 0) + (Number(locked) || 0),
  );
  const usdRaw = r.usdValue ?? r.usd ?? r.valueUsd ?? r.notionalUsd;
  const usdValue =
    typeof usdRaw === "number" || typeof usdRaw === "string" ? usdRaw : undefined;
  return { asset, free, locked, total, usdValue };
}

function mapNews(row: unknown): NewsItem {
  const r = asRecord(row);
  return {
    id: String(r.id ?? r.newsId ?? r.hash ?? ""),
    title: String(r.title ?? r.headline ?? r.name ?? "Untitled"),
    source: String(r.source ?? r.publisher ?? r.media ?? "SoSoValue"),
    url: (r.url ?? r.link ?? r.sourceUrl) as string | undefined,
    publishedAt: String(r.publishedAt ?? r.publishTime ?? r.time ?? r.createdAt ?? ""),
    summary: (r.summary ?? r.content ?? r.desc ?? r.description) as string | undefined,
    sentiment: (r.sentiment ?? r.tone) as string | undefined,
    ...r,
  };
}

function mapSymbol(row: unknown): SodexSymbol {
  const r = asRecord(row);
  const symbol = String(r.symbol ?? r.name ?? r.displayName ?? r.pair ?? "");
  return {
    id: typeof r.id === "number" ? r.id : Number(r.id ?? r.symbolID ?? 0) || undefined,
    symbol,
    displayName: String(r.displayName ?? r.name ?? symbol),
    price: (r.price ?? r.lastPx ?? r.lastPrice ?? r.last ?? r.markPx) as string | number | undefined,
    change24h: (r.change24h ?? r.changePct24h ?? r["24h_change_pct"]) as string | number | undefined,
    ...r,
  };
}

function mapConstituent(row: unknown) {
  const r = asRecord(row);
  let weight =
    r.weight != null ? Number(r.weight) : r.weightPct != null ? Number(r.weightPct) : undefined;
  // Official SSI weights are often fractions (0.31 = 31%)
  if (weight != null && Number.isFinite(weight) && Math.abs(weight) <= 1) {
    weight = weight * 100;
  }
  return {
    symbol: String(r.symbol ?? r.ticker ?? r.coin ?? r.name ?? "—"),
    name: String(r.name ?? r.fullName ?? r.symbol ?? "—"),
    weight,
  };
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api<HealthResponse>("/api/health"),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 3,
  });
}
export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => api<EnvConfig>("/api/config/environment"),
    staleTime: 5 * 60_000,
  });
}
export function useContractsConfig() {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: () => api<ContractsResponse>("/api/contracts"),
    staleTime: 10 * 60_000,
  });
}
export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => api<{ skills: Skill[] }>("/api/skills"),
    staleTime: 60_000,
  });
}
export function useSsiConfig() {
  return useQuery({
    queryKey: ["ssi", "config"],
    queryFn: () => api<SsiConfig>("/api/ssi/config"),
    staleTime: 10 * 60_000,
  });
}
export function useSodexGateways(environment: "mainnet" | "testnet") {
  return useQuery({
    queryKey: ["sodex", "gateways", environment],
    queryFn: async () => {
      const res = await api<SodexGateways>("/api/sodex/gateways", { query: { environment } });
      return { ...res, enableTradingUrl: res.enableTradingUrl ?? res.appUrl };
    },
    staleTime: 5 * 60_000,
  });
}
export function useAuthMe() {
  const token = useToken();
  return useQuery({
    queryKey: ["auth", "me", token],
    queryFn: async () => {
      const res = await api<{ address?: string; profile?: Record<string, unknown> }>("/api/auth/me", {
        auth: true,
      });
      const profile = res.profile ?? {};
      const wealth = asRecord(profile.wealthPolicy);
      return {
        address: res.address,
        userId: profile.id as string | undefined,
        sodexAccounts: (profile.sodexAccounts as AuthMe["sodexAccounts"]) ?? [],
        wealthPolicy: {
          mode: wealth.mode as string | number | undefined,
          maxNotionalUsd: wealth.maxNotionalUsd as number | string | undefined,
        },
        profile,
      } satisfies AuthMe;
    },
    enabled: !!token,
    retry: false,
  });
}
export function useSodexAccount() {
  const token = useToken();
  const [network] = useNetwork();
  const gateways = useSodexGateways(network);
  return useQuery({
    queryKey: ["sodex", "me", "account", token, network],
    queryFn: async () => {
      const res = await api<{
        environment?: string;
        account?: { accountId?: string } | null;
        portfolioUrl?: string;
        verified?: boolean;
      }>("/api/sodex/me/account", { auth: true, query: { environment: network } });
      const aid = res.account?.accountId;
      return {
        verified: Boolean(res.verified ?? res.account),
        environment: res.environment ?? network,
        aid,
        accountId: aid,
        account: res.account ?? null,
        portfolioUrl: res.portfolioUrl,
        enableTradingUrl: gateways.data?.appUrl,
      } satisfies SodexAccount;
    },
    enabled: !!token,
    retry: false,
  });
}
export function useSodexPortfolio() {
  const token = useToken();
  const [network] = useNetwork();
  return useQuery({
    queryKey: ["sodex", "portfolio", token, network],
    queryFn: async () => {
      const res = await api<Record<string, unknown>>("/api/sodex/me/portfolio", {
        auth: true,
        query: { environment: network },
      });
      const balances = unwrapArray(res.balances).map(mapBalance);
      const orders = unwrapArray(res.orders).map((o) => asRecord(o));
      const trades = unwrapArray(res.trades).map((o) => asRecord(o));
      const history = unwrapArray(res.orderHistory).map((o) => asRecord(o));
      return {
        ...res,
        accountId: res.accountId as string | undefined,
        balances,
        orders,
        trades,
        history,
        totals: asRecord(res.totals) as SodexPortfolio["totals"],
      } satisfies SodexPortfolio;
    },
    enabled: !!token,
    retry: false,
  });
}
export function useSodexSymbols(environment: "mainnet" | "testnet", market: "spot" | "perps") {
  return useQuery({
    queryKey: ["sodex", "symbols", environment, market],
    queryFn: async () => {
      const res = await api<Record<string, unknown>>("/api/sodex/markets/symbols", {
        query: { environment, market },
      });
      const symbols = unwrapArray(res.data ?? res).map(mapSymbol).filter((s) => s.symbol);
      return { symbols, environment, market, raw: res };
    },
    staleTime: 60_000,
  });
}
export function useSodexOrderbook(
  environment: "mainnet" | "testnet",
  market: "spot" | "perps",
  symbol?: string,
) {
  return useQuery({
    queryKey: ["sodex", "orderbook", environment, market, symbol],
    queryFn: async () => {
      const res = await api<Record<string, unknown>>(
        `/api/sodex/markets/${encodeURIComponent(symbol!)}/orderbook`,
        { query: { environment, market, limit: 12 } },
      );
      const book = unwrapObject(res.data ?? res);
      const bids = (Array.isArray(book.bids) ? book.bids : []) as Array<[string | number, string | number]>;
      const asks = (Array.isArray(book.asks) ? book.asks : []) as Array<[string | number, string | number]>;
      return { bids, asks, symbol, environment, market, raw: res };
    },
    enabled: !!symbol,
    refetchInterval: 4_000,
  });
}
export function useSosoNews() {
  const token = useToken();
  return useQuery({
    queryKey: ["soso", "news", token],
    queryFn: async () => {
      const res = await api<Record<string, unknown>>("/api/soso/news/hot", { auth: true });
      const items = unwrapArray(res.data ?? res).map(mapNews);
      return { items, raw: res };
    },
    enabled: !!token,
    retry: false,
  });
}
export function useSsiConstituents(indexId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ["ssi", "constituents", indexId, token],
    queryFn: async () => {
      const res = await api<Record<string, unknown>>(
        `/api/ssi/indices/${encodeURIComponent(indexId)}/constituents`,
        { auth: true },
      );
      const constituents = unwrapArray(res.data ?? res).map(mapConstituent);
      return { constituents, indexId, raw: res };
    },
    enabled: !!token && !!indexId,
    retry: false,
  });
}
export function useSsiSnapshot(indexId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ["ssi", "snapshot", indexId, token],
    queryFn: async () => {
      const res = await api<Record<string, unknown>>(
        `/api/ssi/indices/${encodeURIComponent(indexId)}/snapshot`,
        { auth: true },
      );
      const data = unwrapObject(res.data ?? res);
      const nav =
        res.nav ??
        data.nav ??
        data.NAV ??
        data.indexNav ??
        data.price ??
        data.last_price;
      const changeRaw =
        res.change24h ??
        res.change24hPct ??
        data["24h_change_pct"] ??
        data.change_pct_24h ??
        data.change24h ??
        data.changePct24h;
      // Backend normalizeSsiSnapshot already returns percent points. Do not ×100 again.
      const change24h =
        changeRaw != null && changeRaw !== "" ? Number(changeRaw) : undefined;
      return {
        nav: nav as number | string | undefined,
        aum: (res.aum ?? data.aum ?? data.AUM ?? data.tvl ?? data.market_cap) as
          | number
          | string
          | undefined,
        change24h: change24h != null && Number.isFinite(change24h) ? change24h : undefined,
        note: (res.note ?? data.note) as string | undefined,
        priceKind: (res.priceKind ?? "terminal_index_level") as string,
        onChainToken: res.onChainToken as
          | { symbol: string; address: string; basescan?: string }
          | null
          | undefined,
        indexId,
        raw: res,
      };
    },
    enabled: !!token && !!indexId,
    retry: false,
  });
}
export function useAiHealth() {
  return useQuery({
    queryKey: ["ai", "health"],
    queryFn: async () => {
      const res = await api<{
        metrics?: Record<string, unknown>;
        logs?: unknown[];
      }>("/api/ai/health");
      const metrics = res.metrics ?? {};
      return {
        provider: "Sonnet 5",
        models: ["Sonnet 5"],
        latencyMs: metrics.lastLatencyMs as number | undefined,
        circuit: metrics.circuit as string | undefined,
        raw: res,
      };
    },
    staleTime: 30_000,
  });
}
export function useDiag() {
  return useQuery({
    queryKey: ["diag"],
    queryFn: () => api<Record<string, unknown>>("/api/diag"),
    staleTime: 30_000,
  });
}
export function useSkillEvents() {
  const token = useToken();
  return useQuery({
    queryKey: ["skills", "events", token],
    queryFn: async () => {
      const res = await api<{ events?: SkillEvent[] } | SkillEvent[]>("/api/skills/events", {
        auth: true,
      });
      const events = Array.isArray(res) ? res : res.events ?? [];
      return { events };
    },
    enabled: !!token,
    retry: false,
  });
}

export function useVerifySodexAccount() {
  const [network] = useNetwork();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return api<{
        accountId: string;
        environment: string;
        enableTradingUrl?: string;
        portfolioUrl?: string;
      }>("/api/sodex/verify-account", {
        method: "POST",
        auth: true,
        body: { environment: network },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sodex"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
