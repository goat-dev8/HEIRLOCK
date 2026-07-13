import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { useNetwork } from "@/lib/network-store";
import {
  ACTION_LOG_ABI,
  ATTESTATION_ABI,
  CONTINUITY_ABI,
  CONTRACTS,
  MODE_NAMES,
  WEALTH_POLICY_ABI,
} from "@/lib/contracts";
import { Panel, PanelHeader, Stat } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { short, usd } from "@/lib/format";
import { ArrowUpRight, ShieldCheck, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/app/continuity")({
  head: () => ({ meta: [{ title: "Continuity — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: ContinuityPage,
});

function ContinuityPage() {
  const [network] = useNetwork();
  const cfg = CONTRACTS[network];

  const policy = useReadContracts({
    contracts: [
      { address: cfg.addresses.wealthPolicy, abi: WEALTH_POLICY_ABI, functionName: "mode", chainId: cfg.chainId },
      { address: cfg.addresses.wealthPolicy, abi: WEALTH_POLICY_ABI, functionName: "maxNotionalUsd", chainId: cfg.chainId },
      { address: cfg.addresses.wealthPolicy, abi: WEALTH_POLICY_ABI, functionName: "owner", chainId: cfg.chainId },
      { address: cfg.addresses.wealthPolicy, abi: WEALTH_POLICY_ABI, functionName: "controller", chainId: cfg.chainId },
    ],
  });

  const actionLen = useReadContract({
    address: cfg.addresses.actionLog,
    abi: ACTION_LOG_ABI,
    functionName: "length",
    chainId: cfg.chainId,
  });
  const attestCount = useReadContract({
    address: cfg.addresses.attestationRegistry,
    abi: ATTESTATION_ABI,
    functionName: "count",
    chainId: cfg.chainId,
  });
  const continuityName = useReadContract({
    address: cfg.addresses.continuityNft,
    abi: CONTINUITY_ABI,
    functionName: "name",
    chainId: cfg.chainId,
  });

  const mode = Number(policy.data?.[0]?.result ?? 0);
  const cap = Number(policy.data?.[1]?.result ?? 0);
  const owner = policy.data?.[2]?.result as string | undefined;
  const controller = policy.data?.[3]?.result as string | undefined;

  const loading = policy.isLoading;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Wealth continuity</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Continuity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alive → Guardian → Heir modes on ValueChain. All state is on-chain.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <Stat
              label="Mode"
              value={
                <span className="flex items-center gap-2">
                  {MODE_NAMES[mode] ?? mode}
                  <Badge variant="outline" className="font-mono text-[10px]">
                    0{mode}
                  </Badge>
                </span>
              }
              hint="WealthPolicy.mode()"
            />
            <Stat label="Cap" value={usd(cap)} hint="maxNotionalUsd" />
            <Stat label="ActionLog entries" value={Number(actionLen.data ?? 0)} hint="record()" />
            <Stat label="Attestations" value={Number(attestCount.data ?? 0)} hint="AttestationRegistry.count()" />
          </>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {MODE_NAMES.map((m, idx) => (
          <Panel key={m} tone={idx === mode ? "accent" : "default"} className="p-5">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-semibold tracking-tight">{m}</div>
              <Badge variant="outline" className="font-mono text-[10px]">
                Mode 0{idx}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {idx === 0
                ? "Full skill surface. Execute under policy cap."
                : idx === 1
                  ? "Risk-off. Guardian may transition or freeze allocations."
                  : "Heir has read + attested claim path. Legal execution off-chain."}
            </p>
            {idx === mode && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent-1/30 bg-accent-1/10 px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-widest text-accent-1">
                <ShieldCheck className="h-3 w-3" /> Active
              </div>
            )}
          </Panel>
        ))}
      </div>

      <Panel>
        <PanelHeader
          title="Policy roles"
          description="Ownership and controller from WealthPolicy on this network."
          action={
            <a href={`${cfg.explorer}/address/${cfg.addresses.wealthPolicy}`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost">
                Explorer <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </a>
          }
        />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <RoleRow label="Owner" value={owner} explorer={cfg.explorer} />
          <RoleRow label="Controller (ModeController)" value={controller} explorer={cfg.explorer} />
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="ContinuityNFT"
          description={typeof continuityName.data === "string" ? continuityName.data : "Soulbound continuity token"}
          action={
            <a href={`${cfg.explorer}/address/${cfg.addresses.continuityNft}`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost">
                Explorer <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </a>
          }
        />
        <div className="p-5 text-sm text-muted-foreground">
          Soulbound (non-transferable). Minted per user; carries the continuity claim across modes.
        </div>
      </Panel>

      <Panel tone="accent" className="p-5">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 text-warning" />
          <div className="text-sm">
            <div className="font-medium text-foreground">Mode transitions</div>
            <div className="mt-1 text-muted-foreground">
              <code className="font-mono">enterGuardian()</code> and <code className="font-mono">enterHeir()</code>
              &nbsp;are called on ModeController by the addresses authorised in your WealthPolicy. Estate
              transitions have real-world legal implications — HEIRLOCK does not provide legal advice.
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <GuardianEnterButton />
              <GuardianSimulateButton />
              <EstateSandboxPanel />
            </div>
          </div>
        </div>
      </Panel>

      <ActionLogExplorer
        address={cfg.addresses.actionLog}
        explorer={cfg.explorer}
        chainId={cfg.chainId}
        length={Number(actionLen.data ?? 0)}
      />
    </div>
  );
}

function isValueChainTxHash(value: string | undefined): value is `0x${string}` {
  return !!value && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function ActionLogExplorer({
  address,
  explorer,
  chainId,
  length,
}: {
  address: `0x${string}`;
  explorer: string;
  chainId: number;
  length: number;
}) {
  const start = Math.max(0, length - 5);
  const indexes = Array.from({ length: Math.min(5, length) }, (_, i) => start + i);
  const rows = useReadContracts({
    contracts: indexes.map((i) => ({
      address,
      abi: ACTION_LOG_ABI,
      functionName: "entries" as const,
      args: [BigInt(i)] as const,
      chainId,
    })),
    query: { enabled: length > 0 },
  });

  return (
    <Panel>
      <PanelHeader
        title="ActionLog explorer"
        description="ValueChain entries only — explorer links for real 0x transaction hashes"
        action={
          <a href={`${explorer}/address/${address}`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost">
              Contract <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </a>
        }
      />
      {length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">No ActionLog entries yet.</div>
      ) : (
        <ul className="divide-y divide-border/40">
          {indexes.map((idx, i) => {
            const row = rows.data?.[i]?.result as
              | readonly [string, string, string, string, bigint]
              | undefined;
            const cid = row?.[3];
            const ts = row?.[4] != null ? Number(row[4]) * 1000 : undefined;
            return (
              <li key={idx} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-muted-foreground">#{idx}</div>
                  <div className="truncate font-mono text-xs">{short(row?.[0] as string | undefined)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {ts ? new Date(ts).toISOString() : "—"}
                  </div>
                </div>
                {isValueChainTxHash(cid) ? (
                  <a
                    href={`${explorer}/tx/${cid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent-1 hover:underline"
                  >
                    Tx <ArrowUpRight className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="font-mono text-[10px] text-muted-foreground">no 0x tx ref</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function EstateSandboxPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const { api } = await import("@/lib/api");
            const res = await api<Record<string, unknown>>("/api/fo/estate/sandbox", { auth: true });
            setResult(res);
          } catch (e) {
            setResult({ error: (e as Error).message });
          } finally {
            setBusy(false);
          }
        }}
      >
        Estate sandbox (SANDBOX)
      </Button>
      {result ? (
        <div className="rounded-md border border-border/50 bg-surface-0/50 px-3 py-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="mb-1 font-mono text-[10px]">
            {(result.status as string) ?? "SANDBOX"}
          </Badge>
          <p>{String(result.disclaimer ?? result.error ?? "")}</p>
        </div>
      ) : null}
    </div>
  );
}

function GuardianEnterButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          if (
            !window.confirm(
              "Enter Guardian mode on-chain? New SoDEX orders will be blocked until Alive is restored.",
            )
          ) {
            return;
          }
          setBusy(true);
          try {
            const { api } = await import("@/lib/api");
            const res = await api<Record<string, unknown>>("/api/fo/guardian/enter", {
              method: "POST",
              auth: true,
              body: { confirm: true, network: "mainnet" },
            });
            setResult(res);
          } catch (e) {
            setResult({ error: (e as Error).message });
          } finally {
            setBusy(false);
          }
        }}
      >
        Enter Guardian (on-chain)
      </Button>
      {result ? (
        <div className="rounded-md border border-border/50 bg-surface-0/50 px-3 py-2 text-xs">
          <div className="font-medium text-foreground">
            {String(result.status ?? (result.error ? "FAILED" : "OK"))}
          </div>
          <p className="mt-1 text-muted-foreground">
            {result.fromMode && result.toMode
              ? `${String(result.fromMode)} → ${String(result.toMode)}`
              : String(result.note ?? result.error ?? result.reason ?? "")}
          </p>
          {typeof result.txHash === "string" && result.txHash ? (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{result.txHash}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GuardianSimulateButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const { api } = await import("@/lib/api");
            const res = await api<Record<string, unknown>>("/api/fo/guardian/simulate", {
              method: "POST",
              auth: true,
              body: {},
            });
            setResult(res);
          } catch (e) {
            setResult({ error: (e as Error).message });
          } finally {
            setBusy(false);
          }
        }}
      >
        Simulate Guardian (SANDBOX)
      </Button>
      {result ? (
        <div className="rounded-md border border-border/50 bg-surface-0/50 px-3 py-2 text-xs text-muted-foreground">
          {String(result.summary ?? result.error ?? "Sandbox path previewed")}
        </div>
      ) : null}
    </div>
  );
}

function RoleRow({ label, value, explorer }: { label: string; value?: string; explorer: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-surface-0 p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="font-mono text-sm">{short(value)}</span>
        {value && (
          <a
            href={`${explorer}/address/${value}`}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}