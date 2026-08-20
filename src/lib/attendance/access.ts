import { hasAnyRole, USER_ROLES, type UserRole } from "@/lib/auth/roles";

/** Pointage, recherche, stats, export. */
export const ATTENDANCE_OPERATOR_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SECRETARY,
  USER_ROLES.BOARD_MEMBER,
  USER_ROLES.COACH,
] as const;

/** File de relance des essais. */
export const ATTENDANCE_LEAD_MANAGER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SECRETARY,
  USER_ROLES.BOARD_MEMBER,
] as const;

export function isAttendanceOperator(role: UserRole): boolean {
  return hasAnyRole(role, ATTENDANCE_OPERATOR_ROLES);
}

export function isAttendanceLeadManager(role: UserRole): boolean {
  return hasAnyRole(role, ATTENDANCE_LEAD_MANAGER_ROLES);
}
