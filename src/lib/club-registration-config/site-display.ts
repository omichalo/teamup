import type { RegistrationConfigV1, RegistrationSite } from "./types";

export type RegistrationSiteDisplay = Pick<RegistrationSite, "label" | "gymnasiumName">;

export type SectionPracticeDisplay = {
  id: string;
  label: string;
};

/** Gymnases configurés sur les lieux rattachés à une section (ordre stable, sans doublon). */
export function listGymnasiumNamesForSection(
  config: RegistrationConfigV1,
  sectionId: string
): string[] {
  const names = new Set<string>();
  for (const site of config.sites) {
    if (site.id !== sectionId && !site.linkedSectionIds.includes(sectionId)) {
      continue;
    }
    const gym = site.gymnasiumName?.trim();
    if (gym) {
      names.add(gym);
    }
  }
  return [...names];
}

/** Libellé section + gymnase(s) pour l’étape Pratique sportive. */
export function formatSectionPracticeLabel(
  config: RegistrationConfigV1,
  section: SectionPracticeDisplay
): string {
  const gyms = listGymnasiumNamesForSection(config, section.id);
  if (gyms.length === 0) {
    return section.label.trim();
  }
  return `${section.label.trim()} — ${gyms.join(", ")}`;
}

/** Libellé complet « commune — gymnase » pour listes et récap. */
export function formatRegistrationSiteLabel(site: RegistrationSiteDisplay): string {
  const place = site.label.trim();
  const gym = site.gymnasiumName?.trim();
  if (!gym) return place;
  return `${place} — ${gym}`;
}

/** Nom du gymnase seul (affichage secondaire sous le lieu). */
export function registrationSiteGymnasiumLabel(
  site: RegistrationSiteDisplay
): string | null {
  const gym = site.gymnasiumName?.trim();
  return gym || null;
}
