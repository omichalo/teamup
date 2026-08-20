import { USER_ROLES, type UserRole } from "@/lib/auth/roles";

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case USER_ROLES.ADMIN:
      return "admin";
    case USER_ROLES.SECRETARY:
      return "secrétaire";
    case USER_ROLES.ASSISTANT_SECRETARY:
      return "secrétaire adjoint";
    case USER_ROLES.BOARD_MEMBER:
      return "membre du bureau";
    case USER_ROLES.COACH:
      return "coach";
    case USER_ROLES.PLAYER:
      return "joueur";
  }
}
