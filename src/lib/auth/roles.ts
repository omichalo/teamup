import { CoachRequestStatus, UserRole } from "@/types";

export type { UserRole };

export const USER_ROLES = {
  ADMIN: "admin",
  SECRETARY: "secretary",
  ASSISTANT_SECRETARY: "assistant_secretary",
  BOARD_MEMBER: "board_member",
  COACH: "coach",
  PLAYER: "player",
} as const satisfies Record<string, UserRole>;

export const ALL_USER_ROLES: readonly UserRole[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.SECRETARY,
  USER_ROLES.ASSISTANT_SECRETARY,
  USER_ROLES.BOARD_MEMBER,
  USER_ROLES.COACH,
  USER_ROLES.PLAYER,
];

export const COACH_REQUEST_STATUS = {
  NONE: "none",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const satisfies Record<string, CoachRequestStatus>;

export const ROLE_PRIORITY: Record<UserRole, number> = {
  [USER_ROLES.ADMIN]: 3,
  [USER_ROLES.SECRETARY]: 2,
  [USER_ROLES.COACH]: 2,
  [USER_ROLES.ASSISTANT_SECRETARY]: 1,
  [USER_ROLES.BOARD_MEMBER]: 1,
  [USER_ROLES.PLAYER]: 1,
};

export const PLAYER_LIKE_ROLES = [
  USER_ROLES.PLAYER,
  USER_ROLES.ASSISTANT_SECRETARY,
  USER_ROLES.BOARD_MEMBER,
] as const;

export const DEFAULT_ROLE: UserRole = USER_ROLES.PLAYER;

export const DEFAULT_COACH_REQUEST_STATUS: CoachRequestStatus =
  COACH_REQUEST_STATUS.NONE;

const USER_ROLE_VALUES = new Set<string>(ALL_USER_ROLES);

export const isAdmin = (role?: UserRole | null): role is "admin" =>
  role === USER_ROLES.ADMIN;

export const isCoach = (role?: UserRole | null): boolean =>
  role === USER_ROLES.COACH;

export const isSecretary = (role?: UserRole | null): boolean =>
  role === USER_ROLES.SECRETARY;

export const isAssistantSecretary = (role?: UserRole | null): boolean =>
  role === USER_ROLES.ASSISTANT_SECRETARY;

export const isBoardMember = (role?: UserRole | null): boolean =>
  role === USER_ROLES.BOARD_MEMBER;

export const isPlayer = (role?: UserRole | null): boolean =>
  role === USER_ROLES.PLAYER;

export const hasPlayerLikeAccess = (
  role?: UserRole | null
): boolean => hasAnyRole(role ?? null, PLAYER_LIKE_ROLES);

export const isUserRole = (role?: string | null): role is UserRole =>
  typeof role === "string" && USER_ROLE_VALUES.has(role);

export const resolveRole = (role?: string | null): UserRole => {
  if (isUserRole(role)) {
    return role;
  }

  return DEFAULT_ROLE;
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
