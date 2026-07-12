import { cn } from "@/lib/utils";

export function Logo({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/brand/heirlock-mark.svg"
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 rounded-[7px] shadow-[0_0_0_1px_oklch(1_0_0_/0.06)]"
        decoding="async"
      />
      {!markOnly ? (
        <span className="font-display text-[15px] font-semibold tracking-[0.14em] text-foreground">
          HEIRLOCK
        </span>
      ) : null}
    </div>
  );
}
