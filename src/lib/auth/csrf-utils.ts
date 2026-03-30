import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Génère un token CSRF basé sur l'UID de l'utilisateur et un secret.
 * Utilise HMAC-SHA256 pour éviter l'exposition du secret (Double-Submit Cookie).
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
  // 🛡️ Sentinel: Use HMAC-SHA256 to sign the token instead of simple concatenation
  // to prevent leaking the secret in the base64 string.
  const hmac = createHmac("sha256", secret);
  hmac.update(`${uid}:${timestamp}`);
  const signature = hmac.digest("hex");
  
  // Format: uid:timestamp:signature (all base64 encoded)
  return Buffer.from(`${uid}:${timestamp}:${signature}`).toString("base64");
}

/**
 * Valide un token CSRF en utilisant timingSafeEqual pour prévenir les attaques temporelles.
 * Vérifie également que le token correspond à celui stocké dans le cookie __csrf.
 */
export async function validateCSRFToken(
  providedToken: string | null | undefined,
  uid?: string
): Promise<boolean> {
  let token = providedToken;

  // 🛡️ Sentinel: Automatically attempt to retrieve the token from the X-CSRF-Token header
  // if not explicitly passed, for better integration with client-side requests.
  if (!token) {
    try {
      const headersList = await headers();
      token = headersList.get("x-csrf-token");
    } catch {
      // headers() might fail in non-request contexts
    }
  }

  if (!token) {
    return false;
  }

  try {
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get("__csrf")?.value;

    // Double Submit Cookie: token must match the value stored in the cookie
    if (!csrfCookie || token !== csrfCookie) {
      return false;
    }

    const secret = process.env.CSRF_SECRET;
    if (!secret) {
      console.error("[CSRF] CSRF_SECRET is missing");
      return false;
    }

    // Décoder le token fourni [uid, timestamp, signature]
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;

    const [tokenUid, timestamp, signature] = parts;

    // Si un UID est fourni (ex: depuis la session), vérifier qu'il correspond
    if (uid && tokenUid !== uid) {
      return false;
    }

    // Re-générer la signature attendue avec le secret
    const hmac = createHmac("sha256", secret);
    hmac.update(`${tokenUid}:${timestamp}`);
    const expectedSignature = hmac.digest("hex");

    // 🛡️ Sentinel: Use timingSafeEqual to prevent timing attacks.
    // Note: buffers must have exactly the same length.
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedSignatureBuffer);
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

