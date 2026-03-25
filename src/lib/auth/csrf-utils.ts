import { cookies, headers } from "next/headers";
import crypto from "node:crypto";

/**
 * Génère un token CSRF basé sur l'UID de l'utilisateur et un secret.
 * Le token est signé avec HMAC-SHA256 pour garantir son intégrité.
 */
export async function generateCSRFToken(uid: string): Promise<string> {
  const secret = process.env.CSRF_SECRET;
  
  if (!secret) {
    throw new Error(
      "CSRF_SECRET environment variable is required. " +
      "Please configure it in your environment variables or Firebase App Hosting secrets."
    );
  }
  
  const timestamp = Date.now().toString();
  const data = `${uid}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");
  
  return Buffer.from(`${data}:${signature}`).toString("base64");
}

/**
 * Valide un token CSRF en le comparant avec celui stocké dans le cookie.
 * Utilise timingSafeEqual pour prévenir les attaques temporelles.
 * Si aucun token n'est fourni, tente de le récupérer depuis le header 'X-CSRF-Token'.
 */
export async function validateCSRFToken(
  providedToken?: string | null,
  uid?: string
): Promise<boolean> {
  let token = providedToken;

  if (!token) {
    const headersList = await headers();
    token = headersList.get("X-CSRF-Token");
  }

  if (!token) {
    return false;
  }

  try {
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get("__csrf")?.value;

    if (!csrfCookie) {
      return false;
    }

    const secret = process.env.CSRF_SECRET;
    if (!secret) {
      console.error("[CSRF] CSRF_SECRET is missing");
      return false;
    }

    // Vérification de l'égalité stricte entre le token fourni et le cookie
    // en utilisant timingSafeEqual pour la sécurité
    const providedBuffer = Buffer.from(token);
    const cookieBuffer = Buffer.from(csrfCookie);

    if (providedBuffer.length !== cookieBuffer.length) {
      return false;
    }

    if (!crypto.timingSafeEqual(providedBuffer, cookieBuffer)) {
      return false;
    }

    // Valider le format et l'UID si nécessaire
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const [tokenUid, timestamp, signature] = decoded.split(":");
      
      if (!tokenUid || !timestamp || !signature) {
        return false;
      }

      if (uid && tokenUid !== uid) {
        return false;
      }

      // Vérifier la validité de la signature
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${tokenUid}:${timestamp}`)
        .digest("hex");

      return signature === expectedSignature;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Normalise un hostname en retirant le préfixe www. pour la comparaison
 */
function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

/**
 * Extrait le hostname d'une URL, en gérant les cas où l'URL peut être incomplète
 */
function extractHostname(url: string): string | null {
  try {
    const urlWithProtocol = url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
    return new URL(urlWithProtocol).hostname;
  } catch {
    return null;
  }
}

/**
 * Vérifie l'origine de la requête pour prévenir les attaques CSRF.
 */
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  if (process.env.NODE_ENV === "development") {
    if (origin && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
      return true;
    }
    if (referer && (referer.includes("localhost") || referer.includes("127.0.0.1"))) {
      return true;
    }
    if (host && (host.includes("localhost") || host.includes("127.0.0.1"))) {
      return true;
    }
  }

  const expectedOrigin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const expectedHostname = expectedOrigin ? extractHostname(expectedOrigin) : null;

  if (expectedOrigin && expectedHostname) {
    const normalizedExpected = normalizeHostname(expectedHostname);

    if (origin) {
      try {
        const originHostname = extractHostname(origin);
        if (originHostname) {
          const normalizedOrigin = normalizeHostname(originHostname);
          if (normalizedOrigin === normalizedExpected) return true;
        }
      } catch {}
    }

    if (referer) {
      try {
        const refererHostname = extractHostname(referer);
        if (refererHostname) {
          const normalizedReferer = normalizeHostname(refererHostname);
          if (normalizedReferer === normalizedExpected) return true;
        }
      } catch {}
    }

    if (host && !origin && !referer) {
      const normalizedHost = normalizeHostname(host);
      if (normalizedHost === normalizedExpected) return true;
    }
  }

  return process.env.NODE_ENV !== "production";
}
