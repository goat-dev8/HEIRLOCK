import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/site/logo";
import {
  Activity,
  Brain,
  FileSignature,
  Compass,
  HeartPulse,
  LayoutGrid,
  LineChart,
  Newspaper,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";

const NAV = [
  { to: "/app/portfolio", label: "Portfolio", icon: Wallet, group: "Wealth" },
  { to: "/app/trading", label: "Trading", icon: LineChart, group: "Wealth" },
  { to: "/app/ssi", label: "SSI", icon: LayoutGrid, group: "Wealth" },
  { to: "/app/ai", label: "Family Office AI", icon: Brain, group: "Intelligence" },
  { to: "/app/research", label: "Research", icon: Newspaper, group: "Intelligence" },
  { to: "/app/skills", label: "Skills", icon: Sparkles, group: "Platform" },
  { to: "/app/continuity", label: "Continuity", icon: Shield, group: "Platform" },
  { to: "/app/activity", label: "Activity", icon: Activity, group: "Platform" },
  { to: "/app/contracts", label: "Contracts", icon: FileSignature, group: "System" },
  { to: "/app/health", label: "Health", icon: HeartPulse, group: "System" },
  { to: "/app/onboarding", label: "Onboarding", icon: Compass, group: "System" },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon, group: "System" },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-surface-0 lg:flex">
      <div className="flex h-14 items-center px-5">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-8 pt-2">
        {groups.map((g) => (
          <div key={g}>
            <div className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
              {g}
            </div>
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = pathname === n.to || pathname.startsWith(n.to + "/");
                const Icon = n.icon;
                return (
                  <li key={n.to}>
                    <Link
                      to={n.to}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-surface-2 text-foreground"
                          : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-accent-1" : "opacity-70")} />
                      <span>{n.label}</span>
                      {active && (
                        <span className="ml-auto h-1 w-1 rounded-full bg-accent-1 shadow-[0_0_6px_var(--color-accent-1)]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div className="px-3 pt-2 text-[10px] leading-snug text-muted-foreground/60">
          <div className="mb-1 font-mono uppercase tracking-widest">Ecosystem</div>
          SoSoValue · SSI · SoDEX · ValueChain
        </div>
      </nav>
    </aside>
  );
}