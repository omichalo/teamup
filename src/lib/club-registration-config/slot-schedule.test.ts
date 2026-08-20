import { CLUB_REGISTRATION_SITES } from "@/lib/club-registration/constants";
import {
  formatMinutesAsLabel,
  parseSlotScheduleFromId,
  parseSlotScheduleFromLabel,
  parseTimeInput,
  resolveSlotSchedule,
} from "./slot-schedule";

describe("slot-schedule", () => {
  it("parse un libellé club (jour + plage)", () => {
    expect(
      parseSlotScheduleFromLabel("Lundi / 17h00 – 18h30 / Jeunes Loisirs")
    ).toEqual({ weekday: 1, startMinutes: 17 * 60, endMinutes: 18 * 60 + 30 });
  });

  it("parse un id slug (jour + heure de début, durée 90 min)", () => {
    expect(parseSlotScheduleFromId("voisins-lun-1730-jeunes-loisirs")).toEqual({
      weekday: 1,
      startMinutes: 17 * 60 + 30,
      endMinutes: 19 * 60,
    });
  });

  it("préfère le libellé à l'id quand les deux existent", () => {
    expect(
      resolveSlotSchedule({
        id: "voisins-lun-1730-jeunes-loisirs",
        label: "Lundi / 17h00 – 18h30 / Jeunes Loisirs",
      })
    ).toEqual({ weekday: 1, startMinutes: 17 * 60, endMinutes: 18 * 60 + 30 });
  });

  it("conserve un horaire déjà structuré", () => {
    expect(
      resolveSlotSchedule({
        id: "custom",
        label: "Créneau libre",
        weekday: 3,
        startMinutes: 16 * 60,
        endMinutes: 17 * 60 + 30,
      })
    ).toEqual({ weekday: 3, startMinutes: 16 * 60, endMinutes: 17 * 60 + 30 });
  });

  it("parse tous les créneaux du catalogue par défaut", () => {
    const slots = CLUB_REGISTRATION_SITES.flatMap((site) => site.slots);
    const unresolved = slots.filter((slot) => resolveSlotSchedule(slot) == null);
    expect(unresolved.map((slot) => slot.id)).toEqual([]);
  });

  it("formate et parse une saisie HH:MM", () => {
    expect(formatMinutesAsLabel(17 * 60 + 5)).toBe("17h05");
    expect(parseTimeInput("09:30")).toBe(9 * 60 + 30);
    expect(parseTimeInput("25:00")).toBeNull();
  });
});
