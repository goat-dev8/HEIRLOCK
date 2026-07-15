import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { RequireAuth } from "@/components/app/require-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioInner } from "@/routes/app.portfolio";
import { TradingWorkspace } from "@/routes/app.trading";

const searchSchema = z.object({
  tab: z.enum(["holdings", "trade"]).catch("holdings"),
  decisionId: z.string().min(1).optional(),
});

export const Route = createFileRoute("/app/wealth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Wealth — HEIRLOCK" }, { name: "robots", content: "noindex" }],
  }),
  component: WealthPage,
});

function WealthPage() {
  const { tab, decisionId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const active = tab === "trade" ? "trade" : "holdings";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Wealth</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Review holdings, then execute under policy. Every order is signed by your wallet and
          verified against SoDEX history, trades, and balances.
        </p>
        {decisionId ? (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-accent-1">
            Linked Partner decision · {decisionId.slice(0, 10)}…
          </p>
        ) : null}
      </div>

      <Tabs
        value={active}
        onValueChange={(next) => {
          void navigate({
            search: {
              tab: next === "trade" ? "trade" : "holdings",
              ...(decisionId ? { decisionId } : {}),
            },
          });
        }}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="trade">Trade</TabsTrigger>
        </TabsList>
        <TabsContent value="holdings" className="mt-0">
          <RequireAuth>
            <PortfolioInner />
          </RequireAuth>
        </TabsContent>
        <TabsContent value="trade" className="mt-0">
          <RequireAuth>
            <TradingWorkspace decisionId={decisionId} />
          </RequireAuth>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Need SSI allocation?{" "}
        <Link to="/app/ssi" className="text-accent-1 hover:underline">
          Open SSI snapshot
        </Link>
      </p>
    </div>
  );
}
