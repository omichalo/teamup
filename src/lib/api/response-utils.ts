import { NextResponse } from "next/server";

/**
 * Headers de sécurité pour les réponses sensibles (sessions, auth, admin, etc.)
 */
const SECURITY_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
} as const;

/**
 * Ajoute les headers de sécurité à une réponse Next.js.
 * Ces headers empêchent la mise en cache des réponses sensibles.
 * 
 * @param response - La réponse Next.js à modifier
 * @returns La réponse avec les headers de sécurité ajoutés
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Crée une réponse sécurisée avec les headers de sécurité automatiquement ajoutés.
 * 
 * @param data - Données à retourner dans la réponse
 * @param status - Status HTTP (défaut: 200)
 * @returns NextResponse avec les headers de sécurité et les données
 */
export function createSecureResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return addSecurityHeaders(response);
}

/**
 * Détermine si une route nécessite des headers de sécurité.
 * Les routes sensibles incluent : sessions, auth, admin, mutations.
 * 
 * @param pathname - Le chemin de la route (ex: "/api/session/verify")
 * @param method - La méthode HTTP (ex: "POST")
 * @returns true si la route nécessite des headers de sécurité
 */
export function requiresSecurityHeaders(
  pathname: string,
  method: string
): boolean {
  // Routes de session et d'authentification
  if (pathname.includes("/session") || pathname.includes("/auth")) {
    return true;
  }

  // Routes admin
  if (pathname.includes("/admin")) {
    return true;
  }

  // Mutations (POST, PATCH, DELETE, PUT)
  if (["POST", "PATCH", "DELETE", "PUT"].includes(method)) {
    return true;
  }

  return false;
}

