import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useToken } from "@/lib/auth-store";
import { useSodexAccount, useVerifySodexAccount } from "@/lib/api-hooks";
import { useNetwork } from "@/lib/network-store";
import { env } from "@/lib/env";
import { ConnectButton } from "@/components/site/connect-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

const DONE_KEY = "heirlock.firstRun.done";

function doneKey(wallet?: string, network?: string) {
  return `${DONE_KEY}:${(wallet ?? "none").toLowerCase()}:${network ?? "mainnet"}`;
}

function isMarkedDone(wallet?: string, network?: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(doneKey(wallet, network)) === "1";
  } catch {
    return false;
  }
}

function markDone(wallet?: string, network?: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(doneKey(wallet, network), "1");
  } catch {
    /* ignore */
  }
}

export function FirstRunWizard() {
  const { address, isConnected } = useAccount();
  const token = useToken();
  const account = useSodexAccount();
  const verify = useVerifySodexAccount();
  const [network] = useNetwork();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  const verified = !!account.data?.verified;
  const complete = isConnected && !!token && verified;

  const steps = useMemo(
    () => [
      {
        id: "connect",
        title: "Connect wallet",
        body: "Use your wallet on ValueChain-compatible EVM.",
        done: isConnected,
      },
      {
        id: "siwe",
        title: "Sign in",
        body: "SIWE creates a scoped session. No custody.",
        done: !!token,
      },
      {
        id: "sodex",
        title: "Verify SoDEX",
        body: "Enable Trading on official SoDEX, then verify so HEIRLOCK stores your aid.",
        done: verified,
      },
    ],
    [isConnected, token, verified],
  );

  useEffect(() => {
    if (dismissed) return;
    if (isMarkedDone(address, network)) return;
    if (complete) {
      markDone(address, network);
      setOpen(false);
      return;
    }
    // Open when wallet missing session or SoDEX verification.
    if (!token || (token && account.isFetched && !verified)) {
      setOpen(true);
    }
  }, [address, network, token, verified, account.isFetched, complete, dismissed]);

  const sodexUrl = network === "mainnet" ? env.SODEX.mainnetAppUrl : env.SODEX.testnetAppUrl;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDismissed(true);
      }}
    >
      <DialogContent className="max-w-md border-border/60 bg-surface-0 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Get ready</DialogTitle>
          <DialogDescription>
            Three steps once per wallet. Then Home shows live evidence and the next action.
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-2 space-y-3">
          {steps.map((step, i) => (
            <li
              key={step.id}
              className="flex gap-3 rounded-lg border border-border/50 bg-surface-1/50 px-3 py-3"
            >
              <div
                className={
                  step.done
                    ? "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-1/20 text-accent-1"
                    : "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-border/60 text-[10px] text-muted-foreground"
                }
              >
                {step.done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{step.title}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.body}</p>
                {!step.done && step.id === "connect" ? (
                  <div className="mt-2">
                    <ConnectButton />
                  </div>
                ) : null}
                {!step.done && step.id === "siwe" && isConnected ? (
                  <div className="mt-2">
                    <ConnectButton />
                  </div>
                ) : null}
                {!step.done && step.id === "sodex" && token ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={account.data?.enableTradingUrl ?? sodexUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="secondary">
                        Open SoDEX <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      disabled={verify.isPending}
                      onClick={async () => {
                        try {
                          const res = await verify.mutateAsync();
                          toast.success(`Verified ${res.accountId}`);
                        } catch (e) {
                          toast.error((e as Error).message || "Verify failed");
                        }
                      }}
                    >
                      {verify.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                      Verify
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDismissed(true);
              setOpen(false);
            }}
          >
            Later
          </Button>
          {complete ? (
            <Link to="/app/living" onClick={() => markDone(address, network)}>
              <Button size="sm">Go to Home</Button>
            </Link>
          ) : (
            <Button size="sm" disabled>
              Complete steps above
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
