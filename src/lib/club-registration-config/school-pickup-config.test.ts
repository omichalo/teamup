import { sanitizeSchoolPickupSlotIds } from "@/lib/club-registration/school-pickup";
import { expandCompetitionIdsForForm } from "@/lib/club-registration/competition-ids";
import { buildDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import {
  expandCompetitionIdsForFormFromConfig,
  getSchoolPickupSlotIds,
  sanitizeSchoolPickupSlotIdsFromConfig,
} from "@/lib/club-registration-config/helpers";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";

const DYNAMIC_PICKUP_SLOT_ID = "slot-1782454814153";

function configWithDynamicPickupSlot(): RegistrationConfigV1 {
  const config = buildDefaultRegistrationConfig();
  const voisins = config.sites.find((site) => site.id === "voisins");
  if (!voisins) {
    throw new Error("site voisins manquant");
  }
  voisins.slots.push({
    id: DYNAMIC_PICKUP_SLOT_ID,
    label: "Jeudi / 17h00 - 18h00 / Baby Ping (à partir de 4 ans)",
    enabled: true,
    sortOrder: 99,
    schoolPickupSchool: "École des Pépinières",
  });
  return config;
}

describe("school pickup config vs constants", () => {
  it("conserve un créneau paramétré en Firestore absent des constantes legacy", () => {
    const config = configWithDynamicPickupSlot();
    const slotIds = [DYNAMIC_PICKUP_SLOT_ID];
    const pickupIds = [DYNAMIC_PICKUP_SLOT_ID];

    expect(getSchoolPickupSlotIds(config).has(DYNAMIC_PICKUP_SLOT_ID)).toBe(true);
    expect(
      sanitizeSchoolPickupSlotIdsFromConfig(config, slotIds, pickupIds)
    ).toEqual(pickupIds);
    expect(sanitizeSchoolPickupSlotIds(slotIds, pickupIds)).toEqual([]);
  });

  it("déplie un bundle compétitions paramétré absent des constantes legacy", () => {
    const config = buildDefaultRegistrationConfig();
    config.competitionBundles.push({
      billingId: "custom_youth_bundle",
      sourceIds: ["custom_comp_a", "custom_comp_b"],
      priceCents: 3_000,
      formLabel: "Forfait jeunes custom",
    });

    const stored = ["custom_youth_bundle"];
    expect(expandCompetitionIdsForFormFromConfig(config, stored)).toEqual([
      "custom_comp_a",
      "custom_comp_b",
    ]);
    expect(expandCompetitionIdsForForm(stored)).toEqual(["custom_youth_bundle"]);
  });
});
