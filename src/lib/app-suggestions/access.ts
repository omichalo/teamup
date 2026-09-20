import { hasAnyRole, USER_ROLES, type UserRole } from "@/lib/auth/roles";
import { isAuthorEditableStatus } from "@/lib/app-suggestions/status";
import { isClubSuggestionReferent } from "@/lib/app-suggestions/visibility";
import type { SuggestionStatus } from "@/lib/app-suggestions/types";

export {
  APP_SUGGESTION_STAFF_ROLES,
  canAccessAppSuggestionsAsStaff,
  isClubSuggestionReferent,
} from "@/lib/app-suggestions/visibility";

/** Accès module : tout compte connecté (e-mail vérifié côté API). */
export function canAccessAppSuggestions(role: UserRole): boolean {
  return hasAnyRole(role, [
    USER_ROLES.ADMIN,
    USER_ROLES.SECRETARY,
    USER_ROLES.ASSISTANT_SECRETARY,
    USER_ROLES.BOARD_MEMBER,
    USER_ROLES.COACH,
    USER_ROLES.PLAYER,
  ]);
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

/** @deprecated Préférer canCommentOnSuggestion(viewer, suggestion). */
export function canCommentOnSuggestions(role: UserRole): boolean {
  return canAccessAppSuggestions(role);
}

export function resolveClubReferentFlag(role: UserRole): boolean {
  return isClubSuggestionReferent(role);
}
