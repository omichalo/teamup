import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * Durée de validité d'un token CSRF (24 heures)
 */
const CSRF_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Génère un token CSRF sécurisé basé sur l'UID de l'utilisateur, un timestamp et un secret.
 * Le token utilise HMAC-SHA256 pour garantir son intégrité.
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
  
  // Utiliser HMAC-SHA256 pour signer les données
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  // Le token final contient les données et la signature
  return Buffer.from(`${data}:${hmac}`).toString("base64");
}

/**
 * Valide un token CSRF en vérifiant sa signature, son expiration et sa présence dans le cookie.
 * @param providedToken - Le token fourni par le client (généralement via un header)
 * @param uid - L'UID de l'utilisateur pour vérifier que le token lui appartient
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

    // Le token doit correspondre à celui stocké dans le cookie (Double Submit Cookie)
    if (!csrfCookie || providedToken !== csrfCookie) {
      return false;
    }

    const secret = process.env.CSRF_SECRET;
    if (!secret) {
      console.error("[CSRF] CSRF_SECRET environment variable is missing.");
      return false;
    }

    // Décoder le token
    const decoded = Buffer.from(providedToken, "base64").toString("utf-8");

    // Le token est au format uid:timestamp:hmac
    // L'UID peut contenir des colons, donc on cherche les deux derniers séparateurs
    const lastColonIndex = decoded.lastIndexOf(":");
    if (lastColonIndex === -1) return false;

    const providedHmac = decoded.substring(lastColonIndex + 1);
    const remaining = decoded.substring(0, lastColonIndex);

    const secondLastColonIndex = remaining.lastIndexOf(":");
    if (secondLastColonIndex === -1) return false;

    const timestampStr = remaining.substring(secondLastColonIndex + 1);
    const tokenUid = remaining.substring(0, secondLastColonIndex);

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();

    // 1. Vérifier l'expiration (24h) et s'assurer qu'il n'est pas dans le futur
    if (isNaN(timestamp) || now - timestamp > CSRF_EXPIRATION_MS || timestamp > now + 60000) {
      // On autorise une marge de 1 minute pour la désynchronisation des horloges
      return false;
    }

    // 2. Vérifier l'UID si fourni
    if (uid && tokenUid !== uid) {
      return false;
    }

    // 3. Vérifier la signature HMAC avec une comparaison constante (timing-safe)
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(`${tokenUid}:${timestampStr}`)
      .digest("hex");

    const providedHmacBuffer = Buffer.from(providedHmac);
    const expectedHmacBuffer = Buffer.from(expectedHmac);

    if (providedHmacBuffer.length !== expectedHmacBuffer.length) {
      return false;
    }

    // 🛡️ Sentinel: Utilisation de timingSafeEqual pour prévenir les attaques temporelles
    return crypto.timingSafeEqual(providedHmacBuffer, expectedHmacBuffer);
  } catch (error) {
    console.error("[CSRF] Erreur lors de la validation du token:", error);
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
