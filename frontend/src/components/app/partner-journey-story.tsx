/**
 * Partner journey story — lightweight animated SVG explaining the Living Partner loop.
 * No invented product claims: Pulse → Debate → Choose → Sign → Verify → Learn.
 */
import { motion } from "framer-motion";

const STEPS = [
  { id: "pulse", label: "Pulse", detail: "What changed" },
  { id: "debate", label: "Debate", detail: "Evidence" },
  { id: "choose", label: "Choose", detail: "Your call" },
  { id: "sign", label: "Sign", detail: "Your wallet" },
  { id: "verify", label: "Verify", detail: "Fill proof" },
  { id: "learn", label: "Learn", detail: "Memory" },
] as const;

export function PartnerJourneyStory({ active = 0 }: { active?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-surface-0/80 px-4 py-5 sm:px-6">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          How your Partner works
        </p>
        <p className="mt-1 max-w-md text-base leading-relaxed text-foreground/90">
          It watches while you are away, challenges itself, then waits for your signature.
        </p>
      </div>

      {/* Mobile: vertical steps */}
      <ol className="space-y-2 sm:hidden">
        {STEPS.map((step, i) => {
          const isActive = i === active;
          return (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 * i }}
              className={
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 " +
                (isActive
                  ? "border-accent-1/40 bg-accent-1/10"
                  : "border-border/40 bg-surface-1/40")
              }
            >
              <span
                className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold " +
                  (isActive ? "bg-accent-1 text-background" : "bg-surface-2 text-muted-foreground")
                }
              >
                {i + 1}
              </span>
              <div>
                <div className="text-[15px] font-medium">{step.label}</div>
                <div className="text-sm text-muted-foreground">{step.detail}</div>
              </div>
            </motion.li>
          );
        })}
      </ol>

      {/* Desktop: horizontal SVG */}
      <svg
        viewBox="0 0 720 88"
        className="hidden h-auto w-full sm:block"
        role="img"
        aria-label="Partner journey: Pulse, Debate, Choose, Sign, Verify, Learn"
      >
        <defs>
          <linearGradient id="journey-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.78 0.14 82)" stopOpacity="0.2" />
            <stop offset="50%" stopColor="oklch(0.78 0.14 82)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="oklch(0.78 0.14 82)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <motion.line
          x1="36"
          y1="34"
          x2="684"
          y2="34"
          stroke="url(#journey-line)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />

        {STEPS.map((step, i) => {
          const x = 36 + i * 129.6;
          const isActive = i === active;
          return (
            <g key={step.id}>
              <motion.circle
                cx={x}
                cy={34}
                r={isActive ? 11 : 8}
                fill={isActive ? "oklch(0.78 0.14 82)" : "oklch(0.205 0.012 260)"}
                stroke={isActive ? "oklch(0.78 0.14 82)" : "oklch(1 0 0 / 0.18)"}
                strokeWidth="2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.12 * i, type: "spring", stiffness: 260, damping: 20 }}
              />
              {isActive ? (
                <motion.circle
                  cx={x}
                  cy={34}
                  r={18}
                  fill="none"
                  stroke="oklch(0.78 0.14 82 / 0.35)"
                  strokeWidth="1.5"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                />
              ) : null}
              <text
                x={x}
                y={62}
                textAnchor="middle"
                fill="oklch(0.965 0.005 250)"
                style={{ fontSize: 13, fontFamily: "Inter Tight, system-ui, sans-serif", fontWeight: 600 }}
              >
                {step.label}
              </text>
              <text
                x={x}
                y={78}
                textAnchor="middle"
                fill="oklch(0.7 0.02 260)"
                style={{ fontSize: 11, fontFamily: "Inter Tight, system-ui, sans-serif" }}
              >
                {step.detail}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
