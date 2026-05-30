import type { RegistrationConfigV1 } from "./types";

export type ConfigReferenceUsage = {
  sections: string[];
  rateTableRules: string[];
  sites: string[];
  competitionBundles: string[];
};

export function getPricingProfileUsage(
  config: RegistrationConfigV1,
  profileId: string
): ConfigReferenceUsage {
  return {
    sections: config.sections
      .filter((section) => section.pricingProfile === profileId)
      .map((section) => section.label),
    rateTableRules: config.rateTable
      .filter((entry) => entry.match.pricingProfile === profileId)
      .map((entry) => entry.segmentLabel),
    sites: [],
    competitionBundles: [],
  };
}

export function getAgeBandProfileUsage(
  config: RegistrationConfigV1,
  profileId: string
): ConfigReferenceUsage {
  return {
    sections: config.sections
      .filter((section) => section.ageBandProfileId === profileId)
      .map((section) => section.label),
    rateTableRules: config.rateTable
      .filter((entry) => {
        const bands = config.ageBandProfiles[profileId];
        return (
          bands &&
          entry.match.ageBandId &&
          bands.bands.some((band) => band.id === entry.match.ageBandId)
        );
      })
      .map((entry) => entry.segmentLabel),
    sites: [],
    competitionBundles: [],
  };
}

export function getSectionUsage(
  config: RegistrationConfigV1,
  sectionId: string
): ConfigReferenceUsage {
  return {
    sections: [],
    rateTableRules: [],
    sites: config.sites
      .filter((site) => site.linkedSectionIds.includes(sectionId))
      .map((site) => site.label),
    competitionBundles: [],
  };
}

export function getCompetitionUsage(
  config: RegistrationConfigV1,
  competitionId: string
): ConfigReferenceUsage {
  return {
    sections: [],
    rateTableRules: [],
    sites: [],
    competitionBundles: config.competitionBundles
      .filter((bundle) => bundle.sourceIds.includes(competitionId))
      .map((bundle) => bundle.stripeLabel),
  };
}

function formatUsageLines(usage: ConfigReferenceUsage): string[] {
  const lines: string[] = [];
  if (usage.sections.length > 0) {
    lines.push(`Sections : ${usage.sections.join(", ")}`);
  }
  if (usage.rateTableRules.length > 0) {
    lines.push(`Règles tarifaires : ${usage.rateTableRules.join(", ")}`);
  }
  if (usage.sites.length > 0) {
    lines.push(`Lieux : ${usage.sites.join(", ")}`);
  }
  if (usage.competitionBundles.length > 0) {
    lines.push(`Regroupements : ${usage.competitionBundles.join(", ")}`);
  }
  return lines;
}

export function formatConfigUsageMessage(usage: ConfigReferenceUsage): string | undefined {
  const lines = formatUsageLines(usage);
  if (lines.length === 0) return undefined;
  return `Utilisé par — ${lines.join(" · ")}`;
}

export function hasConfigUsage(usage: ConfigReferenceUsage): boolean {
  return (
    usage.sections.length > 0 ||
    usage.rateTableRules.length > 0 ||
    usage.sites.length > 0 ||
    usage.competitionBundles.length > 0
  );
}

export function canRemovePricingProfile(
  config: RegistrationConfigV1,
  profileId: string
): { allowed: boolean; reason?: string } {
  const profile = config.pricingProfiles[profileId];
  if (!profile) {
    return { allowed: false, reason: "Profil introuvable." };
  }
  if (profile.builtIn) {
    return { allowed: false, reason: "Profil fourni par défaut (non supprimable)." };
  }
  if (Object.keys(config.pricingProfiles).length <= 1) {
    return { allowed: false, reason: "Au moins un profil tarifaire doit rester actif." };
  }
  const usage = getPricingProfileUsage(config, profileId);
  if (hasConfigUsage(usage)) {
    const message = formatConfigUsageMessage(usage);
    return {
      allowed: false,
      ...(message ? { reason: message } : {}),
    };
  }
  return { allowed: true };
}

export function canRemoveAgeBandProfile(
  config: RegistrationConfigV1,
  profileId: string
): { allowed: boolean; reason?: string } {
  const profile = config.ageBandProfiles[profileId];
  if (!profile) {
    return { allowed: false, reason: "Profil introuvable." };
  }
  if (profileId === "classic" || profileId === "handisport" || profileId === "sport_adapte") {
    return { allowed: false, reason: "Profil fourni par défaut (non supprimable)." };
  }
  if (Object.keys(config.ageBandProfiles).length <= 1) {
    return { allowed: false, reason: "Au moins un profil de tranches d'âge doit rester." };
  }
  const usage = getAgeBandProfileUsage(config, profileId);
  if (hasConfigUsage(usage)) {
    const message = formatConfigUsageMessage(usage);
    return {
      allowed: false,
      ...(message ? { reason: message } : {}),
    };
  }
  return { allowed: true };
}

export function canRemoveSection(
  config: RegistrationConfigV1,
  sectionId: string
): { allowed: boolean; reason?: string } {
  if (config.sections.length <= 1) {
    return { allowed: false, reason: "Au moins une section doit rester." };
  }
  const usage = getSectionUsage(config, sectionId);
  if (hasConfigUsage(usage)) {
    const message = formatConfigUsageMessage(usage);
    return {
      allowed: false,
      ...(message ? { reason: message } : {}),
    };
  }
  return { allowed: true };
}

export function canRemoveCompetition(
  config: RegistrationConfigV1,
  competitionId: string
): { allowed: boolean; reason?: string } {
  const usage = getCompetitionUsage(config, competitionId);
  if (hasConfigUsage(usage)) {
    const message = formatConfigUsageMessage(usage);
    return {
      allowed: false,
      ...(message ? { reason: message } : {}),
    };
  }
  return { allowed: true };
}
