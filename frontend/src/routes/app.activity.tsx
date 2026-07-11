import { createFileRoute } from "@tanstack/react-router";
import { useSkillEvents } from "@/lib/api-hooks";
import { RequireAuth } from "@/components/app/require-auth";
import { EmptyState, Panel, PanelHeader } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { relTime } from "@/lib/format";

export const Route = createFileRoute("/app/activity")({
  head: () => ({ meta: [{ title: "Activity — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Platform</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">Skill events and signed order outcomes.</p>
      </div>
      <RequireAuth>
        <Timeline />
      </RequireAuth>
    </div>
  );
}

function Timeline() {
  const { data, isLoading, error } = useSkillEvents();
  const events = Array.isArray(data) ? data : (data?.events ?? []);
  return (
    <Panel>
      <PanelHeader title="Timeline" description="/api/skills/events" />
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6">
          <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity feed" description={(error as Error).message} />
        </div>
      ) : events.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<Activity className="h-6 w-6" />} title="Quiet." description="No skill events yet." />
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {events.map((e, i) => (
            <li key={e.id ?? i} className="flex items-start gap-4 px-5 py-3.5">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-1 shadow-[0_0_6px_var(--color-accent-1)]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono uppercase tracking-widest">{e.skillId ?? "system"}</span>
                  <span>·</span>
                  <span>{e.type ?? "event"}</span>
                  <span className="ml-auto">{relTime(e.ts as string)}</span>
                </div>
                <div className="mt-0.5 text-sm text-foreground/90">
                  {e.message ?? <span className="font-mono text-[11px] text-muted-foreground">{JSON.stringify(e)}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}