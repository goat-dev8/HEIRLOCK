import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToken } from "@/lib/auth-store";
import { RequireAuth } from "@/components/app/require-auth";
import { Panel, PanelHeader, Stat } from "@/components/app/panel";
import { DataBadge } from "@/components/app/data-badge";
import { Badge } from "@/components/ui/badge";
import { usd } from "@/lib/format";

export const Route = createFileRoute("/app/track")({
  head: () => ({ meta: [{ title: "Track — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: TrackPage,
});

function TrackPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="fade-rise space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-1">Learning engine</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Track</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Proposals and fills against Terminal index baseline. HIT, STOP, and DRIFT outcomes feed
          Investment Memory and sharpen the Partner.
        </p>
      </div>
      <RequireAuth>
        <TrackInner />
      </RequireAuth>
    </div>
  );
}

function TrackInner() {
  const token = useToken();
  const q = useQuery({
    queryKey: ["fo", "track", token],
    queryFn: () => api<Record<string, unknown>>("/api/fo/track", { auth: true }),
    enabled: !!token,
  });

  const rows = (q.data?.rows as Array<Record<string, unknown>>) ?? [];
  const baseline = q.data?.baseline as { terminalIndexLevel?: number; note?: string } | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DataBadge status="LIVE" />
      </div>
      <Stat
        label="ssiMAG7 Terminal baseline"
        value={baseline?.terminalIndexLevel != null ? usd(baseline.terminalIndexLevel) : "Unavailable"}
        hint={baseline?.note}
      />
      <Panel>
        <PanelHeader title="Action log" description="HIT / STOP / DRIFT / PENDING" />
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No tracked actions yet. Run Living Loop or Guardian simulate from the Guide.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {rows.map((r) => (
              <div key={String(r.id)} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div>
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">{String(r.kind)}</div>
                  <div className="text-sm">{String(r.thesis)}</div>
                  {r.orderId ? (
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                      order {String(r.orderId)}
                    </div>
                  ) : null}
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {String(r.outcome ?? "PENDING")}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
