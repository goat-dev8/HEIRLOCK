import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-1 to-accent-2 shadow-glow">
        <div className="absolute inset-[3px] rounded-[4px] bg-background/40 backdrop-blur-sm" />
        <span className="relative z-10 text-[10px] font-bold tracking-tight text-foreground">H</span>
      </div>
      <span className="font-display text-[15px] font-semibold tracking-[0.14em] text-foreground">
        HEIRLOCK
      </span>
    </div>
  );
}