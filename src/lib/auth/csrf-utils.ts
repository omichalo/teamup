import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Génère un token CSRF basé sur l'UID de l'utilisateur et un secret.
 * Utilise HMAC-SHA256 pour signer le token et éviter de divulguer le secret.
 */
export async function generateCSRFToken(uid: string): Promise<string> {
  // Le secret CSRF doit être défini via la variable d'environnement CSRF_SECRET
  const secret = process.env.CSRF_SECRET;
  
  if (!secret) {
    throw new Error(
      "CSRF_SECRET environment variable is required. " +
      "Please configure it in your environment variables or Firebase App Hosting secrets."
    );
  }
  
  // Utiliser HMAC pour signer le token avec l'UID et un timestamp
  const timestamp = Date.now();
  const hmac = createHmac("sha256", secret);
  hmac.update(`${uid}:${timestamp}`);
  const signature = hmac.digest("hex");
  
  // Le token final contient l'UID, le timestamp et la signature
  return Buffer.from(`${uid}:${timestamp}:${signature}`).toString("base64");
}

/**
 * Valide un token CSRF en le comparant avec celui stocké dans le cookie.
 * Utilise timingSafeEqual pour prévenir les attaques temporelles.
 * @param token - Le token à valider. S'il n'est pas fourni, il sera extrait du header X-CSRF-Token.
 * @param uid - L'UID de l'utilisateur pour le binding du token (recommandé)
 */
export async function validateCSRFToken(
  token?: string | null,
  uid?: string
): Promise<boolean> {
  let providedToken = token;

  // Si le token n'est pas fourni explicitement, essayer de le récupérer du header
  if (!providedToken) {
    const headerList = await headers();
    providedToken = headerList.get("x-csrf-token");
  }

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
      console.error("[CSRF] CSRF_SECRET is missing");
      return false;
    }

    // Décoder le token fourni
    try {
      const decoded = Buffer.from(providedToken, "base64").toString("utf-8");
      const [tokenUid, timestampStr, signature] = decoded.split(":");
      
      if (!tokenUid || !timestampStr || !signature) {
        return false;
      }

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      const expirationMs = 24 * 60 * 60 * 1000; // 24 heures

      // Vérifier l'expiration (24h)
      if (isNaN(timestamp) || now - timestamp > expirationMs) {
        return false;
      }

      // Vérifier le binding à l'utilisateur si l'UID est fourni
      if (uid && tokenUid !== uid) {
        return false;
      }

      // Re-générer la signature attendue
      const hmac = createHmac("sha256", secret);
      hmac.update(`${tokenUid}:${timestampStr}`);
      const expectedSignature = hmac.digest("hex");

      // Comparaison sécurisée des signatures (Timing-safe)
      const sigBuf = Buffer.from(signature);
      const expectedSigBuf = Buffer.from(expectedSignature);
      
      if (sigBuf.length !== expectedSigBuf.length || !timingSafeEqual(sigBuf, expectedSigBuf)) {
        return false;
      }

      // Comparaison sécurisée avec le token stocké dans le cookie
      const providedTokenBuf = Buffer.from(providedToken);
      const cookieBuf = Buffer.from(csrfCookie);

      if (providedTokenBuf.length !== cookieBuf.length) {
        return false;
      }

      return timingSafeEqual(providedTokenBuf, cookieBuf);
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
  // Priorité: APP_URL (runtime serveur) > NEXT_PUBLIC_APP_URL
  // APP_URL est disponible uniquement au runtime serveur (Firebase App Hosting)
  const expectedOrigin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const expectedHostname = expectedOrigin ? extractHostname(expectedOrigin) : null;

  // Log de debug en production pour diagnostiquer les problèmes
  if (process.env.NODE_ENV === "production" && process.env.DEBUG === "true") {
    console.log("[validateOrigin] Début de validation:", {
      origin: origin || null,
      referer: referer || null,
      host: host || null,
      APP_URL: process.env.APP_URL || null,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
      expectedOrigin: expectedOrigin || null,
      expectedHostname: expectedHostname || null,
    });
  }

  if (expectedOrigin && expectedHostname) {
    const normalizedExpected = normalizeHostname(expectedHostname);

    // Vérifier l'origine
    if (origin) {
      try {
        const originHostname = extractHostname(origin);
        if (originHostname) {
          const normalizedOrigin = normalizeHostname(originHostname);
          const isValid = normalizedOrigin === normalizedExpected;
          
          if (!isValid && process.env.NODE_ENV === "production" && process.env.DEBUG === "true") {
            console.warn("[validateOrigin] Origin mismatch:", {
              originRaw: origin,
              originHostname: originHostname,
              originNormalized: normalizedOrigin,
              expectedOrigin,
              expectedHostname,
              expectedNormalized: normalizedExpected,
            });
          }
          
          if (isValid) return true;
        }
      } catch (error) {
        if (process.env.NODE_ENV === "production" && process.env.DEBUG === "true") {
          console.warn("[validateOrigin] Erreur lors de la validation de l'origine:", error);
        }
      }
    }

    // Vérifier le referer
    if (referer) {
      try {
        const refererHostname = extractHostname(referer);
        if (refererHostname) {
          const normalizedReferer = normalizeHostname(refererHostname);
          const isValid = normalizedReferer === normalizedExpected;
          
          if (!isValid && process.env.NODE_ENV === "production" && process.env.DEBUG === "true") {
            console.warn("[validateOrigin] Referer mismatch:", {
              refererRaw: referer,
              refererHostname: refererHostname,
              refererNormalized: normalizedReferer,
              expectedOrigin,
              expectedHostname,
              expectedNormalized: normalizedExpected,
            });
          }
          
          if (isValid) return true;
        }
      } catch (error) {
        if (process.env.NODE_ENV === "production" && process.env.DEBUG === "true") {
          console.warn("[validateOrigin] Erreur lors de la validation du referer:", error);
        }
      }
    }

    // Si pas d'origine/referer mais un host header présent, vérifier le host
    // (utile pour les requêtes depuis le même domaine)
    if (host && !origin && !referer) {
      const normalizedHost = normalizeHostname(host);
      const isValid = normalizedHost === normalizedExpected;
      
      if (!isValid && process.env.NODE_ENV === "production" && process.env.DEBUG === "true") {
        console.warn("[validateOrigin] Host mismatch:", {
          hostRaw: host,
          hostNormalized: normalizedHost,
          expectedOrigin,
          expectedHostname,
          expectedNormalized: normalizedExpected,
        });
      }
      
      if (isValid) return true;
    }
  }

  // Si pas d'origine/referer/host et pas de domaine configuré, rejeter en production
  if (process.env.NODE_ENV === "production") {
    if (process.env.DEBUG === "true") {
      console.warn("[validateOrigin] Validation échouée - aucune origine valide trouvée", {
        origin: origin || null,
        referer: referer || null,
        host: host || null,
        expectedOrigin,
        expectedHostname: expectedHostname || null,
        normalizedExpected: expectedHostname ? normalizeHostname(expectedHostname) : null,
      });
    }
    return false;
  }

  // En développement, accepter si pas de validation possible
  return true;
}

