import { USER_ROLES } from "@/lib/auth/roles";
import {
  canAccessLicenseValidation,
  LICENSE_VALIDATION_ROLES,
} from "@/lib/license-validation/access";

describe("license-validation access", () => {
  it("allows assistant secretary, secretary and admin", () => {
    expect(canAccessLicenseValidation(USER_ROLES.ASSISTANT_SECRETARY)).toBe(true);
    expect(canAccessLicenseValidation(USER_ROLES.SECRETARY)).toBe(true);
    expect(canAccessLicenseValidation(USER_ROLES.ADMIN)).toBe(true);
  });

  it("denies other roles", () => {
    expect(canAccessLicenseValidation(USER_ROLES.PLAYER)).toBe(false);
    expect(canAccessLicenseValidation(USER_ROLES.COACH)).toBe(false);
  });

  it("exposes the expected role constant", () => {
    expect(LICENSE_VALIDATION_ROLES).toEqual([
      USER_ROLES.ASSISTANT_SECRETARY,
      USER_ROLES.SECRETARY,
      USER_ROLES.ADMIN,
    ]);
  });
});
