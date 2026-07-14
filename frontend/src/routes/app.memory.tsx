import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToken } from "@/lib/auth-store";
import { RequireAuth } from "@/components/app/require-auth";
import { EmptyState, Panel, PanelHeader, Stat } from "@/components/app/panel";
import { DataBadge } from "@/components/app/data-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAiDrawer } from "@/components/app/ai-drawer-context";
import { Brain, ChevronDown, History, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { relTime } from "@/lib/format";

export const Route = createFileRoute("/app/memory")({
  head: () => ({
    meta: [{ title: "Memory — HEIRLOCK Partner" }, { name: "robots", content: "noindex" }],
  }),
  component: MemoryPage,
});

type TimelineEntry = {
  id: string;
  type: "decision" | "track" | "order";
  at: string;
  title: string;
  detail: string | null;
  outcome: string | null;
  proofUrl?: string | null;
};
type Thesis = {
  id: string;
  statement: string;
  status: "active" | "challenged" | "invalidated" | "confirmed";
  confidence: number;
  source: string;
  invalidatedReason?: string | null;
  createdAt: string;
  updatedAt: string;
};
type Lesson = {
  thesisId: string;
  statement: string;
  status: string;
  confidence: number;
  invalidatedReason?: string | null;
  resolvedAt: string;
};
type WhyPack = {
  subject: string;
  decisionId?: string;
  actionType?: string;
  proposal?: Record<string, unknown>;
  citations: Array<{ source: string; endpoint: string; at: string; status: string }>;
  policy: { mode?: string; source?: string; maxNotionalUsd?: number | null };
  thesis?: { statement: string; status: string; confidence: number } | null;
};

function MemoryPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Investment Memory
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Memory</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every decision cited, every thesis tracked, every outcome learned from.
        </p>
      </div>
      <RequireAuth>
        <MemoryInner />
      </RequireAuth>
    </div>
  );
}

function MemoryInner() {
  const token = useToken();
  const { openAi } = useAiDrawer();
  const [openWhy, setOpenWhy] = useState<Set<string>>(new Set());

  const timeline = useQuery({
    queryKey: ["fo", "partner", "timeline", token],
    queryFn: () => api<{ entries: TimelineEntry[] }>("/api/fo/partner/timeline", { auth: true }),
    enabled: !!token,
  });
  const memory = useQuery({
    queryKey: ["fo", "partner", "memory", "all", token],
    queryFn: () => api<{ theses: Thesis[]; lessons: Lesson[] }>("/api/fo/partner/memory", { auth: true }),
    enabled: !!token,
  });
  const changed = useQuery({
    queryKey: ["fo", "partner", "changed", token],
    queryFn: () =>
      api<{
        status: string;
        today: Record<string, unknown> | null;
        yesterday: Record<string, unknown> | null;
        deltas: Array<{ field: string; from: unknown; to: unknown }>;
      }>("/api/fo/partner/changed", { auth: true }),
    enabled: !!token,
  });

  function toggleWhy(id: string) {
    setOpenWhy((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Tabs defaultValue="timeline" className="space-y-6">
      <TabsList>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="theses">Theses &amp; lessons</TabsTrigger>
        <TabsTrigger value="changed">What changed</TabsTrigger>
      </TabsList>

      <TabsContent value="timeline" className="mt-0 space-y-3">
        {timeline.isLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (timeline.data?.entries ?? []).length === 0 ? (
          <Panel>
            <EmptyState
              icon={<History className="h-6 w-6" />}
              title="No decisions yet"
              description="Approve, challenge, or wait on a proposal from Home to start the Decision Timeline."
            />
          </Panel>
        ) : (
          <Panel>
            <PanelHeader title="Decision Timeline" description="Proposal → choice → execution → outcome" />
            <div className="divide-y divide-border/40">
              {(timeline.data?.entries ?? []).map((e) => (
                <div key={`${e.type}-${e.id}`} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase text-muted-foreground">
                        {e.type} · {relTime(e.at)}
                      </div>
                      <div className="text-sm">{e.title}</div>
                      {e.detail ? <div className="mt-0.5 text-xs text-muted-foreground">{e.detail}</div> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {e.outcome ?? "PENDING"}
                      </Badge>
                      {e.type === "decision" ? (
                        <Button size="sm" variant="ghost" onClick={() => toggleWhy(e.id)}>
                          Why <ChevronDown className={`ml-1 h-3 w-3 ${openWhy.has(e.id) ? "rotate-180" : ""}`} />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {e.type === "decision" && openWhy.has(e.id) ? <WhyDetail decisionId={e.id} /> : null}
                </div>
              ))}
            </div>
          </Panel>
        )}
      </TabsContent>

      <TabsContent value="theses" className="mt-0 space-y-4">
        {memory.isLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (
          <>
            <Panel>
              <PanelHeader title="Active theses" description="Beliefs your Partner is tracking" />
              {(memory.data?.theses ?? []).filter((t) => t.status === "active" || t.status === "challenged")
                .length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No open theses yet. Ask your Partner to save one, or save an assistant reply from the drawer.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {(memory.data?.theses ?? [])
                    .filter((t) => t.status === "active" || t.status === "challenged")
                    .map((t) => (
                      <ThesisRow key={t.id} thesis={t} onChallenge={() => openAi(`Challenge this thesis: "${t.statement}"`, t.id)} />
                    ))}
                </div>
              )}
            </Panel>
            <Panel>
              <PanelHeader title="Lessons" description="Resolved theses — confirmed or invalidated" />
              {(memory.data?.lessons ?? []).length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No resolved theses yet — lessons appear once a thesis is confirmed or invalidated.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {(memory.data?.lessons ?? []).map((l) => (
                    <div key={l.thesisId} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div>
                        <div className="text-sm">{l.statement}</div>
                        {l.invalidatedReason ? (
                          <div className="mt-0.5 text-xs text-muted-foreground">{l.invalidatedReason}</div>
                        ) : null}
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          resolved {relTime(l.resolvedAt)}
                        </div>
                      </div>
                      <Badge variant={l.status === "confirmed" ? "default" : "destructive"} className="text-[10px]">
                        {l.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}
      </TabsContent>

      <TabsContent value="changed" className="mt-0 space-y-3">
        {changed.isLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : changed.data?.status === "NO_BASELINE" ? (
          <Panel>
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="Building your baseline"
              description="Open Home once today and once tomorrow — the daily digest needs two snapshots to compute a diff."
            />
          </Panel>
        ) : (
          <Panel>
            <PanelHeader
              title="What changed since yesterday"
              description={`${changed.data?.deltas.length ?? 0} field${(changed.data?.deltas.length ?? 0) === 1 ? "" : "s"} changed`}
            />
            {(changed.data?.deltas ?? []).length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Nothing changed since yesterday's digest.</div>
            ) : (
              <div className="divide-y divide-border/40">
                {(changed.data?.deltas ?? []).map((d) => (
                  <div key={d.field} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{d.field}</span>
                    <span>
                      {String(d.from ?? "—")} → <span className="text-foreground">{String(d.to ?? "—")}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </TabsContent>
    </Tabs>
  );
}

function ThesisRow({ thesis, onChallenge }: { thesis: Thesis; onChallenge: () => void }) {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: (input: { status: "confirmed" | "invalidated"; invalidatedReason?: string }) =>
      api("/api/fo/partner/thesis", {
        method: "POST",
        auth: true,
        body: { thesisId: thesis.id, ...input },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fo", "partner", "memory"] });
      toast.success("Thesis updated");
    },
    onError: (e) => toast.error((e as Error).message || "Could not update thesis"),
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div>
        <div className="text-sm">{thesis.statement}</div>
        <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">
          {thesis.status} · {thesis.confidence}% confidence · {thesis.source}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="ghost" onClick={onChallenge}>
          <Brain className="mr-1.5 h-3.5 w-3.5" />
          Challenge
        </Button>
        <Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => update.mutate({ status: "confirmed" })}>
          Confirm
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={update.isPending}
          onClick={() => update.mutate({ status: "invalidated", invalidatedReason: "Marked invalidated from Memory" })}
        >
          Invalidate
        </Button>
      </div>
    </div>
  );
}

function WhyDetail({ decisionId }: { decisionId: string }) {
  const token = useToken();
  const q = useQuery({
    queryKey: ["fo", "partner", "why", "decision", decisionId, token],
    queryFn: () => api<WhyPack>("/api/fo/partner/why", { auth: true, query: { decisionId } }),
    enabled: !!token,
  });

  if (q.isLoading) return <Skeleton className="mt-3 h-16 rounded-md" />;
  if (q.isError || !q.data) {
    return <div className="mt-3 text-xs text-muted-foreground">Why pack unavailable.</div>;
  }

  const pack = q.data;
  return (
    <div className="mt-3 space-y-2 rounded-md border border-border/40 bg-surface-0/50 p-3">
      {pack.thesis ? (
        <div className="text-xs text-muted-foreground">
          Linked thesis: <span className="text-foreground">{pack.thesis.statement}</span> ({pack.thesis.confidence}%)
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {pack.citations.map((c) => (
          <span
            key={`${c.source}-${c.endpoint}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-surface-1 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
          >
            {c.source}
            <DataBadge status={c.status === "LIVE" ? "LIVE" : "UNAVAILABLE"} />
          </span>
        ))}
      </div>
      <div className="font-mono text-[10px] uppercase text-muted-foreground">
        Policy: {pack.policy.mode ?? "Unknown"} ({pack.policy.source ?? "unavailable"})
        {pack.policy.maxNotionalUsd != null ? ` · cap $${pack.policy.maxNotionalUsd}` : ""}
      </div>
    </div>
  );
}
