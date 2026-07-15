import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { useToken } from "@/lib/auth-store";
import { RequireAuth } from "@/components/app/require-auth";
import { Panel, PanelHeader, Stat } from "@/components/app/panel";
import { DataBadge } from "@/components/app/data-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAiDrawer } from "@/components/app/ai-drawer-context";
import {
  ArrowUpRight,
  Brain,
  ChevronDown,
  Clock3,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { pctPoints, relTime, usd } from "@/lib/format";
import { formatPulseDelta, storePartnerDecisionId } from "@/lib/partner-handoff";

const learnSearchSchema = z.object({
  learn: z.enum(["timeline", "theses", "changed", "lessons"]).catch("timeline"),
});

export const Route = createFileRoute("/app/living")({
  validateSearch: (search) => learnSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Partner — HEIRLOCK" }, { name: "robots", content: "noindex" }],
  }),
  component: LivingPage,
});

type Citation = { source: string; endpoint: string; at: string; status: string };
type Proposal = {
  action?: string;
  title?: string;
  rationale?: string;
  onChainToken?: { symbol?: string; priceUsd?: number | null; change24hPct?: number | null } | null;
  ssiAllocateUrl?: string;
};
type Drift = {
  alert?: boolean;
  driftPct?: number | null;
  signal?: string | null;
  terminalChange24hPct?: number | null;
  tokenChange24hPct?: number | null;
};
type PulseAnswers = {
  whatChanged: string[];
  whyChanged: string[];
  weakerTheses: Array<{ thesisId: string; statement: string; from: number; to: number; reason: string }>;
  strongerTheses: Array<{ thesisId: string; statement: string; from: number; to: number; reason: string }>;
  opportunitiesAppeared: string[];
  wrongRecommendations: Array<{ decisionId: string; lesson: string; todayVerdict: string }>;
  riskUp: string[];
  riskDown: string[];
};
type LivingPortfolio = {
  status: string;
  holdings: { environment: string; totalUsd: number | null; assetCount: number; note?: string };
  narratives: { allocation: string; risk: string; confidence: string };
  linkedTheses: Array<{ id: string; statement: string; confidence: number; status: string }>;
  recentShifts: string[];
};
type ActionPlanStep = {
  id: string;
  phase: string;
  title: string;
  detail: string;
  href?: string;
  required: boolean;
};
type Brief = {
  status: string;
  product?: string;
  headline: string;
  rationale?: string;
  proposal: Proposal;
  drift: Drift | null;
  preflight: { verdict?: string };
  citations: Citation[];
  pulse?: {
    ranAt: string;
    summary: string;
    answers: PulseAnswers;
    mutations: Array<{ thesisId: string; action: string; detail: string }>;
  };
  dna?: { archetype: string; tagline: string; stats: { decisions: number; challengeRate: number; openTheses: number } };
  falsify?: Array<{ thesisId: string; statement: string; severity: string; reason: string; killConditions: string[] }>;
  radar?: Array<{ id: string; title: string; detail: string; urgency: string }>;
  livingPortfolio?: LivingPortfolio;
  evidenceGraph?: { summary: string; nodeCount: number; edgeCount: number };
  policy?: { mode?: string; source?: string; maxNotionalUsd?: number | null };
  continuityGate?: {
    canApprove: boolean;
    canExecute: boolean;
    continuityMode: string;
    blockReason: string | null;
    nextStep: string;
  };
  openTheses: Array<{ id: string; statement: string; status: string; confidence: number }>;
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
  moderator: { content: string };
  synthesis: { stance: string; confidence: number; summary: string };
  actionPlan: {
    primaryAction: string;
    policyCapUsd: number | null;
    steps: ActionPlanStep[];
  };
  latencyMs: number;
  debateDecisionId?: string | null;
};

function LivingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Living Investment Partner
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Partner</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          It kept thinking while you were away. See what changed → debate → decide → verify → learn.
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
  const { learn } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { openAi } = useAiDrawer();
  const qc = useQueryClient();
  const [whyOpen, setWhyOpen] = useState(false);
  const [debate, setDebate] = useState<DebateResult | null>(null);
  const [lastDecisionId, setLastDecisionId] = useState<string | null>(null);
  const [replayId, setReplayId] = useState<string | null>(null);
  const [replayText, setReplayText] = useState<string | null>(null);

  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const forcePulse = useMutation({
    mutationFn: () =>
      api("/api/fo/partner/pulse", { method: "POST", auth: true, timeoutMs: 120_000, body: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fo", "partner", "brief"] });
      toast.success("Pulse complete — brief refreshed");
    },
    onError: (e) => toast.error((e as Error).message || "Pulse failed"),
  });

  const evidenceGraph = useQuery({
    queryKey: ["fo", "partner", "evidence-graph", token],
    queryFn: () =>
      api<{ nodes: Array<{ id: string; kind: string; label: string; status?: string }>; summary: string }>(
        "/api/fo/partner/evidence-graph",
        { auth: true },
      ),
    enabled: !!token && evidenceOpen,
  });

  const brief = useQuery({
    queryKey: ["fo", "partner", "brief", token],
    queryFn: () => api<Brief>("/api/fo/partner/brief", { auth: true, timeoutMs: 120_000 }),
    enabled: !!token,
    refetchInterval: 90_000,
  });

  const timeline = useQuery({
    queryKey: ["fo", "partner", "timeline", "recent", token],
    queryFn: () => api<{ entries: TimelineEntry[] }>("/api/fo/partner/timeline", { auth: true }),
    enabled: !!token,
    staleTime: 30_000,
  });

  const memory = useQuery({
    queryKey: ["fo", "partner", "memory", token],
    queryFn: () =>
      api<{
        theses: Array<{
          id: string;
          statement: string;
          status: string;
          confidence: number;
          invalidatedReason?: string | null;
          updatedAt: string;
        }>;
        lessons: Array<{ thesisId: string; statement: string; status: string; resolvedAt: string }>;
      }>("/api/fo/partner/memory", { auth: true }),
    enabled: !!token,
  });

  const changed = useQuery({
    queryKey: ["fo", "partner", "changed", token],
    queryFn: () =>
      api<{ status: string; deltas: Array<{ field: string; from: unknown; to: unknown }> }>(
        "/api/fo/partner/changed",
        { auth: true },
      ),
    enabled: !!token,
  });

  const learning = useQuery({
    queryKey: ["fo", "partner", "learning", token],
    queryFn: () =>
      api<{ lessons: Array<{ lesson: string; at: string; outcome: string }> }>("/api/fo/partner/learning", {
        auth: true,
      }),
    enabled: !!token,
  });

  const decide = useMutation({
    mutationFn: (input: {
      actionType: "hold" | "ssi_allocate" | "sodex_trade" | "wait";
      userChoice: "approved" | "rejected" | "deferred";
    }) =>
      api<{ decision: { id: string }; nextStep?: string }>("/api/fo/partner/decision", {
        method: "POST",
        auth: true,
        body: {
          actionType: input.actionType,
          userChoice: input.userChoice,
          proposal: brief.data?.proposal ?? {},
          citations: brief.data?.citations ?? [],
          debate: debate ?? undefined,
          policy: brief.data?.policy ?? undefined,
        },
      }),
    onSuccess: (res) => {
      setLastDecisionId(res.decision.id);
      storePartnerDecisionId(res.decision.id);
      qc.invalidateQueries({ queryKey: ["fo", "partner"] });
    },
    onError: (e) => toast.error((e as Error).message || "Could not record decision"),
  });

  const runDebate = useMutation({
    mutationFn: () =>
      api<DebateResult>("/api/fo/partner/debate", {
        method: "POST",
        auth: true,
        timeoutMs: 180_000,
        body: {},
      }),
    onSuccess: (res) => {
      setDebate(res);
      if (res.debateDecisionId) storePartnerDecisionId(res.debateDecisionId);
      toast.success(`Moderator: ${res.synthesis.stance.toUpperCase()}`);
    },
    onError: (e) => toast.error((e as Error).message || "Debate failed"),
  });

  const runReplay = useMutation({
    mutationFn: (decisionId: string) =>
      api<{ replay: { todayVerdict: string; reason: string } }>(
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
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-28 rounded-lg" />
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
  const { proposal, drift, preflight, citations, pulse, dna, falsify, radar, openTheses, livingPortfolio, evidenceGraph: graphMeta, policy, continuityGate } = data;
  const answers = pulse?.answers;
  const verdict = String(preflight.verdict ?? "CAUTION");
  const liveCount = citations.filter((c) => c.status === "LIVE").length;
  const primaryActionType = drift?.alert ? "ssi_allocate" : "hold";
  const debateStance = debate?.synthesis.stance;
  const policyMode = policy?.mode ?? continuityGate?.continuityMode ?? "Unknown";
  const policyLive = policy?.source === "valuechain";
  const continuityBlocked = policyMode === "Guardian" || policyMode === "Heir";
  const canApproveNow =
    Boolean(debate) &&
    verdict !== "BLOCK" &&
    policyLive &&
    !continuityBlocked &&
    continuityGate?.canApprove !== false;
  const blockReason = !debate
    ? "Run Counsel → Falsifier → Moderator debate first."
    : continuityBlocked
      ? continuityGate?.blockReason
      : verdict === "BLOCK"
        ? "Preflight BLOCK"
        : !policyLive
          ? "On-chain WealthPolicy UNAVAILABLE"
          : null;

  function approve() {
    if (!debate) {
      toast.error("Run Debate first — Counsel → Falsifier → Moderator");
      return;
    }
    if (!canApproveNow) {
      toast.error(blockReason ?? "Continuity or policy blocks approval");
      return;
    }
    if (debateStance === "challenge" || debateStance === "wait") {
      toast.message(`Moderator said ${debateStance.toUpperCase()} — recording Approve as your override`);
    }
    decide.mutate(
      { actionType: primaryActionType, userChoice: "approved" },
      {
        onSuccess: (res) => {
          storePartnerDecisionId(res.decision.id);
          setLastDecisionId(res.decision.id);
          toast.success("Approved — go to Sign & verify on Wealth");
        },
      },
    );
  }

  function challenge() {
    decide.mutate({ actionType: primaryActionType, userChoice: "rejected" });
    openAi(
      `Challenge this proposal: "${proposal.title}". ${proposal.rationale ?? ""} What evidence would change your mind?`,
    );
  }

  function wait() {
    decide.mutate({ actionType: "wait", userChoice: "deferred" });
    toast.success("Deferred — Partner will keep watching");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <DataBadge status="LIVE" />
        <span className="text-xs text-muted-foreground">
          Pulsed {pulse?.ranAt ? relTime(pulse.ranAt) : relTime(data.ts)}
        </span>
        {dna ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent-1">
            <Sparkles className="h-3 w-3" />
            DNA · {dna.archetype}
          </span>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => forcePulse.mutate()}
          disabled={forcePulse.isPending || brief.isFetching}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${forcePulse.isPending || brief.isFetching ? "animate-spin" : ""}`} />
          Pulse again
        </Button>
      </div>

      {/* 1 · What changed while away */}
      <Panel tone="accent" className="p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-1">
          1 · While you were away
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-snug tracking-tight">
          {data.headline}
        </h2>
        {data.rationale ? <p className="mt-2 text-sm text-muted-foreground">{data.rationale}</p> : null}

        {answers ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DigestCard title="What changed" lines={answers.whatChanged.map(formatChangedLine)} />
            <DigestCard title="Why" lines={answers.whyChanged} />
            <DigestCard
              title="Weaker theses"
              lines={
                answers.weakerTheses.length
                  ? answers.weakerTheses.map((t) => `${t.from}→${t.to}% · ${t.statement.slice(0, 72)}`)
                  : ["None this pulse"]
              }
            />
            <DigestCard
              title="Stronger theses"
              lines={
                answers.strongerTheses.length
                  ? answers.strongerTheses.map((t) => `${t.from}→${t.to}% · ${t.statement.slice(0, 72)}`)
                  : ["None this pulse"]
              }
            />
            <DigestCard
              title="Opportunities"
              lines={
                answers.opportunitiesAppeared.length
                  ? answers.opportunitiesAppeared
                  : ["No new forced window"]
              }
            />
            <DigestCard
              title="Self-criticism"
              lines={
                answers.wrongRecommendations.length
                  ? answers.wrongRecommendations.map((w) => w.lesson)
                  : ["No approval regrets detected"]
              }
            />
          </div>
        ) : null}

        <Collapsible open={whyOpen} onOpenChange={setWhyOpen} className="mt-4">
          <CollapsibleTrigger asChild>
            <button type="button" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-1 hover:underline">
              <ShieldQuestion className="h-3.5 w-3.5" />
              Proof · {liveCount}/{citations.length} LIVE
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${whyOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {citations.map((c) => (
                <span
                  key={c.endpoint}
                  className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-surface-0/60 px-2.5 py-1 font-mono text-[10px] uppercase"
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
                  hint={proposal.onChainToken?.priceUsd != null ? usd(proposal.onChainToken.priceUsd) : "Base"}
                />
                <Stat label="Drift" value={drift.driftPct != null ? `${drift.driftPct.toFixed(1)}%` : "—"} hint="|Δ|" />
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Preflight <span className="font-mono uppercase">{verdict}</span> — LLM cannot override.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </Panel>

      {livingPortfolio ? (
        <Panel className="p-5">
          <PanelHeader title="Living portfolio" description="Why allocation, risk, and confidence changed" />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <DigestCard title="Allocation" lines={[livingPortfolio.narratives.allocation]} />
            <DigestCard title="Risk" lines={[livingPortfolio.narratives.risk]} />
            <DigestCard title="Confidence" lines={[livingPortfolio.narratives.confidence]} />
          </div>
          {livingPortfolio.recentShifts.length > 0 ? (
            <div className="mt-3">
              <DigestCard title="Recent shifts" lines={livingPortfolio.recentShifts} />
            </div>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {livingPortfolio.holdings.note} · {livingPortfolio.holdings.assetCount} asset(s)
          </p>
        </Panel>
      ) : null}

      {(falsify ?? []).length > 0 ? (
        <Panel className="border-amber-500/30 p-5">
          <PanelHeader title="Falsification pressure" description="Kill conditions vs live evidence" />
          <div className="mt-3 space-y-2">
            {(falsify ?? []).map((f) => (
              <div key={f.thesisId} className="rounded-md border border-border/40 px-3 py-2">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-amber-200">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {f.severity}
                </div>
                <div className="mt-1 text-sm">{f.statement}</div>
                <p className="mt-1 text-xs text-muted-foreground">{f.reason}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {(radar ?? []).length > 0 ? (
        <Panel className="p-5">
          <PanelHeader title="Radar" description="Policy-safe windows" />
          <div className="mt-3 space-y-2">
            {(radar ?? []).map((r) => (
              <div key={r.id} className="flex justify-between gap-2 rounded-md border border-border/40 px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.detail}</div>
                </div>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">{r.urgency}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* 2 · Debate */}
      <Panel className="p-5">
        <PanelHeader
          title="2 · Debate"
          description="Counsel → Falsifier → Moderator. Memory-bound. Cited."
        />
        <Button className="mt-3" variant="secondary" onClick={() => runDebate.mutate()} disabled={runDebate.isPending}>
          <Scale className="mr-1.5 h-3.5 w-3.5" />
          {runDebate.isPending ? "Debating…" : debate ? "Re-run debate" : "Run full debate"}
        </Button>
        {debate ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <SideCard tone="counsel" title="Counsel" body={debate.counsel.content} />
              <SideCard tone="falsifier" title="Falsifier" body={debate.falsifier.content} />
            </div>
            <SideCard tone="moderator" title="Moderator" body={debate.moderator.content} />
            <div className="rounded-md border border-border/50 bg-surface-2/40 px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">
                Final · {debate.synthesis.stance} · {debate.synthesis.confidence}% · {debate.latencyMs}ms
              </div>
              <p className="mt-1 text-sm">{debate.synthesis.summary}</p>
            </div>
            {debate.actionPlan ? (
              <div className="rounded-md border border-accent-1/25 bg-surface-0/40 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wide text-accent-1">
                  Action plan · {debate.actionPlan.primaryAction.replace(/_/g, " ")}
                </div>
                <ol className="mt-2 space-y-2">
                  {debate.actionPlan.steps.map((step) => (
                    <li key={step.id} className="text-xs">
                      <span className="font-mono uppercase text-muted-foreground">{step.phase}</span>
                      <div className="text-sm font-medium">{step.title}</div>
                      <p className="text-muted-foreground">{step.detail}</p>
                      {step.href ? (
                        step.href.startsWith("http") ? (
                          <a href={step.href} target="_blank" rel="noreferrer" className="text-accent-1 hover:underline">
                            Open
                          </a>
                        ) : (
                          <Link to={step.href} className="text-accent-1 hover:underline">
                            Go
                          </Link>
                        )
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Required before Approve. The Partner will not let impulse replace evidence.</p>
        )}
      </Panel>

      {/* Policy + Continuity gate */}
      <Panel className={`p-5 ${!canApproveNow ? "border-amber-500/30" : ""}`}>
        <PanelHeader
          title="Policy · Continuity"
          description="On-chain WealthPolicy gates every approval"
        />
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md border border-border/50 px-2 py-1 font-mono uppercase">
            Preflight {verdict}
          </span>
          <span className="rounded-md border border-border/50 px-2 py-1 font-mono uppercase">
            Mode {policyMode}
          </span>
          {policy?.maxNotionalUsd != null ? (
            <span className="rounded-md border border-border/50 px-2 py-1 font-mono">
              Cap ${policy.maxNotionalUsd}
            </span>
          ) : null}
          <DataBadge status={policy?.source === "valuechain" ? "LIVE" : "UNAVAILABLE"} />
        </div>
        {blockReason && !canApproveNow ? (
          <p className="mt-2 text-sm text-amber-200">{blockReason}</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Approve records intent only — Sign on Wealth executes under EIP-712.
          </p>
        )}
        {!canApproveNow && continuityBlocked ? (
          <Link to="/app/continuity" className="mt-2 inline-block text-xs text-accent-1 hover:underline">
            Open Continuity →
          </Link>
        ) : null}
      </Panel>

      {/* 3 · Choose */}
      <Panel className="p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">3 · Choose</div>
        <p className="mt-1 text-sm text-muted-foreground">{proposal.title}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={approve}
            disabled={!canApproveNow || decide.isPending}
            variant={debateStance === "approve" ? "default" : "secondary"}
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
          <Link
            to="/app/wealth"
            search={{
              tab: "trade",
              ...(lastDecisionId ? { decisionId: lastDecisionId } : {}),
            }}
            className="ml-auto"
          >
            <Button variant={lastDecisionId ? "default" : "ghost"} size="sm">
              4 · Sign & verify
            </Button>
          </Link>
        </div>
      </Panel>

      {/* Evidence graph */}
      <Panel className="p-5">
        <Collapsible open={evidenceOpen} onOpenChange={setEvidenceOpen}>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between text-left">
              <PanelHeader
                title="Evidence graph"
                description={graphMeta?.summary ?? "Link proposal → citations → memory → policy"}
              />
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${evidenceOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {evidenceGraph.isLoading ? (
              <Skeleton className="h-24 rounded-md" />
            ) : evidenceGraph.data ? (
              <div className="flex flex-wrap gap-2">
                {evidenceGraph.data.nodes.slice(0, 12).map((n) => (
                  <span
                    key={n.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1 font-mono text-[10px] uppercase"
                  >
                    {n.kind}
                    <span className="normal-case text-muted-foreground">{n.label.slice(0, 40)}</span>
                    {n.status ? <DataBadge status={n.status === "LIVE" ? "LIVE" : "UNAVAILABLE"} /> : null}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Open to load provenance graph.</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Panel>


      {/* 5 · Learn — Memory lives here */}
      <Panel className="p-5">
        <PanelHeader title="5 · Learn" description="Investment Memory — timeline, theses, lessons" />
        <Tabs
          value={learn}
          onValueChange={(v) =>
            navigate({ search: { learn: v as "timeline" | "theses" | "changed" | "lessons" } })
          }
          className="mt-3"
        >
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="theses">Theses</TabsTrigger>
            <TabsTrigger value="changed">What changed</TabsTrigger>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-3">
            {(timeline.data?.entries ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No decisions yet — Choose above.</p>
            ) : (
              <div className="space-y-4">
                {groupByWeek(timeline.data?.entries ?? []).map((week) => (
                  <div key={week.label}>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {week.label}
                    </div>
                    <div className="divide-y divide-border/40 border-l border-border/40 pl-3">
                      {week.entries.map((e) => (
                        <div
                          key={`${e.type}-${e.id}`}
                          className="flex flex-wrap items-start justify-between gap-3 py-3"
                        >
                          <div>
                            <div className="font-mono text-[10px] uppercase text-muted-foreground">
                              {e.type} · {relTime(e.at)}
                            </div>
                            <div className="text-sm">{e.title}</div>
                            {replayId === e.id && replayText ? (
                              <p className="mt-1 text-xs text-accent-1">{replayText}</p>
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
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {e.outcome ?? "PENDING"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="theses" className="mt-3 space-y-2">
            {(memory.data?.theses ?? [])
              .filter((t) => t.status === "active" || t.status === "challenged")
              .map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/40 px-3 py-2"
                >
                  <div>
                    <div className="text-sm">{t.statement}</div>
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">{t.status}</div>
                  </div>
                  <span className="font-mono text-sm">{t.confidence}%</span>
                </div>
              ))}
          </TabsContent>
          <TabsContent value="changed" className="mt-3">
            {changed.data?.status === "NO_BASELINE" ? (
              <p className="text-sm text-muted-foreground">Baseline building — check back tomorrow.</p>
            ) : (
              <div className="space-y-2">
                {(changed.data?.deltas ?? []).slice(0, 8).map((d) => (
                  <div key={d.field} className="text-xs text-muted-foreground">
                    <span className="font-mono">{d.field}</span>: {formatPulseDelta(d.from)} →{" "}
                    {formatPulseDelta(d.to)}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="lessons" className="mt-3 space-y-2">
            {(learning.data?.lessons ?? []).length === 0 &&
            (memory.data?.lessons ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Lessons appear after outcomes and fill verification.</p>
            ) : (
              <>
                {(learning.data?.lessons ?? []).map((l, i) => (
                  <div key={`${l.at}-${i}`} className="text-xs text-muted-foreground">
                    <span className="text-accent-1">{l.outcome}</span> · {l.lesson}
                  </div>
                ))}
                {(memory.data?.lessons ?? []).map((l) => (
                  <div key={l.thesisId} className="text-sm">
                    {l.statement}{" "}
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      {l.status}
                    </Badge>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </Panel>
    </div>
  );
}

function formatChangedLine(line: string): string {
  const m = line.match(/^([^:]+):\s*(.+?)\s*→\s*(.+)$/);
  if (!m) return line;
  return `${m[1]}: ${formatPulseDelta(m[2])} → ${formatPulseDelta(m[3])}`;
}

function groupByWeek(entries: TimelineEntry[]): Array<{ label: string; entries: TimelineEntry[] }> {
  const weeks = new Map<string, TimelineEntry[]>();
  for (const e of entries.slice(0, 24)) {
    const d = new Date(e.at);
    const start = new Date(d);
    start.setUTCDate(d.getUTCDate() - d.getUTCDay());
    start.setUTCHours(0, 0, 0, 0);
    const label = `Week of ${start.toISOString().slice(0, 10)}`;
    const list = weeks.get(label) ?? [];
    list.push(e);
    weeks.set(label, list);
  }
  return [...weeks.entries()].map(([label, weekEntries]) => ({ label, entries: weekEntries }));
}

function DigestCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-md border border-border/40 bg-surface-0/40 px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <ul className="mt-1.5 space-y-1">
        {lines.slice(0, 3).map((l) => (
          <li key={l} className="text-xs leading-relaxed text-muted-foreground">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SideCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "counsel" | "falsifier" | "moderator";
}) {
  const border =
    tone === "counsel"
      ? "border-emerald-500/25"
      : tone === "falsifier"
        ? "border-red-500/25"
        : "border-accent-1/30";
  const label =
    tone === "counsel" ? "text-emerald-300" : tone === "falsifier" ? "text-red-300" : "text-accent-1";
  return (
    <div className={`rounded-md border ${border} bg-surface-0/50 p-3`}>
      <div className={`font-mono text-[10px] uppercase tracking-wide ${label}`}>{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
