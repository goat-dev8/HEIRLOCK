import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToken } from "@/lib/auth-store";
import { useDiag } from "@/lib/api-hooks";
import { RequireAuth } from "@/components/app/require-auth";
import { Panel, PanelHeader } from "@/components/app/panel";
import { DataBadge } from "@/components/app/data-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowUpRight, CheckCircle2, Compass } from "lucide-react";

export const Route = createFileRoute("/app/guide")({
  head: () => ({
    meta: [{ title: "Guide — HEIRLOCK" }, { name: "robots", content: "noindex" }],
  }),
  component: GuidePage,
});

const STEPS = [
  {
    n: 1,
    title: "Install Skills",
    href: "/app/skills",
    body: "Enable Family Office (flagship) and the Skills you need.",
  },
  {
    n: 2,
    title: "Run Living Loop",
    href: "/app/living",
    body: "Terminal evidence → AI proposal → risk preflight.",
  },
  {
    n: 3,
    title: "Review Portfolio",
    href: "/app/portfolio",
    body: "Live SoDEX balances for this wallet only.",
  },
  {
    n: 4,
    title: "SSI allocate",
    href: "/app/ssi",
    body: "Research index level here; mint/stake on the official SSI app.",
  },
  {
    n: 5,
    title: "Trade on SoDEX",
    href: "/app/trading",
    body: "EIP-712 sign → relay → fill proof in SoDEX Portfolio.",
  },
  {
    n: 6,
    title: "Track & Continuity",
    href: "/app/track",
    body: "Outcomes log, then Guardian / Heir modes when needed.",
  },
];

function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          System guide
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Install Skills → Build Your OS
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          HEIRLOCK is the AI Financial Operating System on SoSoValue. Family Office is the flagship
          Skill — follow this path once, then operate daily from Living Loop.
        </p>
      </div>
      <RequireAuth>
        <GuideInner />
      </RequireAuth>
    </div>
  );
}

function GuideInner() {
  const token = useToken();
  const qc = useQueryClient();
  const diag = useDiag();
  const living = useQuery({
    queryKey: ["fo", "living-loop", "guide", token],
    queryFn: () => api<Record<string, unknown>>("/api/fo/living-loop", { auth: true }),
    enabled: !!token,
  });
  const guardian = useMutation({
    mutationFn: () =>
      api<Record<string, unknown>>("/api/fo/guardian/simulate", {
        method: "POST",
        auth: true,
        body: {},
      }),
    onSuccess: () => {
      toast.success("Guardian simulation recorded");
      qc.invalidateQueries({ queryKey: ["fo", "track"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <DataBadge status="LIVE" />
          <Compass className="h-4 w-4 text-accent-1" />
          <span className="text-sm text-muted-foreground">
            {living.isSuccess
              ? "Living Loop ready"
              : living.isLoading
                ? "Checking…"
                : "Enable Family Office Skill first"}
          </span>
        </div>
        <ol className="mt-5 space-y-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="flex gap-3 rounded-md border border-border/50 bg-surface-0/40 p-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-accent-1/40 font-mono text-xs text-accent-1">
                {s.n}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[15px] font-medium">{s.title}</div>
                <p className="text-sm text-muted-foreground">{s.body}</p>
                <Link to={s.href} className="mt-1 inline-flex text-xs text-accent-1 hover:underline">
                  Open <ArrowUpRight className="ml-0.5 h-3 w-3" />
                </Link>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/app/living">
            <Button>Open Living Loop</Button>
          </Link>
          <Button
            variant="secondary"
            disabled={guardian.isPending}
            onClick={() => guardian.mutate()}
          >
            Simulate Guardian
          </Button>
          <Link to="/app/health">
            <Button variant="ghost">System health</Button>
          </Link>
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Integration status" description="Live dependency matrix" />
        {diag.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-border/40 bg-surface-0 p-3 font-mono text-[11px] text-muted-foreground">
            {JSON.stringify(
              {
                skills: (diag.data as { checks?: { skills?: unknown } })?.checks?.skills,
                ssi: (diag.data as { checks?: { ssi?: unknown } })?.checks?.ssi,
                sodex: {
                  tradingEnabled: (
                    diag.data as { checks?: { sodex?: { tradingEnabled?: boolean } } }
                  )?.checks?.sodex?.tradingEnabled,
                },
              },
              null,
              2,
            )}
          </pre>
        )}
      </Panel>
    </div>
  );
}
