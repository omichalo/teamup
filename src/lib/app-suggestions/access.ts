import { hasAnyRole, USER_ROLES, type UserRole } from "@/lib/auth/roles";
import { isAuthorEditableStatus } from "@/lib/app-suggestions/status";
import type { SuggestionStatus } from "@/lib/app-suggestions/types";

/** Rôles pouvant consulter et contribuer aux idées d'amélioration (hors joueurs). */
export const APP_SUGGESTION_STAFF_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SECRETARY,
  USER_ROLES.COACH,
] as const;

export function canAccessAppSuggestions(role: UserRole): boolean {
  return hasAnyRole(role, APP_SUGGESTION_STAFF_ROLES);
}

export function canEditSuggestionContent(
  role: UserRole,
  submitterUid: string,
  requestUid: string,
  status: SuggestionStatus,
  isMaintainer: boolean
): boolean {
  if (isMaintainer) {
    return true;
  }
  if (!canAccessAppSuggestions(role)) {
    return false;
  }
  return submitterUid === requestUid && isAuthorEditableStatus(status);
}

export function canManageSuggestionTriage(isMaintainer: boolean): boolean {
  return isMaintainer;
}

export function canCommentOnSuggestions(role: UserRole): boolean {
  return canAccessAppSuggestions(role);
}
