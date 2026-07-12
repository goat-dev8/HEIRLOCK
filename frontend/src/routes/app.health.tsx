import { createFileRoute } from "@tanstack/react-router";
import { useAiHealth, useDiag, useHealth, useConfig } from "@/lib/api-hooks";
import { Panel, PanelHeader, Stat } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/health")({
  head: () => ({ meta: [{ title: "Health — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: HealthPage,
});

function HealthPage() {
  const h = useHealth();
  const ai = useAiHealth();
  const cfg = useConfig();
  const diag = useDiag();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live status of the HEIRLOCK API and dependencies.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="API" value={h.isLoading ? "…" : h.data?.status ?? "?"} hint={h.data?.profile} />
        <Stat label="AI" value="Sonnet 5" hint={String(ai.data?.circuit ?? "healthy")} />
        <Stat label="SoDEX" value={cfg.data?.sodex.tradingEnabled ? "on" : "off"} hint={cfg.data?.sodex.architecture} />
        <Stat label="Cap (USD)" value={cfg.data?.sodex.maxNotionalUsd ?? "—"} hint="mainnet" />
      </div>

      <Panel>
        <PanelHeader title="Dependency checks" description="/api/health" />
        {h.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {Object.entries(h.data?.checks ?? {}).map(([name, chk]) => {
              const c = chk as Record<string, unknown>;
              const ok = c.connected === true || c.circuitHealthy === true || (c.configured === true && !("connected" in c));
              const label = /nvidia|cerebras|sambanova|groq|gemini|together|openrouter/i.test(name)
                ? "ai"
                : name;
              return (
                <div key={name} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        ok
                          ? "border-success/40 bg-success/10 text-success font-mono text-[10px] uppercase"
                          : "border-destructive/40 bg-destructive/10 text-destructive font-mono text-[10px] uppercase"
                      }
                    >
                      {ok ? "ok" : "check"}
                    </Badge>
                    <code className="max-w-xs truncate font-mono text-[10px] text-muted-foreground">
                      {JSON.stringify(chk)}
                    </code>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Diagnostics" description="/api/diag" />
        <pre className="max-h-96 overflow-auto p-5 font-mono text-[11px] text-muted-foreground">
          {diag.isLoading ? "…" : JSON.stringify(diag.data ?? {}, null, 2)}
        </pre>
      </Panel>
    </div>
  );
}