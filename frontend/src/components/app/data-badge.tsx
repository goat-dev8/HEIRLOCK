import { cn } from "@/lib/utils";

export type DataStatus = "LIVE" | "SANDBOX" | "UNAVAILABLE" | "CACHED";

const STYLES: Record<DataStatus, string> = {
  LIVE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  SANDBOX: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  UNAVAILABLE: "border-border/60 bg-surface-2 text-muted-foreground",
  CACHED: "border-sky-500/40 bg-sky-500/10 text-sky-200",
};

export function DataBadge({
  status,
  className,
}: {
  status: DataStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
        STYLES[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
