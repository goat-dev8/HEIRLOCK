import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useNetwork } from "@/lib/network-store";
import { useSodexSymbols, useSodexOrderbook, useSodexAccount, useSodexGateways, useVerifySodexAccount } from "@/lib/api-hooks";
import { api } from "@/lib/api";
import { EmptyState, Panel, PanelHeader, Stat } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { num, usd } from "@/lib/format";
import { AlertTriangle, ArrowUpRight, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useSignTypedData } from "wagmi";
import { env } from "@/lib/env";
import type { Hex } from "viem";
import {
  buildExchangeDomain,
  computePayloadHash,
  exchangeActionTypes,
  toTypedApiSign,
} from "@/lib/sodex-sign";

export const Route = createFileRoute("/app/trading")({
  beforeLoad: () => {
    throw redirect({ to: "/app/wealth", search: { tab: "trade" } });
  },
});

export function TradingWorkspace() {
  const [network] = useNetwork();
  const [market, setMarket] = useState<"spot" | "perps">("spot");
  const symbols = useSodexSymbols(network, market);
  const account = useSodexAccount();
  const gateways = useSodexGateways(network);
  const verify = useVerifySodexAccount();
  const [symbol, setSymbol] = useState<string | undefined>(undefined);
  const list = symbols.data?.symbols ?? [];
  const active = list.find((s) => s.symbol === symbol) ?? list[0];
  const activeSymbol = active?.symbol;
  const orderbook = useSodexOrderbook(network, market, activeSymbol);

  const cap = gateways.data?.mainnetMaxNotionalUsd ?? 1;

  if (!account.data?.verified) {
    const sodexUrl = network === "mainnet" ? env.SODEX.mainnetAppUrl : env.SODEX.testnetAppUrl;
    return (
      <Panel className="p-10">
        <EmptyState
          icon={<TrendingUp className="h-8 w-8" />}
          title="Enable SoDEX trading first"
          description="Open official SoDEX, Enable Trading with this wallet, then verify here so HEIRLOCK can store your aid."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <a href={account.data?.enableTradingUrl ?? sodexUrl} target="_blank" rel="noreferrer">
                <Button>Open SoDEX <ArrowUpRight className="ml-2 h-4 w-4" /></Button>
              </a>
              <Button
                variant="secondary"
                disabled={verify.isPending}
                onClick={async () => {
                  try {
                    const res = await verify.mutateAsync();
                    toast.success(`Verified aid ${res.accountId}`);
                  } catch (e) {
                    toast.error((e as Error).message || "Verify failed — Enable Trading first");
                  }
                }}
              >
                {verify.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify account
              </Button>
            </div>
          }
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={market} onValueChange={(v) => setMarket(v as "spot" | "perps")}>
          <TabsList>
            <TabsTrigger value="spot">Spot</TabsTrigger>
            <TabsTrigger value="perps">Perps</TabsTrigger>
          </TabsList>
        </Tabs>
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          {network}
        </Badge>
        {network === "mainnet" && (
          <Badge className="border-warning/40 bg-warning/10 text-warning font-mono text-[10px] uppercase">
            Mainnet cap {usd(cap)}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_360px]">
        <Panel>
          <PanelHeader title="Markets" description="SoDEX symbols" />
          <div className="max-h-[520px] overflow-y-auto">
            {symbols.isLoading ? (
              <div className="space-y-1 p-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 rounded-md" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No symbols returned.</div>
            ) : (
              <ul className="divide-y divide-border/40 text-sm">
                {list.map((s) => (
                  <li key={s.symbol}>
                    <button
                      onClick={() => setSymbol(s.symbol)}
                      className={
                        "flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors " +
                        (activeSymbol === s.symbol
                          ? "bg-surface-2 text-foreground"
                          : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground")
                      }
                    >
                      <span className="font-mono">{s.displayName ?? s.symbol}</span>
                      <span className="tabular-nums text-xs">{s.price ? usd(s.price) : "—"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title={activeSymbol ?? "Select a market"}
            description={`${market.toUpperCase()} · ${network}`}
          />
          <div className="grid grid-cols-2 gap-3 p-4 text-xs">
            <div>
              <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Bids</span>
                <span>Size</span>
              </div>
              <BookSide side="bid" rows={orderbook.data?.bids ?? []} loading={orderbook.isLoading} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Asks</span>
                <span>Size</span>
              </div>
              <BookSide side="ask" rows={orderbook.data?.asks ?? []} loading={orderbook.isLoading} />
            </div>
          </div>
        </Panel>

        <OrderTicket
          symbol={activeSymbol}
          symbolID={active?.id}
          market={market}
          network={network}
          cap={cap}
          lastPrice={active?.price}
        />
      </div>
    </div>
  );
}

function BookSide({
  rows,
  loading,
  side,
}: {
  rows: Array<[string | number, string | number]>;
  loading: boolean;
  side: "bid" | "ask";
}) {
  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-5 rounded" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <div className="py-4 text-center text-muted-foreground">—</div>;
  const maxSize = Math.max(...rows.slice(0, 12).map((r) => Number(r[1])));
  return (
    <div className="space-y-0.5 font-mono text-[11px] tabular-nums">
      {rows.slice(0, 12).map((r, i) => {
        const pct = (Number(r[1]) / (maxSize || 1)) * 100;
        return (
          <div key={i} className="relative flex justify-between rounded px-1.5 py-0.5">
            <div
              className={
                "absolute inset-y-0 " +
                (side === "bid" ? "left-0 bg-success/10" : "right-0 bg-destructive/10")
              }
              style={{ width: `${pct}%` }}
            />
            <span className={"relative " + (side === "bid" ? "text-success" : "text-destructive")}>
              {num(r[0], 4)}
            </span>
            <span className="relative text-foreground/80">{num(r[1], 4)}</span>
          </div>
        );
      })}
    </div>
  );
}

function OrderTicket({
  symbol,
  symbolID,
  market,
  network,
  cap,
  lastPrice,
}: {
  symbol?: string;
  symbolID?: number;
  market: "spot" | "perps";
  network: "mainnet" | "testnet";
  cap: number;
  lastPrice?: number | string;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");

  useEffect(() => {
    if (lastPrice != null && Number(lastPrice) > 0) {
      setPrice(String(lastPrice));
    } else {
      setPrice("");
    }
    setSize("");
  }, [symbol, lastPrice]);
  const [preparing, setPreparing] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [proof, setProof] = useState<{
    orderId?: string;
    sodexOrderId?: string;
    relayId?: string;
    portfolioUrl: string;
  } | null>(null);
  const [prepared, setPrepared] = useState<{
    params: unknown;
    actionType: string;
    suggestedNonce: string;
    notionalUsd: number;
  } | null>(null);
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const sodexPortfolioUrl =
    network === "mainnet" ? `${env.SODEX.mainnetAppUrl}/portfolio` : `${env.SODEX.testnetAppUrl}/portfolio`;

  const notional = useMemo(() => {
    const n = Number(price) * Number(size);
    return Number.isFinite(n) ? n : 0;
  }, [price, size]);

  const overCap = network === "mainnet" && notional > cap;

  async function prepare() {
    if (!symbol || !address || !symbolID) {
      toast.error("Select a market with a valid symbolID");
      return;
    }
    setPreparing(true);
    setPrepared(null);
    try {
      const res = await api<{
        ok?: boolean;
        reason?: string;
        params?: unknown;
        actionType?: string;
        suggestedNonce?: string | number;
        effectiveCapUsd?: number;
      }>("/api/sodex/orders/prepare", {
        method: "POST",
        auth: true,
        body: {
          environment: network,
          market,
          symbolID,
          side: side === "buy" ? 1 : 2,
          type: 1,
          timeInForce: 1,
          price,
          quantity: size,
          notionalUsd: notional,
        },
      });
      if (res.ok === false) {
        throw new Error(res.reason || "Policy blocked");
      }
      if (!res.params || !res.actionType) {
        throw new Error("Prepare response missing params/actionType");
      }
      setPrepared({
        params: res.params,
        actionType: res.actionType,
        suggestedNonce: String(res.suggestedNonce ?? Date.now()),
        notionalUsd: notional,
      });
      toast.success("Order prepared. Sign EIP-712 ExchangeAction to place.");
    } catch (e) {
      toast.error((e as Error).message || "Prepare failed");
    } finally {
      setPreparing(false);
    }
  }

  async function signAndPlace() {
    if (!prepared || !address) return;
    setPlacing(true);
    try {
      const nonce = BigInt(prepared.suggestedNonce);
      const payloadHash = computePayloadHash(prepared.actionType, prepared.params);
      const domain = buildExchangeDomain(market, network);
      const rawSig = (await signTypedDataAsync({
        domain,
        types: exchangeActionTypes,
        primaryType: "ExchangeAction",
        message: { payloadHash, nonce },
      })) as Hex;
      const apiSign = toTypedApiSign(rawSig);
      const res = await api<{
        orderId?: string;
        sodexOrderId?: string;
        proofUrl?: string;
        relayId?: string;
        id?: string;
        status?: string;
        fillProof?: { note?: string; tradeIds?: string[]; status?: string };
      }>("/api/sodex/orders/place", {
          method: "POST",
          auth: true,
          body: {
            environment: network,
            market,
            params: prepared.params,
            apiSign,
            apiNonce: prepared.suggestedNonce,
            notionalUsd: prepared.notionalUsd,
            side,
          },
        });
      const sodexOrderId = res.sodexOrderId ?? res.orderId;
      const relayId = res.relayId ?? res.id;
      setProof({
        orderId: res.orderId,
        sodexOrderId,
        relayId,
        portfolioUrl: sodexPortfolioUrl,
      });
      try {
        await api("/api/fo/track", {
          method: "POST",
          auth: true,
          body: {
            kind: "sodex_fill",
            thesis: `${side.toUpperCase()} ${symbol} under Family Office policy`,
            symbol,
            orderId: res.orderId ?? sodexOrderId,
            relayId: sodexOrderId ?? relayId,
            outcome: res.status === "filled" ? "HIT" : "PENDING",
          },
        });
      } catch {
        /* track is best-effort */
      }
      if (res.status === "filled") {
        const tradeN = res.fillProof?.tradeIds?.length ?? 0;
        toast.success(
          tradeN > 0
            ? `Fill verified · ${tradeN} trade(s)${sodexOrderId ? ` · ${sodexOrderId}` : ""}`
            : `Fill verified${sodexOrderId ? ` · ${sodexOrderId}` : ""}`,
        );
      } else if (res.status === "partial") {
        toast.success(`Partial fill verified${sodexOrderId ? ` · ${sodexOrderId}` : ""}`);
      } else {
        toast.message(
          res.fillProof?.note ??
            `Submitted${sodexOrderId ? ` · ${sodexOrderId}` : ""} — awaiting fill evidence`,
        );
      }
      setPrepared(null);
      setSize("");
    } catch (e) {
      toast.error((e as Error).message || "Place failed");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Order ticket"
        description={
          symbol
            ? `${side.toUpperCase()} ${symbol}${symbolID ? ` · id ${symbolID}` : ""}`
            : "Select a market"
        }
      />
      <div className="space-y-3 p-4">
        <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
          <TabsList className="w-full">
            <TabsTrigger value="buy" className="flex-1 data-[state=active]:text-success">
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="flex-1 data-[state=active]:text-destructive">
              Sell
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-widest">Price</Label>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-widest">Quantity</Label>
          <Input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="font-mono"
          />
        </div>

        <Stat
          label="Notional"
          value={usd(notional)}
          hint={network === "mainnet" ? `Cap ${usd(cap)}` : "No cap on testnet"}
        />

        {overCap && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
            <span>
              Notional exceeds mainnet cap of {usd(cap)}. Reduce size or switch to testnet.
            </span>
          </div>
        )}

        {!prepared ? (
          <Button
            className="w-full"
            onClick={prepare}
            disabled={preparing || overCap || !symbol || !symbolID || !price || !size}
          >
            {preparing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Prepare order
          </Button>
        ) : (
          <Button className="w-full" onClick={signAndPlace} disabled={placing}>
            {placing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign & place
          </Button>
        )}

        <div className="pt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          EIP-712 ExchangeAction · 0x01 apiSign · non-custodial
        </div>
      

        {proof ? (
          <div className="mt-3 rounded-md border border-accent-1/30 bg-accent-1/5 p-3 text-sm">
            <div className="font-display text-sm font-medium">Fill proof</div>
            <div className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
              {proof.relayId ? <div>Relay audit: {proof.relayId}</div> : null}
              {proof.sodexOrderId ? <div>SoDEX orderID: {proof.sodexOrderId}</div> : null}
            </div>
            <a href={proof.portfolioUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block">
              <Button size="sm" variant="secondary">
                Open SoDEX Portfolio history <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </a>
            <p className="mt-2 text-[11px] text-muted-foreground">
              CLOB fills settle on SoDEX — never treat a relay UUID as a ValueChain explorer tx.
            </p>
          </div>
        ) : null}
</div>
    </Panel>
  );
}