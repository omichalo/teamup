import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth/rate-limit";

/** Limites par défaut pour l’Epic A (mutations coûteuses / auth). */
export const RATE_LIMIT_SESSION_POST_PER_IP = {
  max: 40,
  windowMs: 15 * 60 * 1000,
} as const;

export const RATE_LIMIT_DISCORD_PROXY_PER_UID = {
  max: 45,
  windowMs: 60 * 1000,
} as const;

export const RATE_LIMIT_DISCORD_POLL_MUTATION_PER_UID = {
  max: 25,
  windowMs: 60 * 1000,
} as const;

export const RATE_LIMIT_ADMIN_SYNC_PER_UID = {
  max: 10,
  windowMs: 60 * 1000,
} as const;

export const RATE_LIMIT_ADMIN_DISCORD_CONFIG_PER_UID = {
  max: 30,
  windowMs: 60 * 1000,
} as const;

/** Custom token Firebase pour le client (rafraîchissements fréquents). */
export const RATE_LIMIT_FIREBASE_CUSTOM_TOKEN_PER_UID = {
  max: 10,
  windowMs: 60 * 1000,
} as const;

export function tooManyRequestsResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      message: "Trop de requêtes. Réessayez plus tard.",
    },
    { status: 429 }
  );
}

/**
 * Retourne une réponse 429 si la limite est dépassée, sinon `null`.
 */
export function enforceRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): NextResponse | null {
  const result = checkRateLimit(identifier, maxRequests, windowMs);
  if (!result.allowed) {
    return tooManyRequestsResponse();
  }
  return null;
}
