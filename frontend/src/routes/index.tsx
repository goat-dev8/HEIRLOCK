import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
    body: "SoSoValue market intelligence, ETF flow history, and macro correlated by an AI Family Office layer.",
  },
  {
    icon: Layers,
    title: "Allocate",
    body: "Smart Stable Index constituents and snapshots — informed structure, not narrative rotation.",
  },
  {
    icon: Sparkles,
    title: "Execute",
    body: "Non-custodial SoDEX relay. Every order is signed by your wallet under an on-chain policy cap.",
  },
  {
    icon: ShieldCheck,
    title: "Continuity",
    body: "Alive → Guardian → Heir modes on ValueChain. Wealth policy, attestations, soulbound continuity NFT.",
  },
];

function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 hero-glow" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] grid-bg" />

      <header className="relative z-10 mx-auto flex h-16 max-w-7xl items-center px-6">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="ml-10 hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#pillars" className="hover:text-foreground">Platform</a>
          <a href="#ecosystem" className="hover:text-foreground">Ecosystem</a>
          <a href="#continuity" className="hover:text-foreground">Continuity</a>
          <Link to="/app/health" className="hover:text-foreground">Status</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <HealthDot />
          <ConnectButton variant="ghost" />
          <Link to="/app/portfolio">
            <Button>Launch app <ArrowUpRight className="ml-1.5 h-4 w-4" /></Button>
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-16 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-1/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-1 shadow-[0_0_8px_var(--color-accent-1)]" />
            AI Finance OS · Live on ValueChain
          </div>
          <h1 className="mt-6 font-display text-[clamp(3rem,7vw,6.5rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-foreground">
            The AI Family Office,
            <br />
            <span className="bg-gradient-to-br from-accent-1 to-accent-2 bg-clip-text text-transparent">
              wealth that continues.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            HEIRLOCK is an AI operating system for private wealth on SoSoValue. Research with market
            intelligence, allocate through SSI, execute on SoDEX under a policy you sign — and let
            ValueChain carry the continuity across generations.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/app/portfolio">
              <Button size="lg" className="h-11 px-6">
                Enter HEIRLOCK <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/app/onboarding">
              <Button size="lg" variant="ghost" className="h-11 px-6 text-foreground">
                <Compass className="mr-2 h-4 w-4" /> View onboarding
              </Button>
            </Link>
            <span className="ml-2 hidden font-mono text-[11px] uppercase tracking-widest text-muted-foreground sm:inline">
              Non-custodial · SIWE · Mainnet cap $1
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.9 }}
          className="mt-16 overflow-hidden rounded-2xl border border-border/60 bg-surface-1/50 backdrop-blur"
        >
          <div className="relative overflow-hidden py-3">
            <div className="ticker flex w-max gap-10 whitespace-nowrap px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {[...ECOSYSTEM, ...ECOSYSTEM, ...ECOSYSTEM].map((e, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-accent-1/70" />
                  <span className="text-foreground/90">{e.name}</span>
                  <span className="text-muted-foreground/70">— {e.role}</span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section id="pillars" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Platform
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Skills, composed into an OS.
            </h2>
          </div>
          <Link to="/app/skills" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline">
            View skill registry →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-surface-1/70 p-6"
              >
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-surface-2 text-accent-1">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="font-display text-lg font-medium tracking-tight">{p.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-1/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="ecosystem" className="relative z-10 border-y border-border/60 bg-surface-0/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Ecosystem-native
              </div>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Built on SoSoValue. Load-bearing, not decorative.
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Every layer of HEIRLOCK is an ecosystem primitive. Replace the ecosystem, replace the
                app. That is the design intent.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/40 sm:grid-cols-2">
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
        </div>
      </section>

      <section id="continuity" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Life-cycle modes
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Alive today. Guardian if needed. Heir when it matters.
            </h2>
            <p className="mt-4 max-w-lg text-muted-foreground">
              A WealthPolicy contract enforces mode, notional cap and controller. ModeController
              transitions between Alive, Guardian and Heir. Every event lands on ActionLog and
              AttestationRegistry. No custody, no morbidity — a continuity primitive.
            </p>
            <div className="mt-6">
              <Link to="/app/continuity">
                <Button variant="secondary">Open continuity dashboard <ArrowUpRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface-1/70 p-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              {["Alive", "Guardian", "Heir"].map((m, idx) => (
                <div key={m} className="rounded-lg border border-border/50 bg-surface-2 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Mode 0{idx}
                  </div>
                  <div className="mt-2 font-display text-xl font-semibold tracking-tight">{m}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="rounded-md border border-border/50 bg-surface-2 p-3">
                <div className="font-mono uppercase tracking-wider">WealthPolicy</div>
                <div className="mt-1 truncate font-mono text-[11px]">0xB448…6b6C</div>
              </div>
              <div className="rounded-md border border-border/50 bg-surface-2 p-3">
                <div className="font-mono uppercase tracking-wider">ContinuityNFT</div>
                <div className="mt-1 truncate font-mono text-[11px]">0xD746…517d</div>
              </div>
            </div>
          </div>
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
            <a href="https://sodex.com" target="_blank" rel="noreferrer" className="hover:text-foreground">SoDEX</a>
            <a href="https://ssi.sosovalue.com" target="_blank" rel="noreferrer" className="hover:text-foreground">SSI</a>
            <a href="https://main-scan.valuechain.xyz" target="_blank" rel="noreferrer" className="hover:text-foreground">Explorer</a>
            <Link to="/app/health" className="hover:text-foreground">Status</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
