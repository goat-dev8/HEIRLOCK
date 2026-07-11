/**
 * CORS / SIWE helpers for local + Vercel frontend hosts.
 */

export function parseOriginList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isVercelAppOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:") return false;
    return (
      u.hostname === "vercel.app" ||
      u.hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

export function isLocalOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return (
      (u.hostname === "localhost" || u.hostname === "127.0.0.1") &&
      (u.protocol === "http:" || u.protocol === "https:")
    );
  } catch {
    return false;
  }
}

export function isAllowedCorsOrigin(origin: string | undefined, allowlist: string[]): boolean {
  if (!origin) return true;
  if (allowlist.includes(origin)) return true;
  if (isLocalOrigin(origin)) return true;
  if (isVercelAppOrigin(origin)) return true;
  return false;
}

export function resolveSiweFromOrigin(input: {
  originHeader?: string;
  configuredDomain: string;
  configuredUri: string;
  corsAllowlist: string[];
}): { domain: string; uri: string } {
  const domains = parseOriginList(input.configuredDomain);
  const primaryDomain = domains[0] || "localhost";
  const primaryUri = input.configuredUri || "http://localhost:8080";

  if (!input.originHeader) {
    return { domain: primaryDomain, uri: primaryUri };
  }

  try {
    const u = new URL(input.originHeader);
    const host = u.hostname;
    const origin = u.origin;

    const allowed =
      domains.includes(host) ||
      domains.includes(u.host) ||
      input.corsAllowlist.includes(origin) ||
      isLocalOrigin(origin) ||
      isVercelAppOrigin(origin);

    if (!allowed) {
      return { domain: primaryDomain, uri: primaryUri };
    }

    return { domain: host, uri: origin };
  } catch {
    return { domain: primaryDomain, uri: primaryUri };
  }
}

export function isAllowedSiweDomain(
  domain: string,
  configuredDomain: string,
  corsAllowlist: string[],
): boolean {
  const domains = parseOriginList(configuredDomain);
  if (domains.includes(domain)) return true;
  if (domain === "localhost" || domain === "127.0.0.1") return true;
  if (domain === "vercel.app" || domain.endsWith(".vercel.app")) return true;
  // Also accept if any CORS origin matches this host
  for (const o of corsAllowlist) {
    try {
      if (new URL(o).hostname === domain) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
