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
} from "lucide-react";
import { toast } from "sonner";
import { pctPoints, relTime, usd } from "@/lib/format";
import { formatPulseDelta, storePartnerDecisionId } from "@/lib/partner-handoff";
import { PartnerJourneyStory } from "@/components/app/partner-journey-story";
import { EvidenceFlowStory } from "@/components/app/evidence-flow-story";
import { motion } from "framer-motion";

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
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div className="fade-rise space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-1">Living Investment Partner</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">While you were away</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Your Partner already re-checked the market, challenged open theses, and prepared the next decision.
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
    queryFn: () => api<Brief>("/api/fo/partner/brief", { auth: true, timeoutMs: 90_000 }),
    enabled: !!token,
    staleTime: 60_000,
    refetchInterval: 120_000,
    placeholderData: (prev) => prev,
  });

  const timeline = useQuery({
    queryKey: ["fo", "partner", "timeline", "recent", token],
    queryFn: () => api<{ entries: TimelineEntry[] }>("/api/fo/partner/timeline", { auth: true }),
    enabled: !!token && !!brief.data,
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
    enabled: !!token && !!brief.data,
  });

  const learning = useQuery({
    queryKey: ["fo", "partner", "learning", token],
    queryFn: () =>
      api<{ lessons: Array<{ lesson: string; at: string; outcome: string }> }>("/api/fo/partner/learning", {
        auth: true,
      }),
    enabled: !!token && !!brief.data,
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

  const data = brief.data;
  const loadingBrief = brief.isLoading && !data;

  if (loadingBrief) {
    return (
      <div className="space-y-8">
        <PartnerJourneyStory active={0} />
        <div className="flex flex-wrap items-center gap-3">
          <DataBadge status="LIVE" />
          <span className="text-[15px] text-muted-foreground">Loading your pulse…</span>
        </div>
        <Panel tone="accent" className="overflow-hidden p-0">
          <div className="space-y-6 p-7 sm:p-8">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full max-w-lg" />
            <Skeleton className="h-5 w-full max-w-2xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
        </Panel>
        <Panel className="p-6 sm:p-7">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-4 h-10 w-40" />
        </Panel>
      </div>
    );
  }

  if (!data) return null;

  const { proposal, drift, preflight, citations, pulse, dna, falsify, radar, livingPortfolio, evidenceGraph: graphMeta, policy, continuityGate } = data;
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
    ? "Run the debate first — Counsel, Falsifier, then Moderator."
    : continuityBlocked
      ? continuityGate?.blockReason
      : verdict === "BLOCK"
        ? "Policy blocked this recommendation"
        : !policyLive
          ? "On-chain wealth policy is unavailable right now"
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
    <div className="space-y-8">
      <PartnerJourneyStory active={debate ? (canApproveNow ? 2 : 1) : 0} />

      <motion.div
        className="flex flex-wrap items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <DataBadge status="LIVE" />
        <span className="text-[15px] text-muted-foreground">
          Pulsed {pulse?.ranAt ? relTime(pulse.ranAt) : relTime(data.ts)}
        </span>
        {dna ? (
          <span className="rounded-full border border-border/50 bg-surface-0 px-3 py-1 text-sm text-foreground/90">
            Style · {dna.archetype === "Falsifier" ? "Challenger" : dna.archetype === "Counsel" ? "Advocate" : dna.archetype}
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
          Refresh
        </Button>
      </motion.div>

      <Panel tone="accent" className="overflow-hidden p-0">
        <div className="space-y-6 p-7 sm:p-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent-1">What changed</p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-snug tracking-tight sm:text-4xl">
              {data.headline}
            </h2>
            {data.rationale ? (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{data.rationale}</p>
            ) : null}
          </div>

          {answers ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <DigestCard title="Market move" lines={answers.whatChanged.map(formatChangedLine)} />
              <DigestCard title="Why it matters" lines={answers.whyChanged.map(humanizeCopy)} />
              <DigestCard
                title="Theses under pressure"
                lines={
                  answers.weakerTheses.length
                    ? answers.weakerTheses.map((t) => `${t.from}→${t.to}% · ${t.statement.slice(0, 72)}`)
                    : ["None this pulse"]
                }
              />
              <DigestCard
                title="Opportunity"
                lines={
                  (radar ?? []).length
                    ? (radar ?? []).slice(0, 2).map((r) => r.title)
                    : answers.opportunitiesAppeared.length
                      ? answers.opportunitiesAppeared
                      : ["No forced window"]
                }
              />
            </div>
          ) : null}

          {livingPortfolio ? (
            <p className="border-t border-border/40 pt-5 text-[15px] leading-relaxed text-muted-foreground">
              <span className="text-foreground">{livingPortfolio.narratives.confidence}</span>
              {" · "}
              {livingPortfolio.narratives.risk}
            </p>
          ) : null}

          <Collapsible open={whyOpen} onOpenChange={setWhyOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-[15px] font-medium text-accent-1 hover:underline"
              >
                <ShieldQuestion className="h-4 w-4" />
                Evidence · {liveCount}/{citations.length} live
                <ChevronDown className={`h-4 w-4 transition-transform ${whyOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {citations.map((c) => (
                  <span
                    key={c.endpoint}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-surface-0/60 px-3 py-1.5 text-sm"
                  >
                    {humanSource(c.source)}
                    <DataBadge status={c.status === "LIVE" ? "LIVE" : "UNAVAILABLE"} />
                  </span>
                ))}
              </div>
              {drift?.signal ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Terminal 24h" value={pctPoints(drift.terminalChange24hPct)} hint="Index" />
                  <Stat
                    label={`${proposal.onChainToken?.symbol ?? "Token"} 24h`}
                    value={pctPoints(drift.tokenChange24hPct)}
                    hint={proposal.onChainToken?.priceUsd != null ? usd(proposal.onChainToken.priceUsd) : "On-chain"}
                  />
                  <Stat label="Drift" value={drift.driftPct != null ? `${drift.driftPct.toFixed(1)}%` : "—"} hint="|Δ|" />
                </div>
              ) : null}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Panel>

      {(falsify ?? []).length > 0 ? (
        <Panel className="border-amber-500/25 p-6">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-200">Needs your attention</p>
          <div className="mt-4 space-y-3">
            {(falsify ?? []).slice(0, 2).map((f) => (
              <div key={f.thesisId} className="rounded-xl border border-border/40 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-100">
                  <ShieldAlert className="h-4 w-4" />
                  {f.severity === "broken" ? "Broken" : "Under pressure"}
                </div>
                <p className="mt-2 text-base leading-relaxed">{f.statement}</p>
                <p className="mt-1.5 text-[15px] text-muted-foreground">{f.reason}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel className="p-6 sm:p-7">
        <PanelHeader
          title="Debate"
          description="Counsel defends. Falsifier attacks. Moderator decides — from your memory and live evidence only."
          className="border-0 px-0 py-0"
        />
        <Button className="mt-5" variant="secondary" onClick={() => runDebate.mutate()} disabled={runDebate.isPending}>
          <Scale className="mr-1.5 h-4 w-4" />
          {runDebate.isPending ? (
            <span className="inline-flex items-center gap-2">
              Debating
              <span className="inline-flex gap-1">
                <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-current" />
                <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-current [animation-delay:0.2s]" />
                <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-current [animation-delay:0.4s]" />
              </span>
            </span>
          ) : debate ? (
            "Re-run debate"
          ) : (
            "Run full debate"
          )}
        </Button>
        {debate ? (
          <motion.div
            className="mt-6 space-y-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SideCard tone="counsel" title="Counsel" body={debate.counsel.content} />
              <SideCard tone="falsifier" title="Falsifier" body={debate.falsifier.content} />
            </div>
            <SideCard tone="moderator" title="Moderator" body={debate.moderator.content} />
            <div className="rounded-xl border border-border/50 bg-surface-2/40 px-4 py-3.5">
              <div className="text-sm text-muted-foreground">
                Final · {debate.synthesis.stance} · {debate.synthesis.confidence}% confidence
              </div>
              <p className="mt-1.5 text-base leading-relaxed">{debate.synthesis.summary}</p>
            </div>
            {debate.actionPlan ? (
              <div className="rounded-xl border border-accent-1/25 bg-surface-0/40 p-4">
                <div className="text-sm font-medium text-accent-1">
                  Next steps · {debate.actionPlan.primaryAction.replace(/_/g, " ")}
                </div>
                <ol className="mt-3 space-y-3">
                  {debate.actionPlan.steps.map((step) => (
                    <li key={step.id} className="text-[15px]">
                      <div className="font-medium">{step.title}</div>
                      <p className="mt-0.5 text-muted-foreground">{step.detail}</p>
                      {step.href ? (
                        step.href.startsWith("http") ? (
                          <a href={step.href} target="_blank" rel="noreferrer" className="text-accent-1 hover:underline">
                            Open
                          </a>
                        ) : (
                          <Link to={step.href} className="text-accent-1 hover:underline">
                            Continue
                          </Link>
                        )
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </motion.div>
        ) : (
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Required before Approve. Impulse never replaces evidence.
          </p>
        )}
      </Panel>

      <Panel className={`p-6 sm:p-7 ${!canApproveNow ? "border-amber-500/25" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-border/50 px-3 py-1">Policy {verdict}</span>
          <span className="rounded-full border border-border/50 px-3 py-1">Mode {policyMode}</span>
          {policy?.maxNotionalUsd != null ? (
            <span className="rounded-full border border-border/50 px-3 py-1">Cap ${policy.maxNotionalUsd}</span>
          ) : null}
          <DataBadge status={policyLive ? "LIVE" : "UNAVAILABLE"} />
        </div>
        {blockReason && !canApproveNow ? (
          <p className="mt-3 text-base text-amber-100">{blockReason}</p>
        ) : (
          <p className="mt-3 text-[15px] text-muted-foreground">
            Approve records intent. Your wallet still signs every trade.
          </p>
        )}
        {!canApproveNow && continuityBlocked ? (
          <Link to="/app/continuity" className="mt-2 inline-block text-[15px] text-accent-1 hover:underline">
            Open Continuity →
          </Link>
        ) : null}

        <div className="mt-6 border-t border-border/40 pt-6">
          <p className="font-display text-xl font-medium">{proposal.title}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={approve}
              disabled={!canApproveNow || decide.isPending}
              variant={debateStance === "approve" ? "default" : "secondary"}
              size="lg"
            >
              Approve <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button variant="secondary" size="lg" onClick={challenge} disabled={decide.isPending}>
              <Brain className="mr-1.5 h-4 w-4" />
              Challenge
            </Button>
            <Button variant="ghost" size="lg" onClick={wait} disabled={decide.isPending}>
              <Clock3 className="mr-1.5 h-4 w-4" />
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
              <Button variant={lastDecisionId ? "default" : "ghost"} size="lg">
                Sign & verify
              </Button>
            </Link>
          </div>
        </div>
      </Panel>

      <Collapsible open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <Panel className="space-y-4 p-5">
          <EvidenceFlowStory />
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between text-left">
              <div>
                <div className="font-display text-lg font-medium">Evidence graph</div>
                <p className="mt-1 text-[15px] text-muted-foreground">
                  {graphMeta?.summary
                    ? humanizeCopy(graphMeta.summary)
                    : "How this recommendation links to sources, memory, and policy"}
                </p>
              </div>
              <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${evidenceOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            {evidenceGraph.isLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : evidenceGraph.data ? (
              <div className="flex flex-wrap gap-2">
                {evidenceGraph.data.nodes.slice(0, 12).map((n) => (
                  <span
                    key={n.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/50 px-3 py-1.5 text-sm"
                  >
                    <span className="text-muted-foreground">{n.kind}</span>
                    {n.label.slice(0, 36)}
                    {n.status ? <DataBadge status={n.status === "LIVE" ? "LIVE" : "UNAVAILABLE"} /> : null}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-muted-foreground">Open to load provenance.</p>
            )}
          </CollapsibleContent>
        </Panel>
      </Collapsible>

      <Panel className="p-6 sm:p-7">
        <PanelHeader
          title="Learn"
          description="Replay past choices against today's market. Memory lives here."
          className="border-0 px-0 py-0"
        />
        <Tabs
          value={learn === "changed" ? "timeline" : learn}
          onValueChange={(v) =>
            navigate({ search: { learn: v as "timeline" | "theses" | "lessons" } })
          }
          className="mt-5"
        >
          <TabsList className="h-11">
            <TabsTrigger value="timeline" className="text-[15px]">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="theses" className="text-[15px]">
              Theses
            </TabsTrigger>
            <TabsTrigger value="lessons" className="text-[15px]">
              Lessons
            </TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-5">
            {(timeline.data?.entries ?? []).length === 0 ? (
              <p className="text-base text-muted-foreground">No decisions yet — Choose above.</p>
            ) : (
              <div className="space-y-5">
                {groupByWeek(timeline.data?.entries ?? []).map((week) => (
                  <div key={week.label}>
                    <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {week.label}
                    </div>
                    <div className="divide-y divide-border/40 border-l-2 border-accent-1/25 pl-4">
                      {week.entries.map((e) => (
                        <div
                          key={`${e.type}-${e.id}`}
                          className="flex flex-wrap items-start justify-between gap-3 py-4"
                        >
                          <div>
                            <div className="text-sm text-muted-foreground">
                              {e.type} · {relTime(e.at)}
                            </div>
                            <div className="mt-0.5 text-base">{e.title}</div>
                            {replayId === e.id && replayText ? (
                              <p className="mt-1.5 text-[15px] text-accent-1">{replayText}</p>
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
                            <Badge variant="outline" className="text-xs">
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
          <TabsContent value="theses" className="mt-5 space-y-3">
            {(memory.data?.theses ?? [])
              .filter((t) => t.status === "active" || t.status === "challenged")
              .map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 px-4 py-3"
                >
                  <div>
                    <div className="text-base leading-relaxed">{t.statement}</div>
                    <div className="mt-1 text-sm capitalize text-muted-foreground">{t.status}</div>
                  </div>
                  <span className="font-display text-2xl tabular-nums">{t.confidence}%</span>
                </div>
              ))}
          </TabsContent>
          <TabsContent value="lessons" className="mt-5 space-y-3">
            {(learning.data?.lessons ?? []).length === 0 && (memory.data?.lessons ?? []).length === 0 ? (
              <p className="text-base text-muted-foreground">
                Lessons appear after outcomes and verified fills.
              </p>
            ) : (
              <>
                {(learning.data?.lessons ?? []).map((l, i) => (
                  <div key={`${l.at}-${i}`} className="text-[15px] leading-relaxed text-muted-foreground">
                    <span className="text-accent-1">{l.outcome}</span> · {l.lesson}
                  </div>
                ))}
                {(memory.data?.lessons ?? []).map((l) => (
                  <div key={l.thesisId} className="text-base">
                    {l.statement}{" "}
                    <Badge variant="outline" className="ml-1 text-xs">
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

const FIELD_LABELS: Record<string, string> = {
  driftPct: "SSI drift",
  pulsedAt: "Last pulse",
  liveCount: "Live sources",
  terminalChange24hPct: "Terminal 24h",
  tokenChange24hPct: "Token 24h",
  alert: "Alert",
};

function humanField(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function humanSource(source: string): string {
  const map: Record<string, string> = {
    valuechain: "ValueChain",
    dexscreener: "DexScreener",
    sodex: "SoDEX",
    heirlock: "HEIRLOCK",
  };
  return map[source.toLowerCase()] ?? source;
}

function humanizeCopy(line: string): string {
  return line
    .replace(/\bpreflight APPROVE\b/gi, "policy clear")
    .replace(/\bpreflight BLOCK\b/gi, "policy blocked")
    .replace(/\bpreflight CAUTION\b/gi, "policy caution")
    .replace(/\bcitations mostly LIVE\b/gi, "evidence live")
    .replace(/\bLiving Loop\b/g, "Partner")
    .replace(/\bWealthPolicy\b/g, "wealth policy")
    .replace(/\b6\/6 citations LIVE\b/gi, "all sources live")
    .replace(/\bcitations LIVE\b/gi, "sources live")
    .replace(/\bnodes ·\b/gi, "links ·")
    .replace(/\bedges ·\b/gi, "")
    .replace(/\bUNAVAILABLE\b/g, "unavailable");
}

function formatChangedLine(line: string): string {
  const m = line.match(/^([^:]+):\s*(.+?)\s*→\s*(.+)$/);
  if (!m) return humanizeCopy(line);
  const from = formatPulseDelta(m[2]);
  const to = formatPulseDelta(m[3]);
  if (from === "—" && to === "—") return humanField(m[1]);
  if (from === "—" || from === "null") return `${humanField(m[1])} now ${to}`;
  return humanizeCopy(`${humanField(m[1])}: ${from} → ${to}`);
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
    <div className="rounded-xl border border-border/40 bg-surface-0/50 px-4 py-3.5">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
      <ul className="mt-2.5 space-y-1.5">
        {lines.slice(0, 3).map((l) => (
          <li key={l} className="text-[15px] leading-relaxed text-foreground/85">
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
    <div className={`rounded-xl border ${border} bg-surface-0/50 p-4`}>
      <div className={`text-xs font-medium uppercase tracking-[0.14em] ${label}`}>{title}</div>
      <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
