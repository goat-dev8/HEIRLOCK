import { useToken } from "@/lib/auth-store";
import { ConnectButton } from "@/components/site/connect-button";
import { Panel } from "./panel";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useToken();
  if (token) return <>{children}</>;
  return (
    <Panel className="p-10">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-surface-2 text-accent-1">
          <Lock className="h-5 w-5" />
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Sign in to continue</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Connect your wallet, then sign a one-time message. HEIRLOCK never holds your keys.
        </p>
        <ConnectButton />
      </div>
    </Panel>
  );
}