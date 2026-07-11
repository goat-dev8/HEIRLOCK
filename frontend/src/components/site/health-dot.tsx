import { useHealth } from "@/lib/api-hooks";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function HealthDot() {
  const { data, isLoading, isError } = useHealth();
  const ok = data?.status === "ok" && !isError;
  const cls = isLoading
    ? "bg-muted-foreground/50 animate-pulse"
    : ok
      ? "bg-success shadow-[0_0_8px_var(--color-success)]"
      : "bg-destructive";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-surface-1 px-2.5 py-1 text-[11px] text-muted-foreground sm:flex">
            <span className={"h-1.5 w-1.5 rounded-full " + cls} />
            <span className="font-mono tracking-wide">{isLoading ? "…" : ok ? "OPERATIONAL" : "DEGRADED"}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs font-mono text-[11px]">
          {data ? `profile: ${data.profile ?? "—"} · ${new Date(data.ts ?? Date.now()).toLocaleTimeString()}` : "checking backend…"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}