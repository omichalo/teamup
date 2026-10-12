import { hasAnyRole, USER_ROLES, type UserRole } from "@/lib/auth/roles";
import { ATTENDANCE_OPERATOR_ROLES } from "@/lib/attendance/access";

export const CAMP_MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

export const CAMP_ATTENDANCE_ROLES = ATTENDANCE_OPERATOR_ROLES;

export function isCampManager(role: UserRole): boolean {
  return hasAnyRole(role, CAMP_MANAGER_ROLES);
}

export function isCampAttendanceOperator(role: UserRole): boolean {
  return hasAnyRole(role, CAMP_ATTENDANCE_ROLES);
}

export function canViewCampRegistration(
  role: UserRole,
  ownerUid: string | undefined,
  requestUid: string
): boolean {
  if (isCampManager(role)) {
    return true;
  }
  return typeof ownerUid === "string" && ownerUid.length > 0 && ownerUid === requestUid;
}
