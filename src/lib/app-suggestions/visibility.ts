import type { UserRole } from "@/lib/auth/roles";
import { hasAnyRole, USER_ROLES } from "@/lib/auth/roles";
import type {
  SuggestionDomain,
  SuggestionVisibility,
} from "@/lib/app-suggestions/types";

export type SuggestionViewerContext = {
  uid: string;
  role: UserRole;
  isMaintainer: boolean;
  isClubReferent: boolean;
};

export type SuggestionAccessFields = {
  submitterUid: string;
  domain: SuggestionDomain;
  visibility: SuggestionVisibility;
};

/** Rôles staff historiques (accès module avant ouverture). */
export const APP_SUGGESTION_STAFF_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SECRETARY,
  USER_ROLES.COACH,
] as const;

/** Référents club (domaine club) — secrétariat. */
export const APP_SUGGESTION_CLUB_REFERENT_ROLES = [
  USER_ROLES.SECRETARY,
  USER_ROLES.ASSISTANT_SECRETARY,
] as const;

export function isClubSuggestionReferent(role: UserRole): boolean {
  return hasAnyRole(role, APP_SUGGESTION_CLUB_REFERENT_ROLES);
}

export function canAccessAppSuggestionsAsStaff(role: UserRole): boolean {
  return hasAnyRole(role, APP_SUGGESTION_STAFF_ROLES);
}

export function isSuggestionHandler(
  viewer: SuggestionViewerContext,
  domain: SuggestionDomain
): boolean {
  if (viewer.isMaintainer) {
    return true;
  }
  return viewer.isClubReferent && domain === "club";
}

/**
 * Visibilité effective : documents sans champ (pré-migration) = legacy_staff.
 */
export function resolveSuggestionVisibility(
  value: SuggestionVisibility | undefined | null
): SuggestionVisibility {
  if (
    value === "public" ||
    value === "private" ||
    value === "legacy_staff" ||
    value === "hidden"
  ) {
    return value;
  }
  return "legacy_staff";
}

export function resolveSuggestionDomain(
  value: SuggestionDomain | undefined | null
): SuggestionDomain {
  return value === "club" ? "club" : "app";
}

export function canViewSuggestion(
  viewer: SuggestionViewerContext,
  suggestion: SuggestionAccessFields
): boolean {
  const visibility = resolveSuggestionVisibility(suggestion.visibility);
  const domain = resolveSuggestionDomain(suggestion.domain);
  const isAuthor = suggestion.submitterUid === viewer.uid;
  const handler = isSuggestionHandler(viewer, domain);

  if (visibility === "hidden") {
    return isAuthor || handler;
  }

  if (visibility === "legacy_staff") {
    return (
      canAccessAppSuggestionsAsStaff(viewer.role) ||
      viewer.isMaintainer ||
      viewer.isClubReferent
    );
  }

  if (visibility === "private") {
    return isAuthor || handler;
  }

  // public
  return true;
}

export function canCommentOnSuggestion(
  viewer: SuggestionViewerContext,
  suggestion: SuggestionAccessFields
): boolean {
  return canViewSuggestion(viewer, suggestion);
}

export function canModerateSuggestion(
  viewer: SuggestionViewerContext,
  domain: SuggestionDomain
): boolean {
  return isSuggestionHandler(viewer, resolveSuggestionDomain(domain));
}

export function canTriageSuggestion(
  viewer: SuggestionViewerContext,
  domain: SuggestionDomain
): boolean {
  return canModerateSuggestion(viewer, domain);
}

export function canSeeInternalFields(viewer: SuggestionViewerContext): boolean {
  return viewer.isMaintainer;
}

export function defaultVisibilityForKind(
  kind: "improvement" | "problem"
): SuggestionVisibility {
  return kind === "problem" ? "private" : "public";
}

export const SUGGESTION_VISIBILITY_LABELS: Record<
  SuggestionVisibility,
  string
> = {
  public: "Publique",
  private: "Privée",
  legacy_staff: "Staff",
  hidden: "Masquée",
};

export const SUGGESTION_VISIBILITY_COLORS: Record<
  SuggestionVisibility,
  "default" | "info" | "warning" | "success" | "error"
> = {
  public: "success",
  private: "default",
  legacy_staff: "warning",
  hidden: "error",
};
