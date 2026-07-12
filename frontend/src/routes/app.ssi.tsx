import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSsiConfig, useSsiConstituents, useSsiSnapshot } from "@/lib/api-hooks";
import { RequireAuth } from "@/components/app/require-auth";
import { EmptyState, Panel, PanelHeader, Stat } from "@/components/app/panel";
import { DataBadge } from "@/components/app/data-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { env } from "@/lib/env";
import { num, pctPoints, short, usd } from "@/lib/format";

export const Route = createFileRoute("/app/ssi")({
  head: () => ({ meta: [{ title: "SSI Skill — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: SsiPage,
});

const KNOWN = ["ssimag7", "ssidefi", "ssimeme", "ssilayer1", "ssilayer2", "ssiai", "ssirwa"];

function SsiPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            SSI Skill
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            SoSoValue Indexes
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Terminal index analytics in HEIRLOCK. Mint / stake / earn on the{" "}
            <a
              href="https://ssi.sosovalue.com/"
              target="_blank"
              rel="noreferrer"
              className="text-accent-1 underline-offset-2 hover:underline"
            >
              official SSI app
            </a>
            . Trade proxies on SoDEX.
          </p>
        </div>
        <DataBadge status="LIVE" />
      </div>

      <div className="rounded-lg border border-accent-1/30 bg-accent-1/5 px-4 py-3 text-sm">
        <div className="font-display text-sm font-medium text-foreground">Allocate flow</div>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Research Terminal index level + constituents here</li>
          <li>Open SSI app to allocate on Base (official mint / stake / earn)</li>
          <li>
            Return to{" "}
            <Link to="/app/trading" className="text-accent-1 hover:underline">
              Trading
            </Link>{" "}
            for SoDEX proxy execution
          </li>
        </ol>
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
  if (isLoading) return <Skeleton className="h-40 rounded-lg" />;
  if (!data) return null;

  const tokens = (data.indexTokens as Array<{ symbol: string; address: string; basescan?: string }>) ?? [];
  const contracts =
    (data.protocolContracts as Array<{ role: string; address: string; basescan?: string }>) ?? [];

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <PanelHeader title="Ecosystem" description="SOSO + Terminal" />
          <DataBadge status="LIVE" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Base chain" value={data.baseChainId} hint="Ethereum L2" />
          <Stat label="SOSO on Base" value={short(data.sosoTokenBase)} hint="ERC-20" />
          <Stat label="SOSO on Ethereum" value={short(data.sosoTokenEthereum)} hint="ERC-20" />
          <Stat
            label="Data source"
            value={<span className="text-base">Terminal OpenAPI</span>}
            hint="Index level ≠ token price"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={data.appUrl || env.SSI.appUrl} target="_blank" rel="noreferrer">
            <Button size="sm">
              Allocate on SSI app <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </a>
          <a href={(data as { earnUrl?: string }).earnUrl || env.SSI.earnUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary">
              Earn
            </Button>
          </a>
          <a href={(data as { rewardUrl?: string }).rewardUrl || env.SSI.rewardUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost">
              Reward
            </Button>
          </a>
          <a href={`${env.SSI.appUrl}/buy/MAG7.ssi`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost">
              MAG7.ssi Onchain Data
            </Button>
          </a>
        </div>
      </Panel>

      {tokens.length > 0 ? (
        <Panel className="p-5">
          <PanelHeader
            title="Index tokens (whitepaper)"
            description="Official Base ERC-20 addresses — §5.3 Key Addresses"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {tokens.map((t) => (
              <a
                key={t.symbol}
                href={t.basescan}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-md border border-border/50 bg-surface-0/50 px-3 py-2 text-sm hover:border-accent-1/40"
              >
                <span className="font-mono text-xs">{t.symbol}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{short(t.address, 6)}</span>
              </a>
            ))}
          </div>
        </Panel>
      ) : null}

      {contracts.length > 0 ? (
        <Panel className="p-5">
          <PanelHeader
            title="Protocol contracts (whitepaper)"
            description="swap · factory · issuer · rebalancer · feeManager · stakeFactory · assetLocking"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {contracts.map((c) => (
              <a
                key={c.role}
                href={c.basescan}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-md border border-border/50 bg-surface-0/50 px-3 py-2 text-sm hover:border-accent-1/40"
              >
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {c.role}
                </span>
                <span className="font-mono text-[11px]">{short(c.address, 6)}</span>
              </a>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ResearchHubVoting deploy address is omitted until officially listed. HEIRLOCK never invents
            it.
          </p>
        </Panel>
      ) : null}
    </div>
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

  const token = snap.data?.onChainToken;

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
            <Input value={indexId} onChange={(e) => setIndexId(e.target.value)} placeholder="ssimag7" />
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <DataBadge status={snap.isLoading ? "CACHED" : "LIVE"} />
            <span>Terminal index level (OpenAPI) — not the on-chain SSI token USD price</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat
              label="Terminal index level"
              value={snap.isLoading ? "…" : usd(snap.data?.nav)}
              hint={query}
            />
            <Stat
              label="AUM on Terminal snapshot"
              value={
                snap.isLoading
                  ? "…"
                  : snap.data?.aum != null
                    ? usd(snap.data.aum, { compact: true })
                    : "Unavailable"
              }
              hint={
                snap.data?.note ??
                "Not on market-snapshot — open SSI Onchain Data for TVL / holders"
              }
            />
            <Stat
              label="Change 24h"
              value={snap.isLoading ? "…" : pctPoints(snap.data?.change24h)}
              hint="Percent points from OpenAPI fraction"
            />
          </div>
          {token ? (
            <div className="rounded-lg border border-border/60 bg-surface-1/70 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    On-chain token (whitepaper)
                  </div>
                  <div className="mt-1 font-display text-lg">{token.symbol}</div>
                  <div className="font-mono text-xs text-muted-foreground">{short(token.address, 8)}</div>
                </div>
                <div className="flex gap-2">
                  {token.basescan ? (
                    <a href={token.basescan} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="secondary">
                        BaseScan <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </a>
                  ) : null}
                  <a href={`${env.SSI.appUrl}/buy/${token.symbol}`} target="_blank" rel="noreferrer">
                    <Button size="sm">
                      Buy on SSI <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Token market price (~$0.4 class for MAG7.ssi) differs from Terminal index level above.
              </p>
            </div>
          ) : null}
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Constituents"
          description={`${query} · SoSoValue Terminal`}
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
