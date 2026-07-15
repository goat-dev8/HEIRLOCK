import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSodexAccount, useSodexPortfolio, useAuthMe, useVerifySodexAccount } from "@/lib/api-hooks";
import { useNetwork } from "@/lib/network-store";
import { env } from "@/lib/env";
import { EmptyState, Panel, PanelHeader, Stat } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { num, usd } from "@/lib/format";
import { ArrowUpRight, Wallet, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/portfolio")({
  beforeLoad: () => {
    throw redirect({ to: "/app/wealth", search: { tab: "holdings" } });
  },
});

export function PortfolioInner() {
  const [network] = useNetwork();
  const me = useAuthMe();
  const account = useSodexAccount();
  const portfolio = useSodexPortfolio();
  const verify = useVerifySodexAccount();

  const verified = account.data?.verified;
  const sodexUrl = network === "mainnet" ? env.SODEX.mainnetAppUrl : env.SODEX.testnetAppUrl;

  if (account.isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!verified) {
    return (
      <Panel className="p-10">
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="SoDEX trading not enabled"
          description={
            <>
              HEIRLOCK is non-custodial. Enable trading on the official SoDEX app, then verify so we can
              store your aid. No shared keys, ever.
            </>
          }
          action={
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <a href={account.data?.enableTradingUrl ?? sodexUrl} target="_blank" rel="noreferrer">
                <Button>
                  Open SoDEX <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Button
                variant="secondary"
                disabled={verify.isPending}
                onClick={async () => {
                  try {
                    const res = await verify.mutateAsync();
                    toast.success(`Verified aid ${res.accountId}`);
                  } catch (e) {
                    toast.error((e as Error).message || "Verify failed");
                  }
                }}
              >
                {verify.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify account
              </Button>
              <a href="/app/wealth">
                <Button variant="ghost">Continue setup</Button>
              </a>
            </div>
          }
        />
      </Panel>
    );
  }

  if (portfolio.isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  const p = (portfolio.data ?? {}) as {
    balances?: Array<{
      asset: string;
      free?: string | number;
      locked?: string | number;
      total?: string | number;
      usdValue?: string | number | null;
    }>;
    orders?: unknown[];
    trades?: unknown[];
    totals?: { usd?: number | string | null; note?: string };
  };
  const balances = p.balances ?? [];
  const orders = p.orders ?? [];
  const trades = p.trades ?? [];
  const totals = p.totals;
  const totalUsd = totals?.usd ?? balances.reduce((s, b) => s + Number(b.usdValue ?? 0), 0);
  const hasUsd = balances.some((b) => b.usdValue != null) || (totals?.usd != null && Number(totals.usd) > 0);
  const cap = me.data?.wealthPolicy?.maxNotionalUsd ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Stat
          label="Portfolio value"
          value={hasUsd ? usd(totalUsd) : "Unavailable"}
          hint={totals?.note ?? `${balances.length} assets · live marks`}
        />
        <Stat label="Open orders" value={orders.length} hint="Signed by your wallet" />
        <Stat label="Policy cap" value={usd(cap)} hint="On-chain policy limit" />
      </div>
      <div className="rounded-xl border border-border/60 bg-surface-1/70 px-5 py-4 text-[15px] leading-relaxed text-muted-foreground">
        Enable Trading on SoDEX, verify once, then balances mark to USD here.{" "}
        <Link to="/app/wealth" search={{ tab: "trade" }} className="text-accent-1 hover:underline">
          Place a trade
        </Link>
      </div>

      <Panel>
        <PanelHeader
          title="Balances"
          description="From SoDEX, keyed to this wallet only."
          action={
            <a href={`${sodexUrl}/portfolio`} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">
                Open SoDEX <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </a>
          }
        />
        <div className="px-2 py-2">
          {balances.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No balances yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-2">Asset</th>
                  <th className="px-4 py-2 text-right">Free</th>
                  <th className="px-4 py-2 text-right">Locked</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {balances.map((b) => (
                  <tr key={b.asset} className="tabular-nums">
                    <td className="px-4 py-2.5 font-mono text-xs">{b.asset}</td>
                    <td className="px-4 py-2.5 text-right">{num(b.free, 6)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{num(b.locked, 6)}</td>
                    <td className="px-4 py-2.5 text-right">{num(b.total, 6)}</td>
                    <td className="px-4 py-2.5 text-right">{usd(b.usdValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Open orders" description="Live from SoDEX for this wallet." />
          <div className="overflow-x-auto px-2 py-2">
            {orders.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No open orders.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-3 py-2">Market</th>
                    <th className="px-3 py-2">Side</th>
                    <th className="px-3 py-2 text-right">Size</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {orders.map((o, i) => {
                    const row = o as Record<string, unknown>;
                    const key = String(row.orderID ?? row.orderId ?? row.id ?? i);
                    return (
                      <tr key={key} className="tabular-nums">
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {String(row.symbol ?? row.market ?? "—")}
                        </td>
                        <td className="px-3 py-2.5">{String(row.side ?? "—")}</td>
                        <td className="px-3 py-2.5 text-right">
                          {num(row.size as string | number | undefined ?? row.qty as string | number | undefined ?? row.orderQty as string | number | undefined, 6)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {num(row.price as string | number | undefined ?? row.avgPrice as string | number | undefined ?? row.px as string | number | undefined, 4)}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {String(row.status ?? row.ordStatus ?? "open")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Recent trades" description="Signed fills, most recent first." />
          <div className="overflow-x-auto px-2 py-2">
            {trades.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No trades yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-3 py-2">Market</th>
                    <th className="px-3 py-2">Side</th>
                    <th className="px-3 py-2 text-right">Size</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2">Id</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {trades.slice(0, 8).map((t, i) => {
                    const row = t as Record<string, unknown>;
                    const key = String(row.tradeID ?? row.tradeId ?? row.id ?? i);
                    return (
                      <tr key={key} className="tabular-nums">
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {String(row.symbol ?? row.market ?? "—")}
                        </td>
                        <td className="px-3 py-2.5">{String(row.side ?? "—")}</td>
                        <td className="px-3 py-2.5 text-right">
                          {num(row.size as string | number | undefined ?? row.qty as string | number | undefined ?? row.quantity as string | number | undefined, 6)}
                        </td>
                        <td className="px-3 py-2.5 text-right">{num(row.price as string | number | undefined ?? row.lastPx as string | number | undefined, 4)}</td>
                        <td className="max-w-[7rem] truncate px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                          {key}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>

      <Panel tone="accent" className="p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-accent-1" />
          <div className="text-[15px] leading-relaxed">
            <div className="font-medium text-foreground">
              Verified · <span className="capitalize text-muted-foreground">{network}</span>
            </div>
            <div className="mt-1.5 text-muted-foreground">
              Every order is signed in your wallet and checked against policy. Cap {usd(cap)}.
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}