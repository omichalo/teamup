import {
  SCHOOL_PICKUP_SLOT_IDS,
  getSlotSchoolPickupSchool,
  sanitizeSchoolPickupSlotIds,
} from "./school-pickup";

describe("school pickup", () => {
  it("identifie les créneaux éligibles au dispositif école", () => {
    expect(SCHOOL_PICKUP_SLOT_IDS.has("voisins-lun-1730-jeunes-loisirs")).toBe(true);
    expect(SCHOOL_PICKUP_SLOT_IDS.has("voisins-mar-1730-jeunes-loisirs")).toBe(true);
    expect(SCHOOL_PICKUP_SLOT_IDS.has("voisins-jeu-1700-jeunes-loisir-compet")).toBe(true);
    expect(SCHOOL_PICKUP_SLOT_IDS.has("villepreux-lun-1730-jeunes-loisirs")).toBe(true);
    expect(SCHOOL_PICKUP_SLOT_IDS.has("villepreux-ven-1700-jeunes-loisirs")).toBe(true);
    expect(SCHOOL_PICKUP_SLOT_IDS.has("voisins-mar-2030-adultes-loisirs")).toBe(false);
  });

  it("retourne l’école associée à un créneau éligible", () => {
    expect(getSlotSchoolPickupSchool("voisins-lun-1730-jeunes-loisirs")).toBe(
      "École des Pépinières"
    );
    expect(getSlotSchoolPickupSchool("villepreux-ven-1700-jeunes-loisirs")).toBe(
      "École Jean Rostand"
    );
    expect(getSlotSchoolPickupSchool("guy-lun-1730-jeunes-loisir-compet")).toBeUndefined();
  });

  it("sanitizeSchoolPickupSlotIds ne conserve que les créneaux sélectionnés et éligibles", () => {
    expect(
      sanitizeSchoolPickupSlotIds(
        ["voisins-lun-1730-jeunes-loisirs", "voisins-mar-2030-adultes-loisirs"],
        [
          "voisins-lun-1730-jeunes-loisirs",
          "voisins-mar-2030-adultes-loisirs",
          "villepreux-ven-1700-jeunes-loisirs",
        ]
      )
    ).toEqual(["voisins-lun-1730-jeunes-loisirs"]);
  });
});
