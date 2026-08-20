import { USER_ROLES } from "@/lib/auth/roles";
import {
  canAccessClubRegistration,
  canAccessRegistrationsSpreadsheet,
  canViewClubRegistration,
  isClubRegistrationManager,
} from "./registration-access";

describe("club registration access", () => {
  const ownerUid = "user-owner";
  const otherUid = "user-other";

  describe("isClubRegistrationManager", () => {
    it("autorise admin et secrétariat uniquement", () => {
      expect(isClubRegistrationManager(USER_ROLES.ADMIN)).toBe(true);
      expect(isClubRegistrationManager(USER_ROLES.SECRETARY)).toBe(true);
      expect(isClubRegistrationManager(USER_ROLES.ASSISTANT_SECRETARY)).toBe(
        false
      );
      expect(isClubRegistrationManager(USER_ROLES.BOARD_MEMBER)).toBe(false);
      expect(isClubRegistrationManager(USER_ROLES.COACH)).toBe(false);
      expect(isClubRegistrationManager(USER_ROLES.PLAYER)).toBe(false);
    });
  });

  describe("canAccessRegistrationsSpreadsheet", () => {
    it("autorise admin, secrétariat, secrétaire adjoint, membre du bureau et coach", () => {
      expect(canAccessRegistrationsSpreadsheet(USER_ROLES.ADMIN)).toBe(true);
      expect(canAccessRegistrationsSpreadsheet(USER_ROLES.SECRETARY)).toBe(true);
      expect(canAccessRegistrationsSpreadsheet(USER_ROLES.ASSISTANT_SECRETARY)).toBe(
        true
      );
      expect(canAccessRegistrationsSpreadsheet(USER_ROLES.BOARD_MEMBER)).toBe(
        true
      );
      expect(canAccessRegistrationsSpreadsheet(USER_ROLES.COACH)).toBe(true);
      expect(canAccessRegistrationsSpreadsheet(USER_ROLES.PLAYER)).toBe(false);
    });
  });

  describe("canViewClubRegistration", () => {
    it("autorise le secrétaire adjoint, le membre du bureau et le coach sur un dossier tiers", () => {
      expect(
        canViewClubRegistration(
          USER_ROLES.ASSISTANT_SECRETARY,
          ownerUid,
          otherUid
        )
      ).toBe(true);
      expect(
        canViewClubRegistration(USER_ROLES.BOARD_MEMBER, ownerUid, otherUid)
      ).toBe(true);
      expect(
        canViewClubRegistration(USER_ROLES.COACH, ownerUid, otherUid)
      ).toBe(true);
    });

    it("refuse le joueur sur le dossier d'un autre", () => {
      expect(
        canViewClubRegistration(USER_ROLES.PLAYER, ownerUid, otherUid)
      ).toBe(false);
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

    it("refuse le secrétaire adjoint, le membre du bureau et le coach sur un dossier tiers", () => {
      expect(
        canAccessClubRegistration(
          USER_ROLES.ASSISTANT_SECRETARY,
          ownerUid,
          otherUid
        )
      ).toBe(false);
      expect(
        canAccessClubRegistration(USER_ROLES.BOARD_MEMBER, ownerUid, otherUid)
      ).toBe(false);
      expect(
        canAccessClubRegistration(USER_ROLES.COACH, ownerUid, otherUid)
      ).toBe(false);
    });

    it("autorise le propriétaire (submitterUid)", () => {
      expect(
        canAccessClubRegistration(USER_ROLES.PLAYER, ownerUid, ownerUid)
      ).toBe(true);
      expect(
        canAccessClubRegistration(
          USER_ROLES.ASSISTANT_SECRETARY,
          ownerUid,
          ownerUid
        )
      ).toBe(true);
      expect(
        canAccessClubRegistration(USER_ROLES.BOARD_MEMBER, ownerUid, ownerUid)
      ).toBe(true);
    });

    it("refuse le joueur sur le dossier d'un autre", () => {
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
