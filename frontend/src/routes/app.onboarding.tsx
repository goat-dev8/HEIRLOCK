import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { useToken } from "@/lib/auth-store";
import { useAuthMe, useSodexAccount, useVerifySodexAccount } from "@/lib/api-hooks";
import { useNetwork } from "@/lib/network-store";
import { env } from "@/lib/env";
import { Panel } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/site/connect-button";
import { ArrowUpRight, Check, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding - HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { isConnected } = useAccount();
  const token = useToken();
  const me = useAuthMe();
  const account = useSodexAccount();
  const verify = useVerifySodexAccount();
  const [network] = useNetwork();
  const sodexUrl = network === "mainnet" ? env.SODEX.mainnetAppUrl : env.SODEX.testnetAppUrl;

  const steps = [
    {
      done: isConnected,
      title: "Connect wallet",
      body: "Use MetaMask or any injected wallet on ValueChain-compatible EVM.",
      action: <ConnectButton variant="ghost" />,
    },
    {
      done: !!token,
      title: "Sign in with Ethereum",
      body: "SIWE creates a scoped HEIRLOCK session. No custody. No shared keys.",
      action: !token && isConnected ? <ConnectButton variant="ghost" /> : null,
    },
    {
      done: !!me.data,
      title: "Load Family Office profile",
      body: "Wallet session unlocks SoDEX accounts and WealthPolicy state for this address.",
    },
    {
      done: !!account.data?.verified,
      title: `Enable + verify SoDEX (${network})`,
      body: "Open official SoDEX → Enable Trading → return and verify so HEIRLOCK stores your aid.",
      action: (
        <div className="flex flex-wrap gap-2">
          <a href={account.data?.enableTradingUrl ?? sodexUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary">
              Open SoDEX <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </a>
          {token ? (
            <Button
              size="sm"
              disabled={verify.isPending || !!account.data?.verified}
              onClick={async () => {
                try {
                  const res = await verify.mutateAsync();
                  toast.success(`Verified aid ${res.accountId}`);
                } catch (e) {
                  toast.error((e as Error).message || "Verify failed");
                }
              }}
            >
              {verify.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Verify account
            </Button>
          ) : null}
        </div>
      ),
    },
    {
      done: false,
      title: "Read portfolio marks",
      body: "Balances come from your SoDEX aid. USD uses official spot lastPx (vUSDC = $1).",
      action: (
        <Link to="/app/portfolio">
          <Button size="sm" variant="ghost">
            Open portfolio
          </Button>
        </Link>
      ),
    },
    {
      done: false,
      title: "Research + SSI, then trade under policy",
      body: "Ask Family Office AI, inspect SSI weights (ssimag7), then prepare a capped SoDEX order.",
      action: (
        <div className="flex flex-wrap gap-2">
          <Link to="/app/ai">
            <Button size="sm" variant="ghost">
              AI
            </Button>
          </Link>
          <Link to="/app/ssi">
            <Button size="sm" variant="ghost">
              SSI
            </Button>
          </Link>
          <Link to="/app/trading">
            <Button size="sm" variant="ghost">
              Trading
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Onboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          HEIRLOCK is a non-custodial AI Family Office on SoSoValue. Complete these steps once per
          wallet and environment.
        </p>
      </div>

      <Panel>
        <div className="divide-y divide-border/50">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4">
              <div
                className={
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border " +
                  (s.done
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border/60 bg-surface-2 text-muted-foreground")
                }
              >
                {s.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[14px] font-medium">{s.title}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{s.body}</div>
                {s.action ? <div className="mt-3">{s.action}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
