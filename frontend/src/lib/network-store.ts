import { useSyncExternalStore } from "react";
import type { NetworkEnv } from "./env";

const KEY = "heirlock.env";
let current: NetworkEnv = "mainnet";
const subs = new Set<() => void>();

function read(): NetworkEnv {
  if (typeof window === "undefined") return current;
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "testnet" || v === "mainnet") return v;
  } catch {
    /* ignore */
  }
  return "mainnet";
}

function emit() {
  subs.forEach((cb) => cb());
}

export function setNetwork(next: NetworkEnv) {
  current = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }
  emit();
}

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function useNetwork(): [NetworkEnv, (n: NetworkEnv) => void] {
  const v = useSyncExternalStore(
    subscribe,
    () => current,
    () => "mainnet" as NetworkEnv,
  );
  return [v, setNetwork];
}

if (typeof window !== "undefined") {
  current = read();
}