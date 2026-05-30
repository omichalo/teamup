import type { RegistrationConfigV1, RegistrationSiteSlot } from "./types";
import { repairAidRulesForm } from "./aid-rules";
import { repairPricingProfiles } from "./pricing-profiles";
import { repairSiteLinkedSectionIds } from "./site-section-links";
import { sortBySortOrder } from "./sort-order";

/** Normalise sortOrder pour les configs importées ou legacy (créneaux sans ordre). */
export function normalizeRegistrationConfigSortOrders(
  config: RegistrationConfigV1
): RegistrationConfigV1 {
  const withSortOrders = {
    ...config,
    sections: sortBySortOrder(config.sections).map((section, index) => ({
      ...section,
      sortOrder: index,
    })),
    sites: sortBySortOrder(config.sites).map((site, siteIndex) => {
      const { gymnasiumName: rawGymnasiumName, ...siteRest } = site;
      const gymnasiumName = rawGymnasiumName?.trim();
      return {
      ...siteRest,
      ...(gymnasiumName ? { gymnasiumName } : {}),
      sortOrder: siteIndex,
      slots: sortBySortOrder(
        site.slots.map((slot, slotIndex) => ({
          ...slot,
          sortOrder: slot.sortOrder ?? slotIndex,
        }))
      ).map((slot, slotIndex) => ({
        ...slot,
        sortOrder: slotIndex,
      })),
    };
    }),
  };

  return repairPricingProfiles(repairAidRulesForm(repairSiteLinkedSectionIds(withSortOrders)));
}

export function getSortedSiteSlots(slots: readonly RegistrationSiteSlot[]): RegistrationSiteSlot[] {
  return sortBySortOrder(
    slots.map((slot, index) => ({
      ...slot,
      sortOrder: slot.sortOrder ?? index,
    }))
  );
}
