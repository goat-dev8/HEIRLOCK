import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/health")({
  beforeLoad: () => {
    throw redirect({ to: "/status" });
  },
});
