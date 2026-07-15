import { createFileRoute } from "@tanstack/react-router";
import { useSosoNews } from "@/lib/api-hooks";
import { RequireAuth } from "@/components/app/require-auth";
import { EmptyState, Panel, PanelHeader } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { relTime } from "@/lib/format";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/research")({
  head: () => ({ meta: [{ title: "Research — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: ResearchPage,
});

function ResearchPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="fade-rise space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-1">Intelligence</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Research</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Live market intelligence — news, flows, and signals your Partner already weighed.
        </p>
      </div>
      <RequireAuth>
        <NewsPanel />
      </RequireAuth>
    </div>
  );
}

function NewsPanel() {
  const { data, isLoading, error } = useSosoNews();
  const items = data?.items ?? [];
  return (
    <Panel>
      <PanelHeader title="Hot" description="SoSoValue Terminal · live" />
      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <EmptyState icon={<Newspaper className="h-6 w-6" />} title="Research feed unavailable" description={(error as Error).message} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Newspaper className="h-6 w-6" />} title="No hot items right now" />
          </div>
        ) : (
          items.map((n, i) => (
            <a
              key={n.id ?? i}
              href={n.url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono uppercase tracking-widest">{n.source ?? "SoSoValue"}</span>
                  <span>·</span>
                  <span>{relTime(n.publishedAt)}</span>
                  {n.sentiment ? (
                    <Badge variant="outline" className="ml-auto font-mono text-[9px] uppercase">
                      {n.sentiment}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1 font-display text-[15px] font-medium leading-snug text-foreground group-hover:text-accent-1">
                  {n.title ?? "Untitled"}
                </div>
                {n.summary && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.summary}</p>
                )}
              </div>
              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          ))
        )}
      </div>
    </Panel>
  );
}