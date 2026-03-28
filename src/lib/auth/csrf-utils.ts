import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Génère un token CSRF signé par HMAC-SHA256 basé sur l'UID de l'utilisateur et un timestamp.
 * Le token est destiné à être stocké dans un cookie non-HTTP-only pour le pattern Double-Submit Cookie.
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
  
  // Signer les données avec HMAC-SHA256 pour empêcher toute altération
  const signature = createHmac("sha256", secret).update(data).digest("hex");

  // Le token final contient les données et la signature
  return Buffer.from(`${data}:${signature}`).toString("base64");
}

/**
 * Valide un token CSRF en vérifiant sa signature HMAC et sa correspondance avec le cookie.
 * @param providedToken - Le token fourni par le client (ex: header X-CSRF-Token)
 * @param uid - L'UID de l'utilisateur attendu (optionnel)
 */
export async function validateCSRFToken(
  providedToken?: string | null,
  uid?: string
): Promise<boolean> {
  // Si le token n'est pas passé explicitement, essayer de le récupérer depuis les headers
  let token = providedToken;
  if (!token) {
    const headersList = await headers();
    token = headersList.get("x-csrf-token");
  }

  if (!token) return false;

  try {
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get("__csrf")?.value;

    // Le pattern Double-Submit Cookie nécessite que le token soit présent dans le header ET le cookie
    if (!csrfCookie || token !== csrfCookie) {
      return false;
    }

    const secret = process.env.CSRF_SECRET;
    if (!secret) {
      console.error("[CSRF] CSRF_SECRET missing");
      return false;
    }

    // Décoder et vérifier la structure : uid:timestamp:signature
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;

    const [tokenUid, timestamp, signature] = parts;

    // Vérifier l'UID si fourni
    if (uid && tokenUid !== uid) return false;

    // Re-calculer la signature attendue
    const expectedData = `${tokenUid}:${timestamp}`;
    const expectedSignature = createHmac("sha256", secret).update(expectedData).digest("hex");

    // Les buffers doivent avoir la même longueur pour timingSafeEqual
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
      return false;
    }

    // Comparaison sécurisée contre les attaques temporelles
    return timingSafeEqual(signatureBuffer, expectedSignatureBuffer);
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

