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
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="fade-rise space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-1">Execution</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Wealth</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Holdings from SoDEX and SSI, trades under policy cap, fill proof on ValueChain. You sign —
          HEIRLOCK remembers and learns.
        </p>
        {decisionId ? (
          <p className="text-[15px] text-accent-1">
            Linked from Partner · decision {decisionId.slice(0, 10)}…
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
        <TabsList className="h-11">
          <TabsTrigger value="holdings" className="text-[15px]">
            Holdings
          </TabsTrigger>
          <TabsTrigger value="trade" className="text-[15px]">
            Trade
          </TabsTrigger>
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

      <p className="text-[15px] text-muted-foreground">
        Need SSI allocation?{" "}
        <Link to="/app/ssi" className="text-accent-1 hover:underline">
          Open SSI snapshot
        </Link>
      </p>
    </div>
  );
}
