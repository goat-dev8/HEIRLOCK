import { ConnectButton } from "@/components/site/connect-button";
import { NetworkSwitcher } from "@/components/site/network-switcher";
import { HealthDot } from "@/components/site/health-dot";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/site/logo";

export function AppTopbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Link to="/" className="lg:hidden">
          <Logo />
        </Link>
        <div className="hidden flex-col lg:flex">
          {title ? (
            <h1 className="font-display text-[15px] font-semibold leading-none tracking-tight text-foreground">
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className="mt-1 text-[11px] leading-none text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <HealthDot />
          <NetworkSwitcher />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}