import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { createErrorResponse } from "@/lib/api/error-handler";

/**
 * Options pour le rate limiting
 */
export interface RateLimitOptions {
  /**
   * Clé unique pour identifier la limite (ex: `email:${email}`, `uid:${uid}`)
   */
  key: string;
  /**
   * Nombre maximum de requêtes autorisées
   */
  maxRequests: number;
  /**
   * Fenêtre de temps en millisecondes
   */
  windowMs: number;
  /**
   * Message d'erreur personnalisé
   */
  errorMessage?: string;
}

/**
 * Middleware de rate limiting.
 * 
 * @param options - Options de rate limiting
 * @returns null si autorisé, NextResponse avec erreur 429 si limité
 */
export function withRateLimit(
  options: RateLimitOptions
): NextResponse | null {
  const { key, maxRequests, windowMs, errorMessage } = options;

  const rateLimitResult = checkRateLimit(key, maxRequests, windowMs);

  if (!rateLimitResult.allowed) {
    const minutesRemaining = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000 / 60);
    const secondsRemaining = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);

    const defaultMessage = minutesRemaining > 1
      ? `Trop de requêtes. Prochaine tentative possible dans ${minutesRemaining} minutes.`
      : `Trop de requêtes. Prochaine tentative possible dans ${secondsRemaining} secondes.`;

    return createErrorResponse(
      "Trop de requêtes",
      429,
      errorMessage || defaultMessage
    );
  }

  return null;
}
