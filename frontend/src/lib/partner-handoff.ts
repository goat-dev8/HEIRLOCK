/** Partner decision handoff: Approve → Wealth Sign with durable decisionId. */
const KEY = "heirlock.partner.decisionId";

export function storePartnerDecisionId(decisionId: string): void {
  try {
    sessionStorage.setItem(KEY, decisionId);
  } catch {
    /* private mode / SSR */
  }
}

export function readPartnerDecisionId(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPartnerDecisionId(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Format drift / decimal deltas for Partner digest (avoid float noise). */
export function formatPulseDelta(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-9) {
      return String(Math.round(value));
    }
    const abs = Math.abs(value);
    if (abs >= 100) return value.toFixed(0);
    if (abs >= 1) return value.toFixed(2);
    return value.toFixed(4);
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n) && value.trim() !== "" && !/[a-zA-Z-]/.test(value.replace(/^[+-]/, ""))) {
      return formatPulseDelta(n);
    }
    // ISO timestamps stay as-is (trimmed)
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 19) + "Z";
    return value;
  }
  return String(value);
}
