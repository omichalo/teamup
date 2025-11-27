/**
 * Rate limiting simple en mémoire pour prévenir le spam et le brute-force.
 * En production, utilisez un service dédié comme Redis pour un rate limiting distribué.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  firstRequestAt: number;
}

// Map pour stocker les limites par identifiant (email, IP, etc.)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration par défaut
const DEFAULT_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 3; // Max 3 requêtes par fenêtre

/**
 * Vérifie si une requête est autorisée selon les limites de débit.
 * 
 * @param identifier - Identifiant unique (email, IP, UID, etc.)
 * @param maxRequests - Nombre maximum de requêtes autorisées
 * @param windowMs - Fenêtre de temps en millisecondes
 * @returns true si la requête est autorisée, false sinon
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = DEFAULT_RATE_LIMIT_WINDOW
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Si pas d'entrée ou fenêtre expirée, créer une nouvelle entrée
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
      firstRequestAt: now,
    });

    // Nettoyer les entrées expirées périodiquement (toutes les 100 requêtes)
    if (rateLimitStore.size > 1000) {
      cleanupExpiredEntries(now);
    }

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  // Si la limite est atteinte
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Incrémenter le compteur
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Nettoie les entrées expirées du store.
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Réinitialise le rate limit pour un identifiant (utile pour les tests).
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Obtient les statistiques de rate limit pour un identifiant (utile pour le debugging).
 */
export function getRateLimitStats(identifier: string): RateLimitEntry | null {
  return rateLimitStore.get(identifier) || null;
}

