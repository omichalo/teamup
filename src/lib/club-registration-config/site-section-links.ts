import {
  CLUB_REGISTRATION_SITES,
  SECTION_PRINCIPALE_OPTIONS,
  type ClubRegistrationSite,
} from "@/lib/club-registration/constants";
import type { RegistrationConfigV1 } from "./types";

const SECTION_IDS = new Set<string>(SECTION_PRINCIPALE_OPTIONS.map((section) => section.id));

const REFERENCE_SITES_BY_ID = new Map(
  CLUB_REGISTRATION_SITES.map((site) => [site.id, site] as const)
);

/**
 * Déduit les sections formulaire couvertes par un lieu à partir de son id et de ses créneaux.
 * Un lieu physique (ex. Vaucresson) n'est pas forcément une section : seuls les ids de
 * {@link SECTION_PRINCIPALE_OPTIONS} ou ceux inférés des créneaux (handisport, sport adapté) sont retenus.
 */
export function inferLinkedSectionIdsFromSite(
  site: Pick<ClubRegistrationSite, "id" | "slots">
): string[] {
  const linked = new Set<string>();

  if (SECTION_IDS.has(site.id)) {
    linked.add(site.id);
  }

  for (const slot of site.slots) {
    const haystack = `${slot.id} ${slot.label}`.toLowerCase();
    if (haystack.includes("handisport")) {
      linked.add("handisport");
    }
    if (haystack.includes("sport-adapte") || haystack.includes("sport adapt")) {
      linked.add("sport-adapte");
    }
  }

  return [...linked];
}

/** Corrige les liaisons site → section invalides (ex. vaucresson → vaucresson). */
export function repairSiteLinkedSectionIds(config: RegistrationConfigV1): RegistrationConfigV1 {
  const enabledSectionIds = new Set(config.sections.map((section) => section.id));

  return {
    ...config,
    sites: config.sites.map((site) => {
      const hasUnknownLink = site.linkedSectionIds.some((id) => !enabledSectionIds.has(id));
      if (!hasUnknownLink && site.linkedSectionIds.length > 0) {
        return site;
      }

      const reference = REFERENCE_SITES_BY_ID.get(site.id);
      const inferred = reference
        ? inferLinkedSectionIdsFromSite(reference)
        : site.linkedSectionIds;
      const repaired = inferred.filter((id) => enabledSectionIds.has(id));

      if (repaired.length > 0) {
        return { ...site, linkedSectionIds: repaired };
      }

      const kept = site.linkedSectionIds.filter((id) => enabledSectionIds.has(id));
      return { ...site, linkedSectionIds: kept };
    }),
  };
}
