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
  COACH_REQUEST_SUBMITTED: "coach.request.submitted",
  COACH_REQUEST_APPROVED: "coach.request.approved",
  COACH_REQUEST_REJECTED: "coach.request.rejected",
  CLUB_REGISTRATION_SUBMITTED: "club.registration.submitted",
  CLUB_REGISTRATION_UPDATED: "club.registration.updated",
  CLUB_REGISTRATION_PAYMENT_REQUESTED: "club.registration.payment_requested",
  CLUB_REGISTRATION_PAYMENT_CONFIRMED: "club.registration.payment_confirmed",
  CLUB_REGISTRATION_DELETED: "club.registration.deleted",
  CLUB_REGISTRATION_CONFIG_PUBLISHED: "club.registration.config_published",
  CLUB_REGISTRATION_CONFIG_IMPORTED: "club.registration.config_imported",
  CLUB_REGISTRATION_SLOT_ENROLLMENTS_TOGGLED: "club.registration.slot_enrollments_toggled",
  TEAM_CREATED: "team.created",
  TEAM_UPDATED: "team.updated",
  TEAM_DELETED: "team.deleted",
  PLAYER_CREATED: "player.created",
  PLAYER_UPDATED: "player.updated",
  PLAYER_DELETED: "player.deleted",
  DATA_SYNCED: "data.synced",
  USER_APP_MAINTAINER_CHANGED: "user.app_maintainer.changed",
  APP_SUGGESTION_CREATED: "app.suggestion.created",
  APP_SUGGESTION_UPDATED: "app.suggestion.updated",
  APP_SUGGESTION_COMMENT_ADDED: "app.suggestion.comment_added",
  ATTENDANCE_MARKED: "attendance.marked",
  ATTENDANCE_UNMARKED: "attendance.unmarked",
  ATTENDANCE_LEAD_CREATED: "attendance.lead.created",
  ATTENDANCE_LEAD_UPDATED: "attendance.lead.updated",
  ATTENDANCE_SLOT_ADDED: "attendance.slot.added",
  ATTENDANCE_SLOT_CANCELLED: "attendance.slot.cancelled",
  ATTENDANCE_SLOT_RESTORED: "attendance.slot.restored",
  CHAMPIONSHIP_ROSTER_RECALCULATED: "championship.roster.recalculated",
  CHAMPIONSHIP_ROSTER_UPDATED: "championship.roster.updated",
  CHAMPIONSHIP_ROSTER_DELETED: "championship.roster.deleted",
} as const;
