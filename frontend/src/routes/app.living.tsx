import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToken } from "@/lib/auth-store";
import { RequireAuth } from "@/components/app/require-auth";
import { Panel, PanelHeader, Stat } from "@/components/app/panel";
import { DataBadge } from "@/components/app/data-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAiDrawer } from "@/components/app/ai-drawer-context";
import {
  ArrowUpRight,
  Brain,
  ChevronDown,
  Clock3,
  History,
  RefreshCw,
  ShieldQuestion,
} from "lucide-react";
import { toast } from "sonner";
import { pctPoints, relTime, usd } from "@/lib/format";

export const Route = createFileRoute("/app/living")({
  head: () => ({
    meta: [{ title: "Home — HEIRLOCK Partner" }, { name: "robots", content: "noindex" }],
  }),
  component: LivingPage,
});

type Citation = { source: string; endpoint: string; at: string; status: string };
type Proposal = {
  action?: string;
  title?: string;
  rationale?: string;
  indexLevel?: number | null;
  change24hPct?: number | null;
  onChainToken?: {
    symbol?: string;
    address?: string;
    basescan?: string;
    priceUsd?: number | null;
    change24hPct?: number | null;
  } | null;
  ssiAllocateUrl?: string;
  ssiEarnUrl?: string;
};
type Drift = {
  alert?: boolean;
  driftPct?: number | null;
  signal?: string | null;
  terminalChange24hPct?: number | null;
  tokenChange24hPct?: number | null;
};
type Brief = {
  status: string;
  headline: string;
  rationale?: string;
  proposal: Proposal;
  drift: Drift | null;
  preflight: { verdict?: string; factors?: Array<{ id: string; label: string; status: string; detail: string }> };
  citations: Citation[];
  openTheses: Array<{ id: string; statement: string; status: string; confidence: number; createdAt: string }>;
  whatChanged: { status: string; deltaCount: number; topDeltas: Array<{ field: string; from: unknown; to: unknown }> };
  choices: Array<{ id: string; label: string; description: string }>;
  ts: string;
};
type TimelineEntry = {
  id: string;
  type: "decision" | "track" | "order";
  at: string;
  title: string;
  detail: string | null;
  outcome: string | null;
};

function LivingPage() {
  const { openAi } = useAiDrawer();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Verified Investment Partner
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Home</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            It remembers every thesis, challenges itself with live evidence, and only acts after you approve.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => openAi()}>
          <Brain className="mr-1.5 h-3.5 w-3.5" />
          Talk to Partner
        </Button>
      </div>
      <RequireAuth>
        <PartnerInner />
      </RequireAuth>
    </div>
  );
}

function PartnerInner() {
  const token = useToken();
  const { openAi } = useAiDrawer();
  const qc = useQueryClient();
  const [whyOpen, setWhyOpen] = useState(false);

  const brief = useQuery({
    queryKey: ["fo", "partner", "brief", token],
    queryFn: () => api<Brief>("/api/fo/partner/brief", { auth: true }),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  const timeline = useQuery({
    queryKey: ["fo", "partner", "timeline", "recent", token],
    queryFn: () => api<{ entries: TimelineEntry[] }>("/api/fo/partner/timeline", { auth: true }),
    enabled: !!token,
    staleTime: 30_000,
  });

  const decide = useMutation({
    mutationFn: (input: {
      actionType: "hold" | "ssi_allocate" | "sodex_trade" | "wait";
      userChoice: "approved" | "rejected" | "deferred";
    }) =>
      api("/api/fo/partner/decision", {
        method: "POST",
        auth: true,
        body: {
          actionType: input.actionType,
          userChoice: input.userChoice,
          proposal: brief.data?.proposal ?? {},
          citations: brief.data?.citations ?? [],
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fo", "partner", "timeline"] });
    },
    onError: (e) => toast.error((e as Error).message || "Could not record decision"),
  });

  if (brief.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (brief.isError) {
    return (
      <Panel className="p-8 text-sm text-muted-foreground">
        {(brief.error as Error).message}
        <div className="mt-3">
          <Link to="/app/skills">
            <Button size="sm">Enable Family Office Skill</Button>
          </Link>
        </div>
      </Panel>
    );
  }

  const data = brief.data!;
  const { proposal, drift, preflight, citations, openTheses, whatChanged } = data;
  const verdict = String(preflight.verdict ?? "CAUTION");
  const verdictTone =
    verdict === "APPROVE"
      ? "border-emerald-500/40 text-emerald-300"
      : verdict === "BLOCK"
        ? "border-red-500/40 text-red-300"
        : "border-amber-500/40 text-amber-200";
  const liveCount = citations.filter((c) => c.status === "LIVE").length;
  const primaryActionType = drift?.alert ? "ssi_allocate" : "hold";

  function approve() {
    decide.mutate({ actionType: primaryActionType, userChoice: "approved" });
    if (drift?.alert && proposal.ssiAllocateUrl) {
      window.open(proposal.ssiAllocateUrl, "_blank", "noreferrer");
    }
    toast.success("Approved — recorded in Investment Memory");
  }

  function challenge() {
    decide.mutate({ actionType: primaryActionType, userChoice: "rejected" });
    openAi(
      `Challenge this proposal: "${proposal.title}". ${proposal.rationale ?? ""} What evidence would change your mind, and does it still hold?`,
    );
  }

  function wait() {
    decide.mutate({ actionType: "wait", userChoice: "deferred" });
    toast.success("Logged to revisit later — see Memory");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <DataBadge status={(data.status as "LIVE") || "LIVE"} />
        <span className="text-xs text-muted-foreground">Updated {relTime(data.ts)}</span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => brief.refetch()}
          disabled={brief.isFetching}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${brief.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* What matters */}
      <Panel tone="accent" className="p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-1">What matters now</div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-snug tracking-tight text-foreground">
          {data.headline}
        </h2>
        {data.rationale ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{data.rationale}</p>
        ) : null}

        {/* Why */}
        <Collapsible open={whyOpen} onOpenChange={setWhyOpen} className="mt-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-1 hover:underline"
            >
              <ShieldQuestion className="h-3.5 w-3.5" />
              Why? {liveCount}/{citations.length} sources LIVE
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${whyOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {citations.map((c) => (
                <span
                  key={c.endpoint}
                  className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-surface-0/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide"
                >
                  {c.source}
                  <DataBadge status={c.status === "LIVE" ? "LIVE" : "UNAVAILABLE"} />
                </span>
              ))}
            </div>
            {drift?.signal ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Terminal 24h" value={pctPoints(drift.terminalChange24hPct)} hint="OpenAPI index" />
                <Stat
                  label={`${proposal.onChainToken?.symbol ?? "Token"} 24h`}
                  value={pctPoints(drift.tokenChange24hPct)}
                  hint={proposal.onChainToken?.priceUsd != null ? usd(proposal.onChainToken.priceUsd) : "Base market"}
                />
                <Stat
                  label="Drift"
                  value={drift.driftPct != null ? `${drift.driftPct.toFixed(1)}%` : "—"}
                  hint="Absolute |Δ|"
                />
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Deterministic risk preflight — LLM cannot override.{" "}
              <span className={`ml-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${verdictTone}`}>
                {verdict}
              </span>
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Choose */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={approve} disabled={verdict === "BLOCK" || decide.isPending}>
            Approve <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
          <Button variant="secondary" onClick={challenge} disabled={decide.isPending}>
            <Brain className="mr-1.5 h-3.5 w-3.5" />
            Challenge
          </Button>
          <Button variant="ghost" onClick={wait} disabled={decide.isPending}>
            <Clock3 className="mr-1.5 h-3.5 w-3.5" />
            Wait
          </Button>
          <Link to="/app/wealth" search={{ tab: "trade" }} className="ml-auto">
            <Button variant="ghost" size="sm">
              Open Wealth
            </Button>
          </Link>
        </div>
      </Panel>

      {whatChanged.deltaCount > 0 ? (
        <Panel className="p-5">
          <PanelHeader
            title="What changed since yesterday"
            description={`${whatChanged.deltaCount} change${whatChanged.deltaCount === 1 ? "" : "s"} in the daily digest`}
          />
          <ul className="mt-2 space-y-1.5 px-1">
            {whatChanged.topDeltas.map((d) => (
              <li key={d.field} className="text-sm text-muted-foreground">
                <span className="font-mono text-xs text-foreground">{d.field}</span>: {String(d.from)} →{" "}
                <span className="text-foreground">{String(d.to)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {openTheses.length > 0 ? (
        <Panel className="p-5">
          <PanelHeader title="Open theses" description="Beliefs your Partner is tracking" />
          <div className="mt-3 space-y-2">
            {openTheses.slice(0, 4).map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/40 bg-surface-0/40 px-3 py-2"
              >
                <div className="text-sm">{t.statement}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{t.confidence}%</span>
                  <Button size="sm" variant="ghost" onClick={() => openAi(`Challenge this thesis: "${t.statement}"`, t.id)}>
                    Challenge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* Learn */}
      <Panel className="p-5">
        <PanelHeader
          title="Learn"
          description="Decision Timeline — proposal, choice, outcome"
          action={
            <Link to="/app/memory">
              <Button size="sm" variant="ghost">
                <History className="mr-1.5 h-3.5 w-3.5" />
                Open Memory
              </Button>
            </Link>
          }
        />
        {timeline.isLoading ? (
          <div className="p-4">
            <Skeleton className="h-16 rounded-md" />
          </div>
        ) : (timeline.data?.entries ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No decisions yet — approve, challenge, or wait on a proposal above to start the timeline.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {(timeline.data?.entries ?? []).slice(0, 5).map((e) => (
              <div key={`${e.type}-${e.id}`} className="flex flex-wrap items-start justify-between gap-3 px-1 py-3">
                <div>
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    {e.type} · {relTime(e.at)}
                  </div>
                  <div className="text-sm">{e.title}</div>
                  {e.detail ? <div className="mt-0.5 text-xs text-muted-foreground">{e.detail}</div> : null}
                </div>
                <span className="rounded-md border border-border/50 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                  {e.outcome ?? "PENDING"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
