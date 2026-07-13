import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/guide")({
  beforeLoad: () => {
    throw redirect({ to: "/app/living" });
  },
});
