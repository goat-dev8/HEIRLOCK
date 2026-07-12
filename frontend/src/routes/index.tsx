import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Brain, Compass, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/site/connect-button";
import { HealthDot } from "@/components/site/health-dot";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const ECOSYSTEM = [
  { name: "SoSoValue", role: "Market intelligence" },
  { name: "SSI", role: "Smart Stable Index" },
  { name: "SoDEX", role: "Execution venue" },
  { name: "ValueChain", role: "Audit ledger" },
  { name: "$SOSO", role: "Gas · rewards" },
];

const PILLARS = [
  {
    icon: Brain,
    title: "Research",
    body: "SoSoValue flows, ETF history, and macro correlated into one Family Office layer.",
  },
  {
    icon: Layers,
    title: "Allocate",
    body: "SSI constituents and snapshots for structured allocation, not narrative rotation.",
  },
  {
    icon: Sparkles,
    title: "Execute",
    body: "Non-custodial SoDEX relay. Every order is signed under your on-chain policy cap.",
  },
  {
    icon: ShieldCheck,
    title: "Continuity",
    body: "Alive, Guardian, and Heir modes on ValueChain with policy, attestations, and NFT.",
  },
];

function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 hero-glow" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] grid-bg" />

      <header className="relative z-10 mx-auto flex h-16 max-w-7xl items-center px-6">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="ml-10 hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#pillars" className="transition-colors hover:text-foreground">
            Platform
          </a>
          <a href="#ecosystem" className="transition-colors hover:text-foreground">
            Ecosystem
          </a>
          <a href="#continuity" className="transition-colors hover:text-foreground">
            Continuity
          </a>
          <Link to="/app/health" className="transition-colors hover:text-foreground">
            Status
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <HealthDot />
          <ConnectButton variant="ghost" />
          <Link to="/app/portfolio">
            <Button>
              Launch app <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="relative z-10 overflow-hidden pb-20 pt-14 md:pt-20">
        <motion.div
          aria-hidden
          initial={reduce ? false : { opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-y-0 right-0 z-0 w-full md:w-[62%] lg:w-[58%]"
        >
          <div className="hero-visual-mask relative h-full min-h-[26rem] w-full md:min-h-[34rem]">
            <picture>
              <source srcSet="/images/hero-continuity.webp" type="image/webp" />
              <img
                src="/images/hero-continuity.jpg"
                alt=""
                width={1920}
                height={1080}
                decoding="async"
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover object-[72%_center] opacity-[0.9] mix-blend-lighten md:object-right"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/45 to-transparent md:via-background/15" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/65" />
          </div>
        </motion.div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl lg:max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-1/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-1 shadow-[0_0_8px_var(--color-accent-1)]" />
              AI Finance OS · On-chain
            </div>
            <h1 className="mt-5 font-display text-[clamp(2.75rem,6.5vw,5.75rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-foreground">
              HEIRLOCK
              <br />
              <span className="bg-gradient-to-br from-accent-1 to-accent-2 bg-clip-text text-transparent">
                Install Skills. Build your OS.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              The AI Financial Operating System on SoSoValue. Family Office is the flagship Skill —
              research Terminal, allocate SSI, execute SoDEX, continue on ValueChain.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/app/living">
                <Button size="lg" className="h-11 px-6">
                  Enter Living Loop <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/app/guide">
                <Button size="lg" variant="ghost" className="h-11 px-6 text-foreground">
                  <Compass className="mr-2 h-4 w-4" /> System guide
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-14 overflow-hidden border-y border-border/50 bg-surface-0/40"
          >
            <div className="relative overflow-hidden py-3">
              <div className="ticker flex w-max gap-10 whitespace-nowrap px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {[...ECOSYSTEM, ...ECOSYSTEM, ...ECOSYSTEM].map((e, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-accent-1/70" />
                    <span className="text-foreground/90">{e.name}</span>
                    <span className="text-muted-foreground/70">- {e.role}</span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="pillars" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between gap-6">
          <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Skills, composed into an OS.
          </h2>
          <Link
            to="/app/skills"
            className="hidden shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
          >
            Skill registry →
          </Link>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border/60 bg-border/40 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="bg-surface-1 p-6 transition-colors hover:bg-surface-2"
              >
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-surface-0 text-accent-1">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="font-display text-lg font-medium tracking-tight">{p.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="ecosystem" className="relative z-10 border-y border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Built on SoSoValue. Load-bearing, not decorative.
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Every layer is an ecosystem primitive. Replace the stack and the app disappears with it.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/40 sm:grid-cols-2 lg:grid-cols-3">
            {ECOSYSTEM.map((e) => (
              <div key={e.name} className="flex items-baseline justify-between bg-surface-1 px-6 py-5">
                <div className="font-display text-lg font-medium tracking-tight">{e.name}</div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {e.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="continuity" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Alive today. Guardian if needed. Heir when it matters.
            </h2>
            <p className="mt-4 max-w-lg text-muted-foreground">
              WealthPolicy enforces mode, notional cap, and controller. Every transition lands on
              ActionLog and AttestationRegistry. Continuity without custody.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Alive", "Guardian", "Heir"].map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-border/60 bg-surface-1 px-3 py-1.5 font-display text-sm tracking-tight"
                >
                  {m}
                </span>
              ))}
            </div>
            <div className="mt-7">
              <Link to="/app/continuity">
                <Button variant="secondary">
                  Open continuity <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-xl border border-border/50"
          >
            <picture>
              <source srcSet="/images/section-continuity.webp" type="image/webp" />
              <img
                src="/images/section-continuity.jpg"
                alt="Brass lock and ledger on a dark desk"
                width={1600}
                height={900}
                loading="lazy"
                className="aspect-[16/10] w-full object-cover"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              AI Finance OS. On-chain.
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="https://sodex.com" target="_blank" rel="noreferrer" className="hover:text-foreground">
              SoDEX
            </a>
            <a href="https://ssi.sosovalue.com" target="_blank" rel="noreferrer" className="hover:text-foreground">
              SSI
            </a>
            <a
              href="https://main-scan.valuechain.xyz"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Explorer
            </a>
            <Link to="/app/health" className="hover:text-foreground">
              Status
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
