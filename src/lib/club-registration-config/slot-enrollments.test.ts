import { USER_ROLES } from "@/lib/auth/roles";
import { buildDefaultRegistrationConfig } from "./default-config";
import {
  applySlotEnrollmentsClosed,
  canBypassSlotEnrollmentClose,
  omitClosedSlotsFromSelection,
} from "./slot-enrollments";

describe("slot enrollments close", () => {
  it("autorise admin, secrétaire, coach et bureau, pas le secrétaire adjoint", () => {
    expect(canBypassSlotEnrollmentClose(USER_ROLES.ADMIN)).toBe(true);
    expect(canBypassSlotEnrollmentClose(USER_ROLES.SECRETARY)).toBe(true);
    expect(canBypassSlotEnrollmentClose(USER_ROLES.COACH)).toBe(true);
    expect(canBypassSlotEnrollmentClose(USER_ROLES.BOARD_MEMBER)).toBe(true);
    expect(canBypassSlotEnrollmentClose(USER_ROLES.ASSISTANT_SECRETARY)).toBe(false);
    expect(canBypassSlotEnrollmentClose(USER_ROLES.PLAYER)).toBe(false);
    expect(canBypassSlotEnrollmentClose(null)).toBe(false);
  });

  it("retire les créneaux fermés d'une sélection famille", () => {
    const config = buildDefaultRegistrationConfig();
    const slotId = config.sites[0]?.slots[0]?.id;
    expect(slotId).toBeTruthy();
    if (!slotId) {
      return;
    }
    const closed = applySlotEnrollmentsClosed(config, slotId, true);
    expect(closed).not.toBeNull();
    if (!closed) {
      return;
    }
    expect(omitClosedSlotsFromSelection(closed, [slotId, "other"])).toEqual(["other"]);
  });
});
