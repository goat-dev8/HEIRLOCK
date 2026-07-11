import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSsiConfig, useSsiConstituents, useSsiSnapshot } from "@/lib/api-hooks";
import { RequireAuth } from "@/components/app/require-auth";
import { EmptyState, Panel, PanelHeader, Stat } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, LayoutGrid, ShieldAlert } from "lucide-react";
import { env } from "@/lib/env";
import { num, short, usd } from "@/lib/format";

export const Route = createFileRoute("/app/ssi")({
  head: () => ({ meta: [{ title: "SSI — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: SsiPage,
});

function SsiPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Allocation</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Smart Stable Index</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          On-chain data from SoSoValue's SSI. On-chain actions deep-link to the verified SSI app.
        </p>
      </div>
      <Config />
      <RequireAuth>
        <Explorer />
      </RequireAuth>
    </div>
  );
}

function Config() {
  const { data, isLoading } = useSsiConfig();
  if (isLoading) return <Skeleton className="h-32 rounded-lg" />;
  if (!data) return null;
  const anyNull = !data.onChain.router || !data.onChain.staking || !data.onChain.voting;
  return (
    <Panel className="p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Base chain" value={data.baseChainId} hint="Ethereum L2" />
        <Stat label="SOSO on Base" value={short(data.sosoTokenBase)} hint="ERC-20" />
        <Stat label="SOSO on Ethereum" value={short(data.sosoTokenEthereum)} hint="ERC-20" />
        <Stat label="Data source" value={<span className="text-base">{data.dataSource}</span>} hint="SoSoValue OpenAPI" />
      </div>
      {anyNull && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5" />
          <span>
            On-chain router, staking and voting addresses are not yet verified on BaseScan. On-chain actions
            deep-link to the official SSI app; we do not invent addresses.
          </span>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={env.SSI.appUrl} target="_blank" rel="noreferrer">
          <Button size="sm">Open SSI app <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" /></Button>
        </a>
        <a href={env.SSI.earnUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant="ghost">Earn</Button>
        </a>
        <a href={env.SSI.rewardUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant="ghost">Reward</Button>
        </a>
      </div>
    </Panel>
  );
}

function Explorer() {
  const [indexId, setIndexId] = useState("BTCX20");
  const [query, setQuery] = useState("BTCX20");
  const cons = useSsiConstituents(query);
  const snap = useSsiSnapshot(query);

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(indexId.trim());
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-widest">Index ID</Label>
            <Input value={indexId} onChange={(e) => setIndexId(e.target.value)} placeholder="e.g. BTCX20" />
          </div>
          <Button type="submit">Load</Button>
        </form>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="NAV" value={snap.isLoading ? "…" : usd(snap.data?.nav)} hint={query} />
        <Stat label="AUM" value={snap.isLoading ? "…" : usd(snap.data?.aum, { compact: true })} />
        <Stat label="Change 24h" value={snap.isLoading ? "…" : `${num(snap.data?.change24h, 2)}%`} />
      </div>

      <Panel>
        <PanelHeader title="Constituents" description={`${query} · SoSoValue`} />
        {cons.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-md" />
            ))}
          </div>
        ) : cons.error ? (
          <div className="p-6">
            <EmptyState
              icon={<LayoutGrid className="h-6 w-6" />}
              title="Index not available"
              description={(cons.error as Error).message}
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2 text-right">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {(cons.data?.constituents ?? []).map((c) => (
                <tr key={c.symbol}>
                  <td className="px-4 py-2 font-mono">{c.symbol}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.name ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <Badge variant="outline" className="font-mono">
                      {c.weight != null ? `${num(c.weight, 2)}%` : "—"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}