import { hasAnyRole, USER_ROLES, type UserRole } from "@/lib/auth/roles";
import { isLinkedAccountOwner } from "@/lib/club-registration/effective-linked-accounts";

/** Rôles pouvant traiter les dossiers (validation, paiement, suppression). */
export const CLUB_REGISTRATION_MANAGER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SECRETARY,
] as const;

/** Rôles pouvant ouvrir le tableau des adhésions (lecture, export, préférences). */
export const CLUB_REGISTRATION_SPREADSHEET_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SECRETARY,
  USER_ROLES.ASSISTANT_SECRETARY,
  USER_ROLES.BOARD_MEMBER,
  USER_ROLES.COACH,
] as const;

export function isClubRegistrationManager(role: UserRole): boolean {
  return hasAnyRole(role, CLUB_REGISTRATION_MANAGER_ROLES);
}

export function canAccessRegistrationsSpreadsheet(role: UserRole): boolean {
  return hasAnyRole(role, CLUB_REGISTRATION_SPREADSHEET_ROLES);
}

/**
 * Accès lecture d'un dossier : tableau (admin, secrétariat, secrétaire adjoint,
 * membre du bureau, coach) ou compte lié (propriétaire portail).
 */
export function canViewClubRegistration(
  role: UserRole,
  linkedAccountUids: string[],
  requestUid: string
): boolean {
  if (canAccessRegistrationsSpreadsheet(role)) {
    return true;
  }
  return isLinkedAccountOwner(linkedAccountUids, requestUid);
}

/**
 * Accès lecture / facture / paiement self-service : admin ou secrétariat,
 * ou compte lié au dossier.
 * Les coachs, secrétaires adjoints, membres du bureau et autres rôles n'ont pas
 * accès en écriture aux dossiers d'autrui.
 */
export function canAccessClubRegistration(
  role: UserRole,
  linkedAccountUids: string[],
  requestUid: string
): boolean {
  if (isClubRegistrationManager(role)) {
    return true;
  }
  return isLinkedAccountOwner(linkedAccountUids, requestUid);
}
