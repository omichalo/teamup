/**
 * Logger d'audit minimal pour tracer les actions critiques sans exposer de données sensibles.
 */

interface AuditLogEntry {
  action: string;
  actor: string; // UID de l'utilisateur (pas d'email)
  timestamp: string;
  resource?: string; // Type de ressource (user, team, player, etc.)
  resourceId?: string; // ID de la ressource (masqué si sensible)
  details?: Record<string, unknown>; // Détails masqués
  success: boolean;
}

/**
 * Masque les données sensibles dans les logs d'audit.
 */
function maskSensitiveData(data: unknown): unknown {
  if (typeof data === "string") {
    // Masquer les emails
    if (data.includes("@")) {
      const [local, domain] = data.split("@");
      return `${local.substring(0, 2)}***@${domain}`;
    }
    // Masquer les tokens (longues chaînes)
    if (data.length > 50) {
      return `${data.substring(0, 10)}***`;
    }
  }
  if (typeof data === "object" && data !== null) {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Ne pas logger les champs sensibles
      if (
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("key")
      ) {
        masked[key] = "***";
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  return data;
}

/**
 * Log une action d'audit.
 */
export function logAuditAction(
  action: string,
  actor: string,
  options: {
    resource?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    success?: boolean;
  } = {}
): void {
  const entry: AuditLogEntry = {
    action,
    actor,
    timestamp: new Date().toISOString(),
    ...(options.resource !== undefined && { resource: options.resource }),
    ...(options.resourceId !== undefined && { resourceId: options.resourceId }),
    ...(options.details !== undefined && { details: maskSensitiveData(options.details) as Record<string, unknown> }),
    success: options.success ?? true,
  };

  // En production, envoyer vers un service de logging dédié
  // Pour l'instant, on log dans la console avec un format structuré
  console.log("[AUDIT]", JSON.stringify(entry));
}

/**
 * Actions d'audit prédéfinies pour les opérations critiques.
 */
export const AUDIT_ACTIONS = {
  USER_ROLE_CHANGED: "user.role.changed",
  USER_IMPORTED: "user.imported",
  USER_EXPORTED: "user.exported",
  COACH_REQUEST_APPROVED: "coach.request.approved",
  COACH_REQUEST_REJECTED: "coach.request.rejected",
  TEAM_CREATED: "team.created",
  TEAM_UPDATED: "team.updated",
  TEAM_DELETED: "team.deleted",
  PLAYER_CREATED: "player.created",
  PLAYER_UPDATED: "player.updated",
  PLAYER_DELETED: "player.deleted",
  DATA_SYNCED: "data.synced",
} as const;

