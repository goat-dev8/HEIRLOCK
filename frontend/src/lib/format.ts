export function short(addr?: string | null, n = 4): string {
  if (!addr) return "—";
  if (addr.length <= 2 * n + 2) return addr;
  return `${addr.slice(0, 2 + n)}…${addr.slice(-n)}`;
}

export function usd(n: number | string | null | undefined, opts?: { compact?: boolean }): string {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: v < 1 ? 4 : 2,
  }).format(v);
}

export function num(n: number | string | null | undefined, digits = 2): string {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function relTime(iso: string | number | Date | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = (Date.now() - t) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const sign = diff > 0 ? -1 : 1;
  if (abs < 60) return rtf.format(sign * Math.round(abs), "second");
  if (abs < 3600) return rtf.format(sign * Math.round(abs / 60), "minute");
  if (abs < 86400) return rtf.format(sign * Math.round(abs / 3600), "hour");
  return rtf.format(sign * Math.round(abs / 86400), "day");
}