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
    <div className={cn("flex items-start justify-between gap-4 border-b border-border/40 px-6 py-5", className)}>
      <div className="min-w-0">
        <div className="font-display text-lg font-medium tracking-tight text-foreground sm:text-xl">{title}</div>
        {description && (
          <div className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</div>
        )}
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
    <div className={cn("space-y-1.5 rounded-xl border border-border/40 bg-surface-1 p-5", className)}>
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
      {hint && <div className="text-sm text-muted-foreground">{hint}</div>}
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