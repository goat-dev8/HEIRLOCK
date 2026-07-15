import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/site/logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Shield, Wallet, Menu, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PRIMARY_NAV = [
  {
    to: "/app/living" as const,
    label: "Partner",
    description: "What changed",
    icon: Scale,
  },
  {
    to: "/app/wealth" as const,
    label: "Wealth",
    description: "Holdings & trade",
    icon: Wallet,
  },
  {
    to: "/app/continuity" as const,
    label: "Continuity",
    description: "Alive · Guardian · Heir",
    icon: Shield,
  },
] as const;

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {PRIMARY_NAV.map((n) => {
        const active =
          pathname === n.to ||
          pathname.startsWith(n.to + "/") ||
          (n.to === "/app/wealth" &&
            (pathname.startsWith("/app/portfolio") || pathname.startsWith("/app/trading")));
        const Icon = n.icon;
        return (
          <li key={n.to}>
            <Link
              to={n.to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-accent-1" />
              ) : null}
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-accent-1" : "opacity-70")} />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-none">{n.label}</span>
                <span className="mt-1 block text-[11px] leading-snug text-muted-foreground/80">
                  {n.description}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function MobileNavTrigger() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[min(100%,20rem)] border-border/50 bg-surface-0 p-0">
          <SheetHeader className="border-b border-border/40 px-5 py-4 text-left">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Logo />
            <p className="mt-2 text-xs text-muted-foreground">
              Cited decisions. Proven trades. Policy continuity.
            </p>
          </SheetHeader>
          <nav className="px-3 py-4">
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/50 bg-surface-0 lg:flex">
      <div className="flex h-14 items-center border-b border-border/40 px-5">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <div className="border-b border-border/40 px-5 py-3">
        <div className="text-[11px] leading-snug text-muted-foreground">
          Every decision cited. Every trade proven.
        </div>
      </div>
      <nav className="flex-1 px-3 pb-8 pt-4">
        <NavLinks pathname={pathname} />
      </nav>
      <div className="border-t border-border/40 px-5 py-4">
        <a
          href="https://ssi.sosovalue.com"
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-muted-foreground hover:text-foreground"
        >
          Official SSI app
        </a>
        <a
          href="https://sodex.com"
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 block text-xs text-muted-foreground hover:text-foreground"
        >
          Official SoDEX
        </a>
        <Link
          to="/status"
          className="mt-3 block text-[11px] text-muted-foreground/70 hover:text-foreground"
        >
          System status
        </Link>
      </div>
    </aside>
  );
}
