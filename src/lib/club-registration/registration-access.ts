import { hasAnyRole, USER_ROLES, type UserRole } from "@/lib/auth/roles";

/** Rôles pouvant consulter n'importe quel dossier d'inscription (secrétariat). */
export const CLUB_REGISTRATION_MANAGER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SECRETARY,
] as const;

export function isClubRegistrationManager(role: UserRole): boolean {
  return hasAnyRole(role, CLUB_REGISTRATION_MANAGER_ROLES);
}

/**
 * Accès lecture / facture : admin ou secrétariat, ou soumettant du dossier (propriétaire).
 * Les coachs et autres rôles n'ont pas accès aux dossiers d'autrui.
 */
export function canAccessClubRegistration(
  role: UserRole,
  submitterUid: string | undefined,
  requestUid: string
): boolean {
  if (isClubRegistrationManager(role)) {
    return true;
  }
  return typeof submitterUid === "string" && submitterUid.length > 0 && submitterUid === requestUid;
}
