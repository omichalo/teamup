import { getDefaultRegistrationConfig } from "./default-config";
import { withResolvedSlotSchedule } from "./repair-slot-schedules";
import {
  OPEN_ENROLLMENT_EXCLUSIVE_ERROR,
  OPEN_ENROLLMENT_SLOT_ID,
  ensureOpenEnrollmentInConfig,
  getOpenEnrollmentExclusivityError,
  getOpenEnrollmentSlotId,
  isOpenEnrollmentSlot,
  slotIdsContainOpenEnrollment,
} from "./open-enrollment";
import { listSlotsForDate } from "@/lib/attendance/slots-for-date";

describe("open enrollment", () => {
  const config = getDefaultRegistrationConfig();

  it("est présent dans la config par défaut", () => {
    expect(getOpenEnrollmentSlotId(config)).toBe(OPEN_ENROLLMENT_SLOT_ID);
    const slot = config.sites
      .flatMap((site) => site.slots)
      .find((item) => item.id === OPEN_ENROLLMENT_SLOT_ID);
    expect(slot?.openEnrollment).toBe(true);
    expect(slot?.weekday).toBeUndefined();
  });

  it("détecte l'exclusivité", () => {
    expect(getOpenEnrollmentExclusivityError(config, [OPEN_ENROLLMENT_SLOT_ID])).toBeNull();
    expect(
      getOpenEnrollmentExclusivityError(config, [
        OPEN_ENROLLMENT_SLOT_ID,
        "voisins-jeu-1900-adultes-elite",
      ])
    ).toBe(OPEN_ENROLLMENT_EXCLUSIVE_ERROR);
    expect(
      slotIdsContainOpenEnrollment(config, ["voisins-jeu-1900-adultes-elite"])
    ).toBe(false);
  });

  it("ensure est idempotent", () => {
    const first = ensureOpenEnrollmentInConfig(config);
    expect(first.changed).toBe(false);
    const without = {
      ...config,
      sites: config.sites.filter((site) => site.id !== "sans-creneau"),
    };
    const second = ensureOpenEnrollmentInConfig(without);
    expect(second.changed).toBe(true);
    expect(getOpenEnrollmentSlotId(second.config)).toBe(OPEN_ENROLLMENT_SLOT_ID);
  });

  it("repair ne fabrique pas d'horaire pour openEnrollment", () => {
    const repaired = withResolvedSlotSchedule({
      id: OPEN_ENROLLMENT_SLOT_ID,
      label: "Inscription libre (pas de créneau fixe)",
      sortOrder: 0,
      enabled: true,
      openEnrollment: true,
      weekday: 1,
      startMinutes: 17 * 60,
      endMinutes: 18 * 60,
    });
    expect(isOpenEnrollmentSlot(repaired)).toBe(true);
    expect(repaired.weekday).toBeUndefined();
    expect(repaired.startMinutes).toBeUndefined();
  });

  it("n'apparaît pas dans listSlotsForDate", () => {
    const slots = listSlotsForDate(config, "2026-08-20", 12 * 60);
    expect(slots.some((slot) => slot.slotId === OPEN_ENROLLMENT_SLOT_ID)).toBe(false);
  });
});
