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
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/judges")({
  head: () => ({
    meta: [{ title: "Judges — HEIRLOCK" }, { name: "robots", content: "noindex" }],
  }),
  component: JudgesPage,
});

const STEPS = [
  { n: 1, title: "Skills — Family Office flagship", href: "/app/skills", body: "Install Skills → Build Your Financial OS." },
  { n: 2, title: "Run Living Loop", href: "/app/living", body: "Terminal evidence + proposal + preflight." },
  { n: 3, title: "Approve capped SoDEX trade", href: "/app/trading", body: "EIP-712 → fill proof tray." },
  { n: 4, title: "SSI dual-source + whitepaper contracts", href: "/app/ssi", body: "Index level ≠ MAG7.ssi token." },
  { n: 5, title: "Simulate Guardian", href: "/app/continuity", body: "Alive → Guardian moat." },
  { n: 6, title: "Diag + Track", href: "/app/health", body: "Skill × pillar matrix + outcomes." },
];

function JudgesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Unattended 90s path
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">For judges</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          HEIRLOCK is the AI Financial Operating System on SoSoValue. Family Office is the flagship
          Skill — not the whole product.
        </p>
      </div>
      <RequireAuth>
        <JudgesInner />
      </RequireAuth>
    </div>
  );
}

function JudgesInner() {
  const token = useToken();
  const qc = useQueryClient();
  const diag = useDiag();
  const living = useQuery({
    queryKey: ["fo", "living-loop", "judges", token],
    queryFn: () => api<Record<string, unknown>>("/api/fo/living-loop", { auth: true }),
    enabled: !!token,
  });
  const guardian = useMutation({
    mutationFn: () =>
      api<Record<string, unknown>>("/api/fo/guardian/simulate", { method: "POST", auth: true, body: {} }),
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
          <span className="text-sm text-muted-foreground">
            {living.isSuccess ? "Living Loop reachable" : living.isLoading ? "Probing…" : "Enable Family Office Skill"}
          </span>
        </div>
        <ol className="mt-5 space-y-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-3 rounded-md border border-border/50 bg-surface-0/40 p-3">
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
            <Button>Run Living Loop</Button>
          </Link>
          <Button
            variant="secondary"
            disabled={guardian.isPending}
            onClick={() => guardian.mutate()}
          >
            Simulate Guardian
          </Button>
          <Link to="/app/track">
            <Button variant="ghost">Open /track</Button>
          </Link>
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Diag snapshot" description="/api/diag" />
        {diag.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-border/40 bg-surface-0 p-3 font-mono text-[11px] text-muted-foreground">
            {JSON.stringify(
              {
                skills: (diag.data as { checks?: { skills?: unknown } })?.checks?.skills,
                ssi: (diag.data as { checks?: { ssi?: unknown } })?.checks?.ssi,
                sodex: {
                  tradingEnabled: (diag.data as { checks?: { sodex?: { tradingEnabled?: boolean } } })
                    ?.checks?.sodex?.tradingEnabled,
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
