import { USER_ROLES } from "@/lib/auth/roles";
import { canViewCampRegistration, isCampManager } from "./access";

describe("camps access", () => {
  it("autorise admin et secrétaire comme managers", () => {
    expect(isCampManager(USER_ROLES.ADMIN)).toBe(true);
    expect(isCampManager(USER_ROLES.SECRETARY)).toBe(true);
    expect(isCampManager(USER_ROLES.COACH)).toBe(false);
  });

  it("autorise le propriétaire ou un manager à voir une inscription", () => {
    expect(canViewCampRegistration(USER_ROLES.PLAYER, "u1", "u1")).toBe(true);
    expect(canViewCampRegistration(USER_ROLES.PLAYER, "u1", "u2")).toBe(false);
    expect(canViewCampRegistration(USER_ROLES.SECRETARY, "u1", "u2")).toBe(true);
  });
});
