/**
 * Evidence flow story — how market → memory → debate → decision connects.
 */
import { motion } from "framer-motion";

const NODES = [
  { id: "market", label: "Market", x: 56, y: 48 },
  { id: "memory", label: "Memory", x: 200, y: 48 },
  { id: "debate", label: "Debate", x: 344, y: 48 },
  { id: "you", label: "You", x: 488, y: 48 },
  { id: "chain", label: "Chain", x: 632, y: 48 },
] as const;

export function EvidenceFlowStory() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-surface-0/80 px-4 py-5 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Evidence flow</p>
      <p className="mt-1 max-w-lg text-base leading-relaxed text-foreground/90">
        Live sources feed memory. Debate cites both. You approve. The chain proves it.
      </p>
      <svg
        viewBox="0 0 688 96"
        className="mt-4 h-auto w-full"
        role="img"
        aria-label="Evidence flow: Market, Memory, Debate, You, Chain"
      >
        <defs>
          <linearGradient id="evidence-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.78 0.14 82)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="oklch(0.78 0.14 82)" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <motion.path
          d="M72 40 H616"
          stroke="url(#evidence-line)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        {NODES.map((n, i) => (
          <g key={n.id}>
            <motion.rect
              x={n.x - 40}
              y={n.y - 22}
              width={80}
              height={36}
              rx={10}
              fill="oklch(0.205 0.012 260)"
              stroke="oklch(1 0 0 / 0.14)"
              strokeWidth="1.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
            />
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              fill="oklch(0.965 0.005 250)"
              style={{ fontSize: 13, fontFamily: "Inter Tight, system-ui, sans-serif", fontWeight: 600 }}
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
