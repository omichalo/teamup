import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Génère un token CSRF basé sur l'UID de l'utilisateur et un secret.
 * Le token est signé avec HMAC-SHA256 pour éviter la falsification et le vol du secret.
 */
export async function generateCSRFToken(uid: string): Promise<string> {
  const secret = process.env.CSRF_SECRET;
  
  if (!secret) {
    throw new Error(
      "CSRF_SECRET environment variable is required. " +
      "Please configure it in your environment variables or Firebase App Hosting secrets."
    );
  }
  
  const timestamp = Date.now();
  const message = `${uid}:${timestamp}`;
  // Utiliser HMAC-SHA256 pour signer le token avec le secret
  const hmac = createHmac("sha256", secret).update(message).digest("hex");
  
  // Le token final contient l'UID, le timestamp et la signature
  return Buffer.from(`${message}:${hmac}`).toString("base64");
}

/**
 * Valide un token CSRF en vérifiant sa signature HMAC et sa durée de validité.
 * @param providedToken - Le token fourni par le client
 * @param uid - L'UID de l'utilisateur (optionnel, extrait du cookie si non fourni)
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

    if (!csrfCookie || providedToken !== csrfCookie) {
      return false;
    }

    const secret = process.env.CSRF_SECRET;
    
    if (!secret) {
      console.error("[CSRF] CSRF_SECRET is missing");
      return false;
    }

    // Décoder le token
    const decoded = Buffer.from(providedToken, "base64").toString("utf-8");
    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return false;
    }

    const [tokenUid, timestampStr, providedHmac] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // 1. Vérifier l'expiration (24 heures)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (isNaN(timestamp) || Date.now() - timestamp > ONE_DAY_MS) {
      return false;
    }

    // 2. Si un UID est fourni, vérifier qu'il correspond
    if (uid && tokenUid !== uid) {
      return false;
    }

    // 3. Vérifier la signature HMAC
    const message = `${tokenUid}:${timestampStr}`;
    const expectedHmac = createHmac("sha256", secret).update(message).digest("hex");

    const providedHmacBuffer = Buffer.from(providedHmac);
    const expectedHmacBuffer = Buffer.from(expectedHmac);

    // timingSafeEqual nécessite des buffers de même longueur
    if (providedHmacBuffer.length !== expectedHmacBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedHmacBuffer, expectedHmacBuffer);
  } catch (error) {
    console.error("[CSRF] Validation error:", error);
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
    // Si l'URL ne commence pas par http:// ou https://, l'ajouter
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

  // En développement, autoriser localhost
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

  // En production, valider contre le domaine attendu
  const expectedOrigin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const expectedHostname = expectedOrigin ? extractHostname(expectedOrigin) : null;

  if (expectedOrigin && expectedHostname) {
    const normalizedExpected = normalizeHostname(expectedHostname);

    // Vérifier l'origine
    if (origin) {
      try {
        const originHostname = extractHostname(origin);
        if (originHostname) {
          const normalizedOrigin = normalizeHostname(originHostname);
          if (normalizedOrigin === normalizedExpected) return true;
        }
      } catch {
        // Ignorer les erreurs d'extraction
      }
    }

    // Vérifier le referer
    if (referer) {
      try {
        const refererHostname = extractHostname(referer);
        if (refererHostname) {
          const normalizedReferer = normalizeHostname(refererHostname);
          if (normalizedReferer === normalizedExpected) return true;
        }
      } catch {
        // Ignorer les erreurs d'extraction
      }
    }

    // Vérifier le host header si pas d'origine/referer
    if (host && !origin && !referer) {
      const normalizedHost = normalizeHostname(host);
      if (normalizedHost === normalizedExpected) return true;
    }
  }

  // En production, rejeter si aucune validation n'a réussi
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // En développement, accepter par défaut si pas de domaine configuré
  return true;
}
