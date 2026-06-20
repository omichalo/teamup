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

/** Origine publique par projet Firebase (secours si APP_URL reste sur localhost en hébergé). */
const KNOWN_ORIGINS_BY_PROJECT: Record<string, string> = {
  "sqyping-teamup-dev":
    "https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app",
  "sqyping-teamup": "https://teamup.sqyping.fr",
};

function requestLooksLocal(req: Request): boolean {
  const parts = [
    req.headers.get("origin"),
    req.headers.get("referer"),
    req.headers.get("host"),
    req.headers.get("x-forwarded-host"),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.toLowerCase());

  return parts.some(
    (value) => value.includes("localhost") || value.includes("127.0.0.1")
  );
}

function resolveKnownProjectOrigin(): string | undefined {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (!projectId) {
    return undefined;
  }
  const known = KNOWN_ORIGINS_BY_PROJECT[projectId];
  return known ? trimTrailingSlash(known) : undefined;
}

/**
 * URL publique de l'application pour les liens Auth (emails, redirects).
 * Priorité : env non-localhost > Origin > headers > origine projet (hébergé) > env localhost > fallback dev.
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

  const knownProjectOrigin = resolveKnownProjectOrigin();
  if (knownProjectOrigin && !requestLooksLocal(req)) {
    return knownProjectOrigin;
  }

  if (envCandidates[0]) {
    return trimTrailingSlash(envCandidates[0]);
  }

  if (host) {
    const proto = host.includes("localhost") ? "http" : forwardedProto;
    return trimTrailingSlash(`${proto}://${host}`);
  }

  if (knownProjectOrigin) {
    return knownProjectOrigin;
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

export type AppAuthActionPath = "/auth/verify-email" | "/reset-password";

/**
 * Lien email pointant directement vers l'app (oobCode) au lieu du handler Firebase
 * (souvent configuré avec callbackUri=localhost sur sqyping-teamup-dev).
 */
export function buildDirectAppActionLink(
  firebaseOobLink: string,
  appOrigin: string,
  appPath: AppAuthActionPath
): string {
  const continueUrl = `${trimTrailingSlash(appOrigin)}${appPath}`;

  try {
    const parsed = new URL(firebaseOobLink);
    const oobCode = parsed.searchParams.get("oobCode");
    if (!oobCode) {
      return withActionContinueUrl(firebaseOobLink, continueUrl);
    }

    const appUrl = new URL(continueUrl);
    appUrl.searchParams.set("oobCode", oobCode);
    const mode = parsed.searchParams.get("mode");
    if (mode) {
      appUrl.searchParams.set("mode", mode);
    }
    return appUrl.toString();
  } catch {
    return withActionContinueUrl(firebaseOobLink, continueUrl);
  }
}
