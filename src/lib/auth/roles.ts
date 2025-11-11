import { CoachRequestStatus, UserRole } from "@/types";

export const USER_ROLES = {
  ADMIN: "admin",
  COACH: "coach",
  PLAYER: "player",
} as const satisfies Record<string, UserRole>;

export const COACH_REQUEST_STATUS = {
  NONE: "none",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const satisfies Record<string, CoachRequestStatus>;

export const ROLE_PRIORITY: Record<UserRole, number> = {
  [USER_ROLES.ADMIN]: 3,
  [USER_ROLES.COACH]: 2,
  [USER_ROLES.PLAYER]: 1,
};

export const DEFAULT_ROLE: UserRole = USER_ROLES.PLAYER;

export const DEFAULT_COACH_REQUEST_STATUS: CoachRequestStatus =
  COACH_REQUEST_STATUS.NONE;

export const isAdmin = (role?: UserRole | null): role is "admin" =>
  role === USER_ROLES.ADMIN;

export const isCoach = (role?: UserRole | null): boolean =>
  role === USER_ROLES.COACH;

export const isPlayer = (role?: UserRole | null): boolean =>
  role === USER_ROLES.PLAYER;

export const resolveRole = (role?: string | null): UserRole => {
  if (!role) {
    return DEFAULT_ROLE;
  }

  if (role === USER_ROLES.ADMIN || role === USER_ROLES.COACH) {
    return role;
  }

  return USER_ROLES.PLAYER;
};

export const resolveCoachRequestStatus = (
  status?: string | null
): CoachRequestStatus => {
  switch (status) {
    case COACH_REQUEST_STATUS.PENDING:
    case COACH_REQUEST_STATUS.APPROVED:
    case COACH_REQUEST_STATUS.REJECTED:
      return status;
    default:
      return COACH_REQUEST_STATUS.NONE;
  }
};

export const compareRolePriority = (a: UserRole, b: UserRole): number =>
  ROLE_PRIORITY[a] - ROLE_PRIORITY[b];

export const hasAnyRole = (
  role: UserRole | null | undefined,
  allowed: readonly UserRole[]
): boolean => {
  if (!role) {
    return false;
  }
  return allowed.includes(role);
};

