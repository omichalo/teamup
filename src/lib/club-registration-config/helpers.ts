import type {
  RegistrationConfigV1,
  RegistrationSection,
  RegistrationSite,
  RegistrationSiteSlot,
} from "./types";
import { getSortedSiteSlots } from "./normalize-sort-orders";

export function getEnabledSections(config: RegistrationConfigV1): RegistrationSection[] {
  return [...config.sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEnabledSites(config: RegistrationConfigV1): RegistrationSite[] {
  return [...config.sites]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((site) => ({
      ...site,
      slots: getSortedSiteSlots(site.slots),
    }));
}

export function getEnabledSlots(config: RegistrationConfigV1): RegistrationSiteSlot[] {
  return getEnabledSites(config).flatMap((site) =>
    site.slots.filter((slot) => slot.enabled)
  );
}

export function getAllSlotIds(config: RegistrationConfigV1): ReadonlySet<string> {
  return new Set(getEnabledSlots(config).map((s) => s.id));
}

export function getSchoolPickupSlotIds(config: RegistrationConfigV1): ReadonlySet<string> {
  return new Set(
    getEnabledSlots(config)
      .filter((slot) => Boolean(slot.schoolPickupSchool))
      .map((slot) => slot.id)
  );
}

export function getSlotSchoolPickupSchool(
  config: RegistrationConfigV1,
  slotId: string
): string | undefined {
  for (const site of config.sites) {
    const slot = site.slots.find((s) => s.id === slotId);
    if (slot?.schoolPickupSchool) return slot.schoolPickupSchool;
  }
  return undefined;
}

export function getSectionById(
  config: RegistrationConfigV1,
  sectionId: string
): RegistrationSection | undefined {
  return config.sections.find((s) => s.id === sectionId && s.enabled);
}

export function getEnabledCompetitionIds(config: RegistrationConfigV1): string[] {
  const ids = config.competitions.filter((c) => c.enabled).map((c) => c.id);
  for (const bundle of config.competitionBundles) {
    if (!ids.includes(bundle.billingId)) {
      ids.push(bundle.billingId);
    }
  }
  return ids;
}

export function getEnabledReductionIds(config: RegistrationConfigV1): string[] {
  return config.aidRules.map((r) => r.id);
}

export function getEnabledSectionIds(config: RegistrationConfigV1): string[] {
  return getEnabledSections(config).map((s) => s.id);
}

export function sanitizeSchoolPickupSlotIdsFromConfig(
  config: RegistrationConfigV1,
  slotIds: readonly string[],
  schoolPickupSlotIds: readonly string[]
): string[] {
  const selected = new Set(slotIds);
  const pickupIds = getSchoolPickupSlotIds(config);
  return schoolPickupSlotIds.filter((id) => selected.has(id) && pickupIds.has(id));
}

export function expandCompetitionIdsForFormFromConfig(
  config: RegistrationConfigV1,
  ids: string[]
): string[] {
  const expanded: string[] = [];
  for (const id of ids) {
    const bundle = config.competitionBundles.find((b) => b.billingId === id);
    if (bundle) {
      for (const sourceId of bundle.sourceIds) {
        if (!expanded.includes(sourceId)) expanded.push(sourceId);
      }
      continue;
    }
    if (!expanded.includes(id)) expanded.push(id);
  }
  return expanded;
}

export function normalizeCompetitionIdsFromConfig(
  config: RegistrationConfigV1,
  ids: string[]
): string[] {
  const normalized: string[] = [];
  const bundledSourceIds = new Set(
    config.competitionBundles.flatMap((b) => b.sourceIds)
  );

  for (const bundle of config.competitionBundles) {
    const hasAny = ids.some((id) => bundle.sourceIds.includes(id) || id === bundle.billingId);
    if (hasAny && !normalized.includes(bundle.billingId)) {
      normalized.push(bundle.billingId);
    }
  }

  for (const id of ids) {
    if (bundledSourceIds.has(id)) continue;
    if (!normalized.includes(id)) normalized.push(id);
  }

  return normalized;
}

export function renderInvoiceHeader(
  template: string,
  vars: { clubName: string; registrationId: string; adherentName?: string }
): string {
  return template
    .replace(/\{\{clubName\}\}/g, vars.clubName)
    .replace(/\{\{registrationId\}\}/g, vars.registrationId)
    .replace(/\{\{adherentName\}\}/g, vars.adherentName ?? "");
}
