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
  Radar,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { pctPoints, relTime, usd } from "@/lib/format";

export const Route = createFileRoute("/app/living")({
  head: () => ({
    meta: [{ title: "Decide — HEIRLOCK Partner" }, { name: "robots", content: "noindex" }],
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
type FalsifyAlert = {
  thesisId: string;
  statement: string;
  severity: "watch" | "pressure" | "broken";
  reason: string;
  killConditions: string[];
  suggestedStatus: "challenged" | "invalidated" | null;
};
type RadarItem = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  urgency: "now" | "soon" | "background";
  actionHint: string;
};
type Brief = {
  status: string;
  product?: string;
  headline: string;
  rationale?: string;
  proposal: Proposal;
  drift: Drift | null;
  preflight: { verdict?: string; factors?: Array<{ id: string; label: string; status: string; detail: string }> };
  citations: Citation[];
  dna?: {
    archetype: string;
    tagline: string;
    stats: {
      decisions: number;
      approveRate: number;
      challengeRate: number;
      waitRate: number;
      hitRate: number | null;
      openTheses: number;
      avgConfidence: number | null;
    };
  };
  falsify?: FalsifyAlert[];
  radar?: RadarItem[];
  openTheses: Array<{ id: string; statement: string; status: string; confidence: number; createdAt: string }>;
  whatChanged: { status: string; deltaCount: number; topDeltas: Array<{ field: string; from: unknown; to: unknown }> };
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
type DebateResult = {
  status: string;
  counsel: { content: string };
  falsifier: { content: string };
  synthesis: { stance: string; confidence: number; summary: string };
  latencyMs: number;
};

function LivingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Falsifying Partner
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Decide</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Understand → Debate → Choose → Verify → Learn. The AI tries to kill your theses before you act.
        </p>
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
  const [debate, setDebate] = useState<DebateResult | null>(null);
  const [replayId, setReplayId] = useState<string | null>(null);
  const [replayText, setReplayText] = useState<string | null>(null);

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
      qc.invalidateQueries({ queryKey: ["fo", "partner", "brief"] });
    },
    onError: (e) => toast.error((e as Error).message || "Could not record decision"),
  });

  const runDebate = useMutation({
    mutationFn: () =>
      api<DebateResult>("/api/fo/partner/debate", {
        method: "POST",
        auth: true,
        timeoutMs: 170_000,
        body: {},
      }),
    onSuccess: (res) => {
      setDebate(res);
      toast.success(`Debate ready — ${res.synthesis.stance.toUpperCase()}`);
    },
    onError: (e) => toast.error((e as Error).message || "Debate failed"),
  });

  const runReplay = useMutation({
    mutationFn: (decisionId: string) =>
      api<{ replay: { todayVerdict: string; reason: string; thenChoice: string | null } }>(
        `/api/fo/partner/replay?decisionId=${encodeURIComponent(decisionId)}`,
        { auth: true },
      ),
    onSuccess: (res, id) => {
      setReplayId(id);
      setReplayText(`${res.replay.todayVerdict.replace(/_/g, " ")} — ${res.replay.reason}`);
    },
    onError: (e) => toast.error((e as Error).message || "Replay failed"),
  });

  if (brief.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-24 rounded-lg" />
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
  const { proposal, drift, preflight, citations, openTheses, whatChanged, dna, falsify, radar } = data;
  const verdict = String(preflight.verdict ?? "CAUTION");
  const verdictTone =
    verdict === "APPROVE"
      ? "border-emerald-500/40 text-emerald-300"
      : verdict === "BLOCK"
        ? "border-red-500/40 text-red-300"
        : "border-amber-500/40 text-amber-200";
  const liveCount = citations.filter((c) => c.status === "LIVE").length;
  const primaryActionType = drift?.alert ? "ssi_allocate" : "hold";
  const debateStance = debate?.synthesis.stance;
  const approveBlockedByDebate = debateStance === "challenge" || debateStance === "wait";

  function approve() {
    if (debate && approveBlockedByDebate) {
      toast.error("Debate recommends Challenge or Wait — override only if you accept the risk");
    }
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
    toast.success("Logged to revisit later");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <DataBadge status={(data.status as "LIVE") || "LIVE"} />
        <span className="text-xs text-muted-foreground">Updated {relTime(data.ts)}</span>
        {dna ? (
          <span className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-surface-2/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent-1">
            <Sparkles className="h-3 w-3" />
            DNA · {dna.archetype}
          </span>
        ) : null}
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

      {dna ? (
        <p className="text-xs text-muted-foreground">
          {dna.tagline}{" "}
          <span className="font-mono text-[10px] uppercase">
            · {dna.stats.decisions} decisions · {dna.stats.challengeRate}% challenge ·{" "}
            {dna.stats.openTheses} open theses
          </span>
        </p>
      ) : null}

      {/* Decision surface */}
      <Panel tone="accent" className="p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-1">
          1 · Understand
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-snug tracking-tight text-foreground">
          {data.headline}
        </h2>
        {data.rationale ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{data.rationale}</p>
        ) : null}

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
      </Panel>

      {/* Falsify */}
      {(falsify ?? []).length > 0 ? (
        <Panel className="border-amber-500/30 p-5">
          <PanelHeader
            title="2 · What would kill this"
            description="Falsification pressure on open theses — kill conditions vs live evidence"
          />
          <div className="mt-3 space-y-3">
            {(falsify ?? []).map((f) => (
              <div
                key={f.thesisId}
                className="rounded-md border border-border/40 bg-surface-0/40 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldAlert
                    className={`h-3.5 w-3.5 ${
                      f.severity === "broken"
                        ? "text-red-400"
                        : f.severity === "pressure"
                          ? "text-amber-300"
                          : "text-muted-foreground"
                    }`}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {f.severity}
                  </span>
                </div>
                <div className="mt-1 text-sm">{f.statement}</div>
                <p className="mt-1 text-xs text-muted-foreground">{f.reason}</p>
                <ul className="mt-2 space-y-0.5">
                  {f.killConditions.slice(0, 3).map((k) => (
                    <li key={k} className="font-mono text-[10px] text-muted-foreground">
                      · {k}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* Radar */}
      {(radar ?? []).length > 0 ? (
        <Panel className="p-5">
          <PanelHeader
            title="Opportunity Radar"
            description="Policy-safe windows from SSI drift, falsify pressure, and continuity"
            action={
              <Radar className="h-4 w-4 text-muted-foreground" />
            }
          />
          <div className="mt-3 space-y-2">
            {(radar ?? []).map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/40 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{r.detail}</div>
                </div>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">{r.urgency}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* Debate */}
      <Panel className="p-5">
        <PanelHeader
          title="3 · Debate before you choose"
          description="Counsel defends. Falsifier tries to kill. Both bound to your memory + live citations."
        />
        <div className="mt-3">
          <Button
            variant="secondary"
            onClick={() => runDebate.mutate()}
            disabled={runDebate.isPending}
          >
            <Scale className="mr-1.5 h-3.5 w-3.5" />
            {runDebate.isPending ? "Debating…" : debate ? "Re-run debate" : "Run adversarial debate"}
          </Button>
        </div>
        {debate ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-emerald-500/25 bg-surface-0/50 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wide text-emerald-300">Counsel</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{debate.counsel.content}</p>
            </div>
            <div className="rounded-md border border-red-500/25 bg-surface-0/50 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wide text-red-300">Falsifier</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{debate.falsifier.content}</p>
            </div>
            <div className="md:col-span-2 rounded-md border border-border/50 bg-surface-2/40 px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">
                Synthesis · {debate.synthesis.stance} · {debate.synthesis.confidence}% · {debate.latencyMs}ms
              </div>
              <p className="mt-1 text-sm">{debate.synthesis.summary}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Recommended before Approve. Unlike generic bull/bear signal debates, this argues over{" "}
            <em>your</em> theses and decisions.
          </p>
        )}
      </Panel>

      {/* Choose */}
      <Panel className="p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          4 · Choose
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={approve}
            disabled={verdict === "BLOCK" || decide.isPending}
            variant={approveBlockedByDebate ? "secondary" : "default"}
          >
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
              Verify on Wealth
            </Button>
          </Link>
        </div>
        {!debate ? (
          <p className="mt-2 text-xs text-amber-200/80">Tip: run Debate once so Approve is informed, not impulsive.</p>
        ) : null}
      </Panel>

      {whatChanged.deltaCount > 0 ? (
        <Panel className="p-5">
          <PanelHeader
            title="Why today changed"
            description={`${whatChanged.deltaCount} change${whatChanged.deltaCount === 1 ? "" : "s"} vs yesterday`}
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
          <PanelHeader title="Open theses" description="Beliefs under continuous falsification" />
          <div className="mt-3 space-y-2">
            {openTheses.slice(0, 4).map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/40 bg-surface-0/40 px-3 py-2"
              >
                <div className="text-sm">{t.statement}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{t.confidence}%</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openAi(`Challenge this thesis: "${t.statement}"`, t.id)}
                  >
                    Challenge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* Learn + Replay */}
      <Panel className="p-5">
        <PanelHeader
          title="5 · Learn"
          description="Decision Timeline — replay any choice against today's evidence"
          action={
            <Link to="/app/memory">
              <Button size="sm" variant="ghost">
                <History className="mr-1.5 h-3.5 w-3.5" />
                Memory
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
            No decisions yet — Approve, Challenge, or Wait above to start the loop.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {(timeline.data?.entries ?? []).slice(0, 6).map((e) => (
              <div key={`${e.type}-${e.id}`} className="flex flex-wrap items-start justify-between gap-3 px-1 py-3">
                <div>
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    {e.type} · {relTime(e.at)}
                  </div>
                  <div className="text-sm">{e.title}</div>
                  {e.detail ? <div className="mt-0.5 text-xs text-muted-foreground">{e.detail}</div> : null}
                  {e.type === "decision" && replayId === e.id && replayText ? (
                    <p className="mt-1.5 text-xs text-accent-1">{replayText}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {e.type === "decision" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={runReplay.isPending}
                      onClick={() => runReplay.mutate(e.id)}
                    >
                      Replay
                    </Button>
                  ) : null}
                  <span className="rounded-md border border-border/50 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                    {e.outcome ?? "PENDING"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
