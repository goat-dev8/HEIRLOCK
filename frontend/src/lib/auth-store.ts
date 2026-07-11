import { useSyncExternalStore } from "react";
import { getToken } from "./api";

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("heirlock:auth", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("heirlock:auth", cb);
    window.removeEventListener("storage", cb);
  };
}

export function useToken(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => getToken(),
    () => null,
  );
}