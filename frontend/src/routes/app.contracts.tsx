import { createFileRoute } from "@tanstack/react-router";
import { useContractsConfig } from "@/lib/api-hooks";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/contracts")({
  head: () => ({ meta: [{ title: "Contracts — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: ContractsPage,
});

function ContractsPage() {
  const { data, isLoading } = useContractsConfig();

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="fade-rise space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-1">On-chain</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Contracts</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          WealthPolicy, ModeController, ActionLog, and AttestationRegistry on ValueChain — the on-chain
          spine that binds SoDEX execution to continuity and audit.
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {(["mainnet", "testnet"] as const).map((k) => {
            const nc = data?.[k];
            if (!nc) return null;
            return (
              <Panel key={k}>
                <PanelHeader
                  title={
                    <span className="flex items-center gap-2">
                      {k === "mainnet" ? "ValueChain Mainnet" : "ValueChain Testnet"}
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">chain {nc.chainId}</Badge>
                    </span>
                  }
                  description={nc.deployed ? "Deployed · verified" : "Awaiting deployment"}
                />
                <div className="divide-y divide-border/40">
                  {Object.entries(nc.addresses).map(([name, addr]) => (
                    <div key={name} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div>
                        <div className="font-display text-[13px] font-medium">{name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{addr}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            void navigator.clipboard.writeText(addr);
                            toast.success("Address copied");
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                          aria-label="Copy address"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={`${nc.explorer}/address/${addr}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                          aria-label="Open in explorer"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}