import { createFileRoute, redirect } from "@tanstack/react-router";

/** AI is a contextual drawer, not a primary nav destination. */
export const Route = createFileRoute("/app/ai")({
  beforeLoad: () => {
    throw redirect({ to: "/app/living" });
  },
});
