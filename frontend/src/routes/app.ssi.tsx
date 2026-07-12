import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  head: () => ({ meta: [{ title: "SSI - HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: SsiPage,
});

const KNOWN = [
  "ssimag7",
  "ssilayer1",
  "ssidefi",
  "ssimeme",
  "ssiai",
  "ssirwa",
  "ssilayer2",
];

function SsiPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Smart Stable Index</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live SoSoValue index NAV and constituents. Mint / stake / vote happen on the official SSI
          app until Base addresses are verified.
        </p>
      </div>
      <div className="rounded-lg border border-border/60 bg-surface-1/70 px-4 py-3 text-sm text-muted-foreground">
        <span className="text-foreground">Flow:</span> pick an index → read NAV + weights here → open
        SSI app to allocate on Base → return to Portfolio / Trading for SoDEX execution.
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
        <Stat
          label="Data source"
          value={<span className="text-base">SoSoValue indices</span>}
          hint="OpenAPI"
        />
      </div>
      {anyNull && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5" />
          <span>
            On-chain router, staking and voting addresses are not yet verified on BaseScan. On-chain
            actions deep-link to the official SSI app; we do not invent addresses.
          </span>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={env.SSI.appUrl} target="_blank" rel="noreferrer">
          <Button size="sm">
            Open SSI app <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </a>
        <a href={env.SSI.earnUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant="ghost">
            Earn
          </Button>
        </a>
        <a href={env.SSI.rewardUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant="ghost">
            Reward
          </Button>
        </a>
      </div>
    </Panel>
  );
}

function Explorer() {
  const cfg = useSsiConfig();
  const defaults = (cfg.data?.knownIndices as string[] | undefined)?.length
    ? (cfg.data!.knownIndices as string[])
    : KNOWN;
  const initial = String(cfg.data?.defaultIndexId ?? "ssimag7");
  const [indexId, setIndexId] = useState(initial);
  const [query, setQuery] = useState(initial);
  const cons = useSsiConstituents(query);
  const snap = useSsiSnapshot(query);

  useEffect(() => {
    if (!cfg.data?.defaultIndexId) return;
    const d = String(cfg.data.defaultIndexId);
    setIndexId((prev) => (prev === "BTCX20" || prev === initial ? d : prev));
    setQuery((prev) => (prev === "BTCX20" || prev === initial ? d : prev));
  }, [cfg.data?.defaultIndexId, initial]);

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(indexId.trim().toLowerCase());
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-widest">Index ticker</Label>
            <Input
              value={indexId}
              onChange={(e) => setIndexId(e.target.value)}
              placeholder="ssimag7"
            />
          </div>
          <Button type="submit">Load</Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {defaults.slice(0, 8).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setIndexId(id);
                setQuery(id);
              }}
              className={
                "rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors " +
                (query === id
                  ? "border-accent-1/50 bg-accent-1/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground")
              }
            >
              {id}
            </button>
          ))}
        </div>
      </Panel>

      {snap.isError ? (
        <Panel className="p-6">
          <EmptyState
            icon={<LayoutGrid className="h-6 w-6" />}
            title="Snapshot unavailable"
            description={(snap.error as Error).message}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="NAV / price" value={snap.isLoading ? "…" : usd(snap.data?.nav)} hint={query} />
          <Stat
            label="AUM"
            value={
              snap.isLoading
                ? "…"
                : snap.data?.aum != null
                  ? usd(snap.data.aum, { compact: true })
                  : "Unavailable"
            }
            hint={snap.data?.note ?? "Not always in market-snapshot"}
          />
          <Stat
            label="Change 24h"
            value={
              snap.isLoading
                ? "…"
                : snap.data?.change24h != null
                  ? `${num(snap.data.change24h, 2)}%`
                  : "—"
            }
          />
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Constituents"
          description={`${query} · SoSoValue`}
          action={
            <Link to="/app/trading" className="text-xs text-muted-foreground hover:text-foreground">
              Trade proxies on SoDEX →
            </Link>
          }
        />
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
