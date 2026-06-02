function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function isLocalhostHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isLocalhostUrl(url: string): boolean {
  try {
    return isLocalhostHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * URL publique de l'application pour les liens Auth (emails, redirects).
 * Priorité : env non-localhost > Origin > headers > env localhost > fallback dev.
 */
export function resolveAppOrigin(req: Request): string {
  const envCandidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  const nonLocalEnv = envCandidates.find((value) => !isLocalhostUrl(value));
  if (nonLocalEnv) {
    return trimTrailingSlash(nonLocalEnv);
  }

  const originHeader = req.headers.get("origin")?.trim();
  if (originHeader && !isLocalhostUrl(originHeader)) {
    return trimTrailingSlash(originHeader);
  }

  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host")?.trim() ||
    req.headers.get("host")?.trim();

  if (host && !isLocalhostHostname(host.split(":")[0] ?? host)) {
    return trimTrailingSlash(`${forwardedProto}://${host}`);
  }

  if (envCandidates[0]) {
    return trimTrailingSlash(envCandidates[0]);
  }

  if (host) {
    const proto = host.includes("localhost") ? "http" : forwardedProto;
    return trimTrailingSlash(`${proto}://${host}`);
  }

  return "http://localhost:3000";
}

export function isAuthOriginDebugEnabled(): boolean {
  return process.env.DEBUG === "true";
}

/** Force le continueUrl des liens Firebase Auth (oob) — le projet dev avait callbackUri=localhost. */
export function withActionContinueUrl(link: string, continueUrl: string): string {
  try {
    const parsed = new URL(link);
    parsed.searchParams.set("continueUrl", continueUrl);
    return parsed.toString();
  } catch {
    return link;
  }
}
