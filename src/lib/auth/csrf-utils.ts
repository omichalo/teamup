import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Génère un token CSRF basé sur l'UID de l'utilisateur et un secret.
 * Le token est signé avec HMAC-SHA256 pour éviter toute manipulation ou fuite du secret.
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
  
  // Créer une signature HMAC-SHA256
  const hmac = createHmac("sha256", secret);
  hmac.update(data);
  const signature = hmac.digest("hex");

  // Le token final est l'encodage base64 de "data:signature"
  // Cela ne contient pas le secret lui-même, seulement une signature
  return Buffer.from(`${data}:${signature}`).toString("base64");
}

/**
 * Valide un token CSRF en le comparant avec celui stocké dans le cookie.
 * @param providedToken - Le token fourni par le client
 * @param uid - L'UID de l'utilisateur (optionnel)
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

    // Le token fourni doit correspondre à celui stocké dans le cookie
    if (!csrfCookie || providedToken !== csrfCookie) {
      return false;
    }

    const secret = process.env.CSRF_SECRET;
    if (!secret) {
      console.error("[CSRF] CSRF_SECRET non configuré");
      return false;
    }

    // Décoder le token
    const decoded = Buffer.from(providedToken, "base64").toString("utf-8");
    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return false;
    }

    const [tokenUid, timestamp, providedSignature] = parts;

    // Vérifier l'UID si fourni
    if (uid && tokenUid !== uid) {
      return false;
    }

    // Vérifier l'expiration (24 heures)
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(tokenTime) || now - tokenTime > 24 * 60 * 60 * 1000) {
      return false;
    }

    // Re-générer la signature attendue
    const data = `${tokenUid}:${timestamp}`;
    const hmac = createHmac("sha256", secret);
    hmac.update(data);
    const expectedSignature = hmac.digest("hex");

    // Comparaison sécurisée contre les attaques temporelles
    const providedBuffer = Buffer.from(providedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
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
    // Vérification plus stricte pour éviter localhost.evil.com
    const isLocal = (val: string | null) => {
      if (!val) return false;
      try {
        const hostname = extractHostname(val);
        return hostname === "localhost" || hostname === "127.0.0.1";
      } catch {
        return false;
      }
    };

    if (isLocal(origin) || isLocal(referer)) {
      return true;
    }

    if (host && (host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:"))) {
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
      } catch {}
    }

    // Vérifier le referer
    if (referer) {
      try {
        const refererHostname = extractHostname(referer);
        if (refererHostname) {
          const normalizedReferer = normalizeHostname(refererHostname);
          if (normalizedReferer === normalizedExpected) return true;
        }
      } catch {}
    }

    // Si pas d'origine/referer mais un host header présent, vérifier le host
    if (host && !origin && !referer) {
      const normalizedHost = normalizeHostname(host.split(":")[0]); // Retirer le port si présent
      if (normalizedHost === normalizedExpected) return true;
    }
  }

  // Si pas d'origine/referer/host et pas de domaine configuré, rejeter en production
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // En développement, accepter si pas de validation possible
  return true;
}
