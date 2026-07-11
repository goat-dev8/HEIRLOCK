import { createFileRoute } from "@tanstack/react-router";
import { Panel, PanelHeader } from "@/components/app/panel";
import { useAuthMe, useConfig } from "@/lib/api-hooks";
import { useNetwork } from "@/lib/network-store";
import { NetworkSwitcher } from "@/components/site/network-switcher";
import { ConnectButton } from "@/components/site/connect-button";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const cfg = useConfig();
  const me = useAuthMe();
  const [network] = useNetwork();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">System</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Settings</h1>
      </div>

      <Panel>
        <PanelHeader title="Session" description="Wallet + SIWE" />
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="text-sm">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Address</div>
            <div className="mt-1 font-mono text-xs">{me.data?.address ?? "not signed in"}</div>
          </div>
          <ConnectButton />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Network" description="Active ValueChain" />
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="text-sm text-muted-foreground">
            Current: <span className="font-mono uppercase text-foreground">{network}</span>
          </div>
          <NetworkSwitcher />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Environment" description="/api/config/environment" />
        {cfg.isLoading ? (
          <Skeleton className="mx-5 my-4 h-40 rounded-md" />
        ) : (
          <div className="divide-y divide-border/40 text-sm">
            <Row k="Profile" v={cfg.data?.profile} />
            <Row k="API" v={cfg.data?.apiPublicUrl ?? env.API_URL} />
            <Row k="AI provider" v={cfg.data?.ai.primaryProvider} />
            <Row k="SoDEX mainnet" v={cfg.data?.sodex.mainnetAppUrl} />
            <Row k="SoDEX testnet" v={cfg.data?.sodex.testnetAppUrl} />
            <Row k="SSI" v={cfg.data?.ssi.appUrl} />
          </div>
        )}
      </Panel>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="font-mono text-xs text-foreground/90">{v ?? "—"}</div>
    </div>
  );
}