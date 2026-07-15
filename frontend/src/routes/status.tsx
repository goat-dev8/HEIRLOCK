import { createFileRoute, Link } from "@tanstack/react-router";
import { useHealth, useConfig } from "@/lib/api-hooks";
import { Panel, PanelHeader, Stat } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [{ title: "Status — HEIRLOCK" }],
  }),
  component: StatusPage,
});

function StatusPage() {
  const h = useHealth();
  const cfg = useConfig();

  return (
    <div className="mx-auto min-h-[100dvh] max-w-5xl space-y-6 px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Platform status</h1>
          <p className="mt-2 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Live health for the AI Financial OS — API, SoSoValue Terminal, SoDEX relay, SSI feeds, and
            AI providers across the stack.
          </p>
        </div>
        <Link to="/app/living" className="text-sm text-accent-1 hover:underline">
          Back to Home
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="API" value={h.isLoading ? "…" : h.data?.status ?? "?"} hint={h.data?.profile} />
        <Stat
          label="SoDEX"
          value={cfg.data?.sodex.tradingEnabled ? "enabled" : "paused"}
          hint={cfg.data?.sodex.architecture}
        />
        <Stat label="Mainnet cap" value={cfg.data?.sodex.maxNotionalUsd ?? "—"} hint="USD" />
        <Stat label="Profile" value={cfg.data?.profile ?? "—"} hint="runtime" />
      </div>

      <Panel>
        <PanelHeader title="Dependencies" description="Live probe of core services" />
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
              const ok =
                c.connected === true ||
                c.circuitHealthy === true ||
                (c.configured === true && !("connected" in c));
              return (
                <div key={name} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {name}
                  </div>
                  <Badge variant={ok ? "default" : "secondary"}>{ok ? "ok" : "check"}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
