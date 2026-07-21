import { hasAnyRole, USER_ROLES, type UserRole } from "@/lib/auth/roles";

export const LICENSE_VALIDATION_ROLES = [
  USER_ROLES.ASSISTANT_SECRETARY,
  USER_ROLES.SECRETARY,
  USER_ROLES.ADMIN,
] as const;

export function canAccessLicenseValidation(role: UserRole): boolean {
  return hasAnyRole(role, LICENSE_VALIDATION_ROLES);
}
