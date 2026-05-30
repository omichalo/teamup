import { USER_ROLES } from "@/lib/auth/roles";
import { canAccessClubRegistration, isClubRegistrationManager } from "./registration-access";

describe("club registration access", () => {
  const ownerUid = "user-owner";
  const otherUid = "user-other";

  describe("isClubRegistrationManager", () => {
    it("autorise admin et secrétariat uniquement", () => {
      expect(isClubRegistrationManager(USER_ROLES.ADMIN)).toBe(true);
      expect(isClubRegistrationManager(USER_ROLES.SECRETARY)).toBe(true);
      expect(isClubRegistrationManager(USER_ROLES.COACH)).toBe(false);
      expect(isClubRegistrationManager(USER_ROLES.PLAYER)).toBe(false);
    });
  });

  describe("canAccessClubRegistration", () => {
    it("autorise admin et secrétariat sur un dossier tiers", () => {
      expect(
        canAccessClubRegistration(USER_ROLES.ADMIN, ownerUid, otherUid)
      ).toBe(true);
      expect(
        canAccessClubRegistration(USER_ROLES.SECRETARY, ownerUid, otherUid)
      ).toBe(true);
    });

    it("autorise le propriétaire (submitterUid)", () => {
      expect(
        canAccessClubRegistration(USER_ROLES.PLAYER, ownerUid, ownerUid)
      ).toBe(true);
    });

    it("refuse coach et joueur sur le dossier d'un autre", () => {
      expect(
        canAccessClubRegistration(USER_ROLES.COACH, ownerUid, otherUid)
      ).toBe(false);
      expect(
        canAccessClubRegistration(USER_ROLES.PLAYER, ownerUid, otherUid)
      ).toBe(false);
    });

    it("refuse si submitterUid absent", () => {
      expect(
        canAccessClubRegistration(USER_ROLES.PLAYER, undefined, ownerUid)
      ).toBe(false);
    });
  });
});
