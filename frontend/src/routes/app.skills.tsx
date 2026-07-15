import { createFileRoute } from "@tanstack/react-router";
import { useSkills } from "@/lib/api-hooks";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/skills")({
  head: () => ({ meta: [{ title: "Skills — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: SkillsPage,
});

function SkillsPage() {
  const { data, isLoading } = useSkills();
  const qc = useQueryClient();
  const skills = data?.skills ?? [];

  async function toggle(id: string, enabled: boolean) {
    try {
      await api(`/api/skills/${encodeURIComponent(id)}/enable`, {
        method: "POST",
        auth: true,
        body: { enabled },
      });
      toast.success(`${id} ${enabled ? "enabled" : "disabled"}`);
      qc.invalidateQueries({ queryKey: ["skills"] });
    } catch (e) {
      toast.error((e as Error).message || "Update failed");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="fade-rise space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-1">Financial OS</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Skills</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Install permissioned capabilities — Research, SSI, Execution, Memory — and compose your
          Partner on the SoSoValue stack. Family Office orchestrates; every Skill exposes real tools.
        </p>
      </div>

      <Panel>
        <PanelHeader title="Registry" description="/api/skills" />
        <div className="divide-y divide-border/50">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="mx-5 my-3 h-14 rounded-md" />)
            : skills.map((s) => (
                <div key={s.id} className="flex items-start gap-5 px-5 py-4">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-surface-2 text-accent-1">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-display text-[15px] font-medium tracking-tight">{s.name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.id}</div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.modes.map((m) => (
                        <Badge key={m} variant="outline" className="font-mono text-[10px] uppercase">
                          {m}
                        </Badge>
                      ))}
                      {s.tools.map((t) => (
                        <Badge key={t} className="border-accent-1/30 bg-accent-1/10 text-accent-1 font-mono text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s.id, v)} />
                </div>
              ))}
        </div>
      </Panel>
    </div>
  );
}