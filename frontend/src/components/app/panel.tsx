import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted" | "accent";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-surface-1",
        tone === "muted" && "bg-surface-0",
        tone === "accent" && "border-accent-1/30 bg-gradient-to-br from-accent-1/5 to-transparent",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-border/50 px-5 py-4", className)}>
      <div className="min-w-0">
        <div className="font-display text-[13px] font-medium tracking-tight text-foreground">{title}</div>
        {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1 rounded-lg border border-border/50 bg-surface-1 p-4", className)}>
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-surface-0/60 px-6 py-14 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <div className="font-display text-sm font-medium text-foreground">{title}</div>
      {description && <div className="max-w-md text-sm text-muted-foreground">{description}</div>}
      {action}
    </div>
  );
}