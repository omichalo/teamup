import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { getEnabledSites } from "@/lib/club-registration-config/helpers";
import { formatRegistrationSiteLabel } from "@/lib/club-registration-config/site-display";

/** Libellés créneau : « commune — gymnase — créneau ». */
export function buildAnalyticsSlotLabels(config: RegistrationConfigV1): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const site of getEnabledSites(config)) {
    const siteLabel = formatRegistrationSiteLabel(site);
    for (const slot of site.slots) {
      if (!slot.enabled) continue;
      labels[slot.id] = `${siteLabel} — ${slot.label}`;
    }
  }
  return labels;
}

/** Libellés compétition / bundle (formLabel ou stripeLabel). */
export function buildAnalyticsCompetitionLabels(
  config: RegistrationConfigV1
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const competition of config.competitions) {
    if (!competition.enabled) continue;
    labels[competition.id] =
      competition.formLabel.trim() || competition.stripeLabel.trim() || competition.id;
  }
  for (const bundle of config.competitionBundles) {
    labels[bundle.billingId] = bundle.stripeLabel.trim() || bundle.billingId;
  }
  return labels;
}

/** Libellés aides depuis la grille tarifaire. */
export function buildAnalyticsAidLabels(config: RegistrationConfigV1): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const rule of config.aidRules) {
    labels[rule.id] = rule.label.trim() || rule.id;
  }
  return labels;
}
