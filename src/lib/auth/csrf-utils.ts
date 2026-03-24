import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Génère un token CSRF basé sur l'UID de l'utilisateur et un secret.
 * Le token est stocké dans un cookie HTTP-only pour éviter les attaques XSS.
 * 🛡️ Sentinel: Utilise HMAC-SHA256 pour signer le token et prévenir la falsification.
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
  // 🛡️ Sentinel: HMAC-SHA256 assure l'intégrité et l'authenticité du token sans exposer le secret.
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${uid}:${timestamp}`)
    .digest("hex");
  
  // Le token est composé de l'UID, du timestamp et de la signature HMAC
  return Buffer.from(`${uid}:${timestamp}:${signature}`).toString("base64");
}

/**
 * Valide un token CSRF en le comparant avec celui stocké dans le cookie.
 * @param providedToken - Le token fourni par le client
 * @param uid - L'UID de l'utilisateur (optionnel, extrait du cookie si non fourni)
 * 🛡️ Sentinel: Utilise timingSafeEqual pour prévenir les attaques par analyse temporelle.
 */
export async function validateCSRFToken(
  providedToken: string | null | undefined,
  uid?: string
): Promise<boolean> {
  if (!providedToken) {
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
      console.error("[CSRF] CSRF_SECRET environment variable is required for validation.");
      return false;
    }

    try {
      const decoded = Buffer.from(providedToken, "base64").toString("utf-8");
      const [tokenUid, timestamp, providedSignature] = decoded.split(":");
      
      if (!tokenUid || !timestamp || !providedSignature) {
        return false;
      }

      if (uid && tokenUid !== uid) {
        return false;
      }

      // 🛡️ Sentinel: Re-calculer la signature attendue pour vérification.
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${tokenUid}:${timestamp}`)
        .digest("hex");
      
      const expectedSignatureBuffer = Buffer.from(expectedSignature);
      const providedSignatureBuffer = Buffer.from(providedSignature);

      // 🛡️ Sentinel: timingSafeEqual requiert des buffers de longueur égale.
      if (expectedSignatureBuffer.length !== providedSignatureBuffer.length) {
        return false;
      }

      // 🛡️ Sentinel: Prévenir les attaques par analyse temporelle (timing attacks).
      const isSignatureValid = crypto.timingSafeEqual(
        expectedSignatureBuffer,
        providedSignatureBuffer
      );

      return isSignatureValid && providedToken === csrfCookie;
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
 * Valide que l'Origin ou le Referer correspond au domaine attendu.
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
      } catch { /* ignore */ }
    }

    if (referer) {
      try {
        const refererHostname = extractHostname(referer);
        if (refererHostname) {
          const normalizedReferer = normalizeHostname(refererHostname);
          if (normalizedReferer === normalizedExpected) return true;
        }
      } catch { /* ignore */ }
    }

    if (host && !origin && !referer) {
      const normalizedHost = normalizeHostname(host);
      if (normalizedHost === normalizedExpected) return true;
    }
  }

  return process.env.NODE_ENV !== "production";
}
