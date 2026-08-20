import { ALL_USER_ROLES, PLAYER_LIKE_ROLES, resolveRole, USER_ROLES } from "./roles";
import { getRoleLabel } from "./role-labels";

describe("resolveRole", () => {
  it("conserve chaque rôle connu", () => {
    for (const role of ALL_USER_ROLES) {
      expect(resolveRole(role)).toBe(role);
    }
  });

  it("retombe sur joueur pour une valeur inconnue", () => {
    expect(resolveRole(undefined)).toBe(USER_ROLES.PLAYER);
    expect(resolveRole("unknown")).toBe(USER_ROLES.PLAYER);
  });
});

describe("PLAYER_LIKE_ROLES", () => {
  it("inclut joueur, secrétaire adjoint et membre du bureau", () => {
    expect(PLAYER_LIKE_ROLES).toEqual([
      USER_ROLES.PLAYER,
      USER_ROLES.ASSISTANT_SECRETARY,
      USER_ROLES.BOARD_MEMBER,
    ]);
  });
});

describe("getRoleLabel", () => {
  it("libelle le membre du bureau", () => {
    expect(getRoleLabel(USER_ROLES.BOARD_MEMBER)).toBe("membre du bureau");
  });
});
