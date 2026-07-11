import { env } from "./env";

const TOKEN_KEY = "heirlock.jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("heirlock:auth"));
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

function buildUrl(path: string, query?: ApiOptions["query"]) {
  const url = new URL(path.startsWith("http") ? path : `${env.API_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { body, auth = false, query, timeoutMs = 45000, headers, ...rest } = opts;
  const url = buildUrl(path, query);
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);

  const h = new Headers(headers);
  if (body !== undefined) h.set("content-type", "application/json");
  if (auth) {
    const t = getToken();
    if (t) h.set("authorization", `Bearer ${t}`);
  }

  const attempts = 3;
  let lastErr: unknown;
  try {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, {
          ...rest,
          headers: h,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
        const ct = res.headers.get("content-type") || "";
        const data = ct.includes("application/json") ? await res.json().catch(() => null) : await res.text();
        if (!res.ok) {
          const msg =
            (data && typeof data === "object" && "error" in data && String((data as { error: unknown }).error)) ||
            `Request failed (${res.status})`;
          // Retry cold-start / gateway blips
          if ((res.status >= 502 && res.status <= 504) && i < attempts - 1) {
            await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
            continue;
          }
          throw new ApiError(msg, res.status, data);
        }
        return data as T;
      } catch (err) {
        lastErr = err;
        if (err instanceof ApiError) throw err;
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("API request failed");
  } finally {
    clearTimeout(to);
  }
}