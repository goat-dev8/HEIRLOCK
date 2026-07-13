import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app/sidebar";
import { AppTopbar } from "@/components/app/topbar";
import { FirstRunWizard } from "@/components/app/first-run-wizard";
import { AiDrawerProvider } from "@/components/app/ai-drawer-context";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "HEIRLOCK" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  return (
    <AiDrawerProvider>
      <div className="flex min-h-[100dvh] bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(50%_40%_at_0%_0%,oklch(0.78_0.14_82_/0.06),transparent_60%)]" />
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar title="HEIRLOCK" subtitle="Cited · Proven · Continuous" />
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-7">
            <Outlet />
          </main>
        </div>
        <FirstRunWizard />
      </div>
    </AiDrawerProvider>
  );
}
