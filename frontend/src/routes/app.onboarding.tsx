import { createFileRoute } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { useToken } from "@/lib/auth-store";
import { useAuthMe, useSodexAccount, useVerifySodexAccount } from "@/lib/api-hooks";
import { useNetwork } from "@/lib/network-store";
import { env } from "@/lib/env";
import { Panel } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/site/connect-button";
import { ArrowUpRight, Check, Circle, Compass, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
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
    { done: isConnected, title: "Connect wallet", body: "Use MetaMask or any injected wallet.", action: <ConnectButton variant="ghost" /> },
    {
      done: !!token,
      title: "Sign in with Ethereum",
      body: "SIWE creates a scoped session. No custody, no keys shared.",
      action: !token && isConnected ? <ConnectButton variant="ghost" /> : null,
    },
    {
      done: !!me.data,
      title: "Load account profile",
      body: "GET /api/auth/me — includes sodexAccounts + WealthPolicy state.",
    },
    {
      done: !!account.data?.verified,
      title: `Enable + verify SoDEX (${network})`,
      body: "Open official SoDEX → Enable Trading → return here and verify so HEIRLOCK stores your aid.",
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
    { done: false, title: "Run your first research brief", body: "Ask the AI to summarise BTC ETF flows this week." },
    { done: false, title: "Prepare a capped mainnet or testnet order", body: "Prepare → EIP-712 sign → place. Mainnet notional capped at $1." },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Get started</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Onboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">Six steps to a real, personalised HEIRLOCK workspace.</p>
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
              </div>
              {s.action ? <div className="shrink-0">{s.action}</div> : null}
            </div>
          ))}
        </div>
      </Panel>

      <Panel tone="accent" className="flex items-start gap-3 p-5">
        <Compass className="mt-0.5 h-5 w-5 text-accent-1" />
        <div className="text-sm">
          <div className="font-medium text-foreground">Recommended path</div>
          <div className="mt-1 text-muted-foreground">
            Start on testnet for muscle memory, then flip to mainnet once you're comfortable with prepare → sign → place. Mainnet notional stays capped at $1 while HEIRLOCK is in mainnet-limited profile.
          </div>
        </div>
      </Panel>
    </div>
  );
}