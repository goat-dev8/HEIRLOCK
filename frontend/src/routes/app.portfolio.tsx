import { createFileRoute, Link } from "@tanstack/react-router";
import { useSodexAccount, useSodexPortfolio, useAuthMe, useVerifySodexAccount } from "@/lib/api-hooks";
import { useNetwork } from "@/lib/network-store";
import { env } from "@/lib/env";
import { EmptyState, Panel, PanelHeader, Stat } from "@/components/app/panel";
import { RequireAuth } from "@/components/app/require-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { num, usd } from "@/lib/format";
import { ArrowUpRight, Wallet, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: PortfolioPage,
});

function PortfolioPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortfolioHeader />
      <RequireAuth>
        <PortfolioInner />
      </RequireAuth>
    </div>
  );
}

function PortfolioHeader() {
  const [network] = useNetwork();
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live SoDEX balances on {network}. Non-custodial.
        </p>
      </div>
    </div>
  );
}

function PortfolioInner() {
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
              <a href="/app/onboarding">
                <Button variant="ghost">View onboarding</Button>
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

  const p = portfolio.data ?? {};
  const balances = p.balances ?? [];
  const orders = p.orders ?? [];
  const trades = p.trades ?? [];
  const totals = p.totals as { usd?: number | string | null; note?: string } | undefined;
  const totalUsd = totals?.usd ?? balances.reduce((s, b) => s + Number(b.usdValue ?? 0), 0);
  const hasUsd = balances.some((b) => b.usdValue != null) || (totals?.usd != null && Number(totals.usd) > 0);
  const cap = me.data?.wealthPolicy?.maxNotionalUsd ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Stat
          label="Portfolio value"
          value={hasUsd ? usd(totalUsd) : "Unavailable"}
          hint={totals?.note ?? `${balances.length} assets · SoDEX lastPx marks`}
        />
        <Stat label="Open orders" value={orders.length} hint="Signed by your wallet" />
        <Stat label="Policy cap" value={usd(cap)} hint="On-chain WealthPolicy" />
      </div>
      <div className="rounded-lg border border-border/60 bg-surface-1/70 px-4 py-3 text-sm text-muted-foreground">
        <span className="text-foreground">Flow:</span> Enable Trading on SoDEX → Verify aid → balances
        mark to USD via spot tickers (vUSDC = $1).{" "}
        <Link to="/app/trading" className="text-accent-1 hover:underline">
          Trade
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
          <div className="p-4 text-sm text-muted-foreground">
            {orders.length === 0 ? "No open orders." : <pre className="max-h-72 overflow-auto font-mono text-[11px]">{JSON.stringify(orders, null, 2)}</pre>}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Recent trades" description="Signed fills, most recent first." />
          <div className="p-4 text-sm text-muted-foreground">
            {trades.length === 0 ? "No trades yet." : <pre className="max-h-72 overflow-auto font-mono text-[11px]">{JSON.stringify(trades, null, 2)}</pre>}
          </div>
        </Panel>
      </div>

      <Panel tone="accent" className="p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-accent-1" />
          <div className="text-sm">
            <div className="font-medium text-foreground">Verified account · <Badge variant="outline" className="ml-1 font-mono text-[10px]">{network}</Badge></div>
            <div className="mt-1 text-muted-foreground">
              aid <span className="font-mono text-xs">{account.data?.aid ?? "—"}</span>. Every order you place is signed
              client-side with EIP-712 and relayed under policy. Mainnet notional is capped at {usd(cap)}.
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}