import {
  allSlotIdsForSelection,
  campDaySelectionLabel,
  clubRegistrationOptionLabel,
  groupCampSlotsByDate,
  isDayFullySelected,
  listActiveClubRegistrations,
  pickActiveClubRegistration,
  toggleDaySlotIds,
} from "./camp-registration-form-helpers";
import type { CampSlot } from "./types";

function slot(
  partial: Partial<CampSlot> & Pick<CampSlot, "id" | "date" | "siteId" | "formulaId">
): CampSlot {
  return {
    campId: "c",
    siteLabel: "A",
    formulaLabel: "F",
    startMinutes: 540,
    endMinutes: 720,
    label: "Matin",
    capacity: null,
    cancelled: false,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("camp-registration-form-helpers", () => {
  it("préfère le dossier self parmi les dossiers actifs", () => {
    const picked = pickActiveClubRegistration([
      { id: "a", status: "cancelled", adherentRole: "self" },
      { id: "b", status: "approved", adherentRole: "minor_dependent" },
      { id: "c", status: "paid", adherentRole: "self" },
    ]);
    expect(picked?.id).toBe("c");
  });

  it("liste tous les dossiers actifs pour le sélecteur", () => {
    const active = listActiveClubRegistrations([
      { id: "a", status: "cancelled", firstName: "X" },
      { id: "b", status: "approved", firstName: "Léa", lastName: "Dupont" },
      { id: "c", status: "paid", firstName: "Tom", adherentRole: "self" },
    ]);
    expect(active.map((r) => r.id)).toEqual(["b", "c"]);
    expect(clubRegistrationOptionLabel(active[1]!)).toContain("Tom");
  });

  it("sélectionne tous les créneaux site+formule", () => {
    const slots: CampSlot[] = [
      slot({ id: "1", siteId: "s1", formulaId: "f1", date: "2026-10-19" }),
      slot({ id: "2", siteId: "s1", formulaId: "f1", date: "2026-10-20" }),
      slot({ id: "3", siteId: "s2", formulaId: "f1", date: "2026-10-19" }),
    ];
    expect(allSlotIdsForSelection(slots, "s1", "f1")).toEqual(["1", "2"]);
  });

  it("groupe matin et après-midi sous une seule journée", () => {
    const groups = groupCampSlotsByDate([
      slot({
        id: "pm",
        siteId: "s1",
        formulaId: "f1",
        date: "2026-10-19",
        startMinutes: 840,
        label: "Après-midi",
      }),
      slot({
        id: "am",
        siteId: "s1",
        formulaId: "f1",
        date: "2026-10-19",
        startMinutes: 540,
        label: "Matin",
      }),
      slot({ id: "d2", siteId: "s1", formulaId: "f1", date: "2026-10-20" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.slotIds).toEqual(["am", "pm"]);
    expect(campDaySelectionLabel(groups[0]!)).toContain("journée");
    expect(campDaySelectionLabel(groups[0]!)).toContain("Matin");
  });

  it("coche / décoche tous les créneaux d’un jour", () => {
    expect(isDayFullySelected(["am"], ["am", "pm"])).toBe(false);
    expect(toggleDaySlotIds(["x"], ["am", "pm"], true)).toEqual([
      "x",
      "am",
      "pm",
    ]);
    expect(toggleDaySlotIds(["am", "pm", "x"], ["am", "pm"], false)).toEqual([
      "x",
    ]);
  });
});
