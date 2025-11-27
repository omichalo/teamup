import { cookies } from "next/headers";

/**
 * Génère un token CSRF basé sur l'UID de l'utilisateur et un secret.
 * Le token est stocké dans un cookie HTTP-only pour éviter les attaques XSS.
 */
export async function generateCSRFToken(uid: string): Promise<string> {
  // Utiliser un secret basé sur l'environnement (ou générer un secret aléatoire)
  const secret = process.env.CSRF_SECRET || "default-secret-change-in-production";
  
  // Créer un token simple basé sur l'UID et un timestamp
  // En production, utilisez une bibliothèque comme `crypto` pour un hash plus sécurisé
  const timestamp = Date.now();
  const token = Buffer.from(`${uid}:${timestamp}:${secret}`).toString("base64");
  
  return token;
}

/**
 * Valide un token CSRF en le comparant avec celui stocké dans le cookie.
 * @param providedToken - Le token fourni par le client
 */
export async function validateCSRFToken(
  providedToken: string | null | undefined
): Promise<boolean> {
  if (!providedToken) {
    return false;
  }

  try {
    // Re-générer le token attendu et comparer
    // En production, utilisez une validation plus robuste avec expiration
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get("__csrf")?.value;

    if (!csrfCookie) {
      return false;
    }

    // Comparer les tokens
    return providedToken === csrfCookie;
  } catch {
    return false;
  }
}

/**
 * Vérifie l'origine de la requête pour prévenir les attaques CSRF.
 * Valide que l'Origin ou le Referer correspond au domaine attendu.
 */
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // En développement, autoriser localhost
  if (process.env.NODE_ENV === "development") {
    if (origin && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
      return true;
    }
    if (referer && (referer.includes("localhost") || referer.includes("127.0.0.1"))) {
      return true;
    }
  }

  // En production, valider contre le domaine attendu
  const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  
  if (expectedOrigin) {
    const expectedHost = new URL(expectedOrigin).hostname;
    
    if (origin) {
      try {
        const originHost = new URL(origin).hostname;
        return originHost === expectedHost;
      } catch {
        return false;
      }
    }

    if (referer) {
      try {
        const refererHost = new URL(referer).hostname;
        return refererHost === expectedHost;
      } catch {
        return false;
      }
    }
  }

  // Si pas d'origine/referer et pas de domaine configuré, accepter (pour compatibilité)
  // En production, cela devrait être rejeté
  return process.env.NODE_ENV === "development";
}

