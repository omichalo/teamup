import type { RegistrationConfigV1, RegistrationSiteSlot } from "./types";

export const OPEN_ENROLLMENT_SITE_ID = "sans-creneau";
export const OPEN_ENROLLMENT_SITE_LABEL = "Sans créneau fixe";
export const OPEN_ENROLLMENT_SLOT_ID = "inscription-libre";
export const OPEN_ENROLLMENT_SLOT_LABEL = "Inscription libre (pas de créneau fixe)";

export const OPEN_ENROLLMENT_EXCLUSIVE_ERROR =
  "L'inscription libre ne peut pas être combinée avec un créneau horaire.";

export function isOpenEnrollmentSlot(
  slot: Pick<RegistrationSiteSlot, "openEnrollment" | "id">
): boolean {
  return slot.openEnrollment === true || slot.id === OPEN_ENROLLMENT_SLOT_ID;
}

export function getOpenEnrollmentSlotIds(
  config: RegistrationConfigV1
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const site of config.sites) {
    for (const slot of site.slots) {
      if (slot.enabled && isOpenEnrollmentSlot(slot)) {
        ids.add(slot.id);
      }
    }
  }
  return ids;
}

export function getOpenEnrollmentSlotId(config: RegistrationConfigV1): string | null {
  const ids = [...getOpenEnrollmentSlotIds(config)];
  return ids[0] ?? null;
}

export function slotIdsContainOpenEnrollment(
  config: RegistrationConfigV1,
  slotIds: readonly string[]
): boolean {
  const openIds = getOpenEnrollmentSlotIds(config);
  return slotIds.some((id) => openIds.has(id));
}

/**
 * Vérifie l'exclusivité : un créneau openEnrollment ne peut pas coexister
 * avec un autre créneau. Retourne null si OK, sinon le message d'erreur.
 */
export function getOpenEnrollmentExclusivityError(
  config: RegistrationConfigV1,
  slotIds: readonly string[]
): string | null {
  if (!slotIdsContainOpenEnrollment(config, slotIds)) {
    return null;
  }
  if (slotIds.length !== 1) {
    return OPEN_ENROLLMENT_EXCLUSIVE_ERROR;
  }
  return null;
}

/** Construit le site + créneau virtuel pour le seed / ensure. */
export function buildOpenEnrollmentSite(params: {
  sortOrder: number;
  linkedSectionIds: string[];
}): RegistrationConfigV1["sites"][number] {
  return {
    id: OPEN_ENROLLMENT_SITE_ID,
    label: OPEN_ENROLLMENT_SITE_LABEL,
    linkedSectionIds: [...params.linkedSectionIds],
    sortOrder: params.sortOrder,
    slots: [
      {
        id: OPEN_ENROLLMENT_SLOT_ID,
        label: OPEN_ENROLLMENT_SLOT_LABEL,
        sortOrder: 0,
        enabled: true,
        openEnrollment: true,
      },
    ],
  };
}

/**
 * Ajoute le site/créneau openEnrollment s'il manque (idempotent).
 * Ne modifie pas les autres sites.
 */
export function ensureOpenEnrollmentInConfig(
  config: RegistrationConfigV1
): { config: RegistrationConfigV1; changed: boolean } {
  const existingIds = new Set(
    config.sites.flatMap((site) => site.slots.map((slot) => slot.id))
  );
  if (existingIds.has(OPEN_ENROLLMENT_SLOT_ID)) {
    const sites = config.sites.map((site) => ({
      ...site,
      slots: site.slots.map((slot) =>
        slot.id === OPEN_ENROLLMENT_SLOT_ID
          ? {
              ...slot,
              openEnrollment: true,
              label: slot.label?.trim() ? slot.label : OPEN_ENROLLMENT_SLOT_LABEL,
              enabled: slot.enabled !== false,
            }
          : slot
      ),
    }));
    const needsFlag = !config.sites.some((site) =>
      site.slots.some((slot) => slot.id === OPEN_ENROLLMENT_SLOT_ID && slot.openEnrollment === true)
    );
    if (!needsFlag) {
      return { config, changed: false };
    }
    return { config: { ...config, sites }, changed: true };
  }

  const linkedSectionIds = config.sections.filter((s) => s.enabled).map((s) => s.id);
  const maxSort = config.sites.reduce((max, site) => Math.max(max, site.sortOrder), -1);
  const site = buildOpenEnrollmentSite({
    sortOrder: maxSort + 1,
    linkedSectionIds,
  });
  return {
    config: { ...config, sites: [...config.sites, site] },
    changed: true,
  };
}
