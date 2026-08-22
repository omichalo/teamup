import { hasAnyRole, USER_ROLES, type UserRole } from "@/lib/auth/roles";

/** Lecture / toggles championnat — aligné sur compositions, dispos, joueurs. */
export const CHAMPIONSHIP_ROSTER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.COACH,
] as const;

/** Recalcul d’effectif — page admin synchronisation, ADMIN uniquement. */
export const CHAMPIONSHIP_RECALCULATE_ROLES = [USER_ROLES.ADMIN] as const;

export function canAccessChampionshipRoster(role: UserRole): boolean {
  return hasAnyRole(role, CHAMPIONSHIP_ROSTER_ROLES);
}

export function canRecalculateChampionshipRoster(role: UserRole): boolean {
  return hasAnyRole(role, CHAMPIONSHIP_RECALCULATE_ROLES);
}
