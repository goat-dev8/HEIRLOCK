import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToken } from "@/lib/auth-store";
import { RequireAuth } from "@/components/app/require-auth";
import { Panel, PanelHeader, Stat } from "@/components/app/panel";
import { DataBadge } from "@/components/app/data-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiDrawer } from "@/components/app/ai-drawer-context";
import { ArrowUpRight, Brain, RefreshCw } from "lucide-react";
import { pctPoints, short, usd } from "@/lib/format";

export const Route = createFileRoute("/app/living")({
  head: () => ({
    meta: [{ title: "Home — HEIRLOCK" }, { name: "robots", content: "noindex" }],
  }),
  component: LivingPage,
});

function LivingPage() {
  const { openAi } = useAiDrawer();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Home</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Live SoSoValue evidence, one proposal, deterministic risk, then SSI allocate or SoDEX
            execute. Outcomes stay verifiable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => openAi()}>
            <Brain className="mr-1.5 h-3.5 w-3.5" />
            Ask AI
          </Button>
          <Link to="/app/wealth" search={{ tab: "trade" }}>
            <Button variant="secondary" size="sm">
              Open Wealth
            </Button>
          </Link>
        </div>
      </div>
      <RequireAuth>
        <LivingInner />
      </RequireAuth>
    </div>
  );
}

function AskAboutProposal({ title }: { title: string }) {
  const { openAi } = useAiDrawer();
  return (
    <Button
      variant="ghost"
      onClick={() =>
        openAi(
          title
            ? `Explain this proposal in plain language and what I should verify before acting: ${title}`
            : "Explain the current Family Office proposal and preflight.",
        )
      }
    >
      <Brain className="mr-1.5 h-3.5 w-3.5" />
      Ask about this
    </Button>
  );
}

function LivingInner() {
  const token = useToken();
  const q = useQuery({
    queryKey: ["fo", "living-loop", token],
    queryFn: () => api<Record<string, unknown>>("/api/fo/living-loop", { auth: true }),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  if (q.isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (q.isError) {
    return (
      <Panel className="p-8 text-sm text-muted-foreground">
        {(q.error as Error).message}
        <div className="mt-3">
          <Link to="/app/skills">
            <Button size="sm">Enable Family Office Skill</Button>
          </Link>
        </div>
      </Panel>
    );
  }

  const data = q.data ?? {};
  const citations = (data.citations as Array<{ source: string; status: string; endpoint: string }>) ?? [];
  const proposal = (data.proposal as Record<string, unknown>) ?? {};
  const preflight = (data.preflight as { verdict?: string; factors?: Array<Record<string, string>> }) ?? {};
  const index = (data.evidence as { indexSnapshot?: Record<string, unknown> })?.indexSnapshot;
  const tokenMeta = proposal.onChainToken as {
    symbol?: string;
    address?: string;
    basescan?: string;
    priceUsd?: number | null;
    change24hPct?: number | null;
  } | null;
  const drift = (data.drift ?? proposal.drift) as {
    alert?: boolean;
    driftPct?: number | null;
    signal?: string | null;
    action?: string;
    terminalChange24hPct?: number | null;
    tokenChange24hPct?: number | null;
    tokenPriceUsd?: number | null;
    onChain?: { pairUrl?: string | null } | null;
  } | null;

  const verdict = String(preflight.verdict ?? "CAUTION");
  const verdictTone =
    verdict === "APPROVE"
      ? "border-emerald-500/40 text-emerald-300"
      : verdict === "BLOCK"
        ? "border-red-500/40 text-red-300"
        : "border-amber-500/40 text-amber-200";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <DataBadge status={(data.status as "LIVE") || "LIVE"} />
        <Button size="sm" variant="ghost" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {drift?.alert && drift.signal ? (
        <Panel className="border-amber-500/40 bg-amber-500/5 p-5">
          <PanelHeader
            title="SSI drift signal"
            description="Terminal index 24h vs on-chain token 24h"
          />
          <p className="mt-2 text-sm text-foreground">{drift.signal}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Terminal 24h"
              value={pctPoints(drift.terminalChange24hPct)}
              hint="OpenAPI index"
            />
            <Stat
              label={`${tokenMeta?.symbol ?? "Token"} 24h`}
              value={pctPoints(drift.tokenChange24hPct)}
              hint={tokenMeta?.priceUsd != null ? usd(tokenMeta.priceUsd) : "Base market"}
            />
            <Stat
              label="Drift"
              value={drift.driftPct != null ? `${drift.driftPct.toFixed(1)}%` : "—"}
              hint="Absolute |Δ|"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={String(proposal.ssiAllocateUrl ?? "https://ssi.sosovalue.com")}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm">
                Allocate on SSI <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </a>
            <a
              href={String(proposal.ssiEarnUrl ?? "https://ssi.sosovalue.com/earn")}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm" variant="secondary">
                Stake / earn <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </a>
            <Link to="/app/wealth" search={{ tab: "trade" }}>
              <Button size="sm" variant="ghost">
                Trade proxy on SoDEX
              </Button>
            </Link>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Stat
          label="ssiMAG7 Terminal level"
          value={index?.nav != null ? usd(index.nav as number) : "Unavailable"}
          hint="OpenAPI index level"
        />
        <Stat label="24h" value={pctPoints(index?.change24h as number)} hint="Percent points" />
        <Stat
          label="Feeds LIVE"
          value={`${citations.filter((c) => c.status === "LIVE").length}/${citations.length}`}
          hint="ETF · news · macro · index"
        />
      </div>

      <Panel className="p-5">
        <PanelHeader title="Evidence" description="SoSoValue Terminal modules in the control path" />
        <div className="mt-3 flex flex-wrap gap-2">
          {citations.map((c) => (
            <span
              key={c.endpoint}
              className="inline-flex items-center gap-2 rounded-md border border-border/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide"
            >
              {c.source}
              <DataBadge status={c.status === "LIVE" ? "LIVE" : "UNAVAILABLE"} />
            </span>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Proposal" description={String(proposal.action ?? "")} />
        <div className="mt-2 font-display text-xl">{String(proposal.title ?? "")}</div>
        <p className="mt-2 text-sm text-muted-foreground">{String(proposal.rationale ?? "")}</p>
        {tokenMeta?.symbol ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            On-chain {tokenMeta.symbol} {short(tokenMeta.address)}{" "}
            {tokenMeta.basescan ? (
              <a href={tokenMeta.basescan} className="text-accent-1 hover:underline" target="_blank" rel="noreferrer">
                BaseScan
              </a>
            ) : null}
          </p>
        ) : null}
      </Panel>

      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PanelHeader title="Risk preflight" description="Deterministic — LLM cannot override" />
          <span className={`rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase ${verdictTone}`}>
            {verdict}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {(preflight.factors ?? []).map((f) => (
            <div
              key={f.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-surface-0/40 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{f.label}</div>
                <div className="text-xs text-muted-foreground">{f.detail}</div>
              </div>
              <DataBadge
                status={f.status === "ok" ? "LIVE" : f.status === "block" ? "UNAVAILABLE" : "SANDBOX"}
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/app/wealth" search={{ tab: "trade" }}>
            <Button disabled={verdict === "BLOCK"}>
              Confirm on SoDEX <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
          <a href={String(proposal.ssiAllocateUrl ?? "https://ssi.sosovalue.com")} target="_blank" rel="noreferrer">
            <Button variant="secondary">
              Allocate on SSI app <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </a>
          <AskAboutProposal title={String(proposal.title ?? "")} />
        </div>
      </Panel>
    </div>
  );
}
