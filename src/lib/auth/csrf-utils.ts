import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Génère un token CSRF signé avec HMAC-SHA256, lié à l'UID de l'utilisateur.
 * Le token inclut un timestamp pour permettre une expiration (TTL).
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
  const data = `${uid}:${timestamp}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64");
  
  // Format: uid:timestamp:signature
  return Buffer.from(`${data}:${signature}`).toString("base64");
}

/**
 * Valide un token CSRF en vérifiant sa signature HMAC, son UID et son expiration.
 * @param providedToken - Le token fourni par le client
 * @param uid - L'UID de l'utilisateur authentifié (obligatoire pour liaison stricte)
 */
export async function validateCSRFToken(
  providedToken: string | null | undefined,
  uid: string
): Promise<boolean> {
  if (!providedToken || !uid) {
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
      console.error("[CSRF] CSRF_SECRET missing");
      return false;
    }

    // 1. Vérification de l'intégrité du token (comparaison sécurisée avec le cookie)
    const providedBuffer = Buffer.from(providedToken);
    const cookieBuffer = Buffer.from(csrfCookie);

    if (providedBuffer.length !== cookieBuffer.length || !timingSafeEqual(providedBuffer, cookieBuffer)) {
      return false;
    }

    // 2. Décodage et vérification de la signature
    const decoded = Buffer.from(providedToken, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;

    const [tokenUid, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Vérifier que le token appartient bien à l'utilisateur
    if (tokenUid !== uid) return false;

    // 3. Vérification de l'expiration (24 heures)
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > ONE_DAY) return false;

    // 4. Re-calculer la signature pour valider l'authenticité
    const expectedSignature = createHmac("sha256", secret)
      .update(`${tokenUid}:${timestampStr}`)
      .digest("base64");

    const sigBuffer = Buffer.from(signature);
    const expectedSigBuffer = Buffer.from(expectedSignature);

    return sigBuffer.length === expectedSigBuffer.length &&
           timingSafeEqual(sigBuffer, expectedSigBuffer);
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

