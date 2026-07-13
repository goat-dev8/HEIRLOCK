import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import { short } from "@/lib/format";
import { api, setToken } from "@/lib/api";
import { useToken } from "@/lib/auth-store";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, LogOut, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";

function buildSiweMessage(params: {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  nonce: string;
  statement?: string;
}): string {
  const issuedAt = new Date().toISOString();
  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    "",
    params.statement ?? "Sign in to HEIRLOCK.",
    "",
    `URI: ${params.uri}`,
    `Version: 1`,
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

export function ConnectButton({ variant = "default" }: { variant?: "default" | "ghost" }) {
  const { address, isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { open } = useAppKit();
  const token = useToken();
  const qc = useQueryClient();
  const [signing, setSigning] = useState(false);

  async function connect() {
    try {
      await open({ view: "Connect" });
    } catch (e) {
      toast.error((e as Error).message || "Wallet connection failed");
    }
  }

  async function signIn() {
    if (!address) return;
    setSigning(true);
    try {
      const nonceRes = await api<{
        nonce: string;
        domain: string;
        uri: string;
        chainId: number;
        statement?: string;
      }>("/api/auth/nonce", { method: "POST", body: { address } });
      const message = buildSiweMessage({
        domain: nonceRes.domain,
        address,
        uri: nonceRes.uri,
        chainId: nonceRes.chainId,
        nonce: nonceRes.nonce,
        statement: nonceRes.statement,
      });
      const signature = await signMessageAsync({ message });
      const verify = await api<{ token: string }>("/api/auth/verify", {
        method: "POST",
        body: { message, signature },
      });
      setToken(verify.token);
      qc.invalidateQueries();
      toast.success("Signed in to HEIRLOCK");
    } catch (e) {
      toast.error((e as Error).message || "Sign-in failed");
    } finally {
      setSigning(false);
    }
  }

  async function logout() {
    setToken(null);
    await disconnectAsync().catch(() => undefined);
    qc.clear();
  }

  if (!isConnected) {
    return (
      <Button variant={variant} onClick={connect}>
        <Wallet className="mr-2 h-4 w-4" />
        Connect wallet
      </Button>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={signIn} disabled={signing}>
          {signing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Disconnect">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="font-mono text-xs">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-success shadow-[0_0_6px_var(--color-success)]" />
          {short(address)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-mono text-[11px] break-all">{address}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => open({ view: "Account" })}>
          <Wallet className="mr-2 h-4 w-4" /> Wallet
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
