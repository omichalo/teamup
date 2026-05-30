import type { PricingContext } from "@/lib/pricing/types";
import { calculateQuoteFromConfig } from "./pricing-engine";
import { getDefaultRegistrationConfig } from "./default-config";
import type { RegistrationConfigV1 } from "./types";

export type ConfigValidationIssue = {
  path: string;
  message: string;
};

function collectUniqueIds(values: string[], path: string, issues: ConfigValidationIssue[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      issues.push({ path, message: `Identifiant dupliqué : ${value}` });
    }
    seen.add(value);
  }
}

function validateAgeBandProfiles(config: RegistrationConfigV1, issues: ConfigValidationIssue[]): void {
  for (const [profileId, profile] of Object.entries(config.ageBandProfiles)) {
    if (profile.id !== profileId) {
      issues.push({
        path: `ageBandProfiles.${profileId}`,
        message: "L'id du profil doit correspondre à la clé",
      });
    }
    for (const band of profile.bands) {
      if (band.maxAge !== undefined && band.maxAge < band.minAge) {
        issues.push({
          path: `ageBandProfiles.${profileId}.bands.${band.id}`,
          message: "maxAge doit être >= minAge",
        });
      }
    }
  }
}

function validatePricingProfiles(config: RegistrationConfigV1, issues: ConfigValidationIssue[]): void {
  for (const [profileId, profile] of Object.entries(config.pricingProfiles)) {
    if (profile.id !== profileId) {
      issues.push({
        path: `pricingProfiles.${profileId}`,
        message: "L'id du profil doit correspondre à la clé",
      });
    }
  }
}

function validateSections(config: RegistrationConfigV1, issues: ConfigValidationIssue[]): void {
  collectUniqueIds(
    config.sections.map((s) => s.id),
    "sections",
    issues
  );

  for (const section of config.sections) {
    if (!config.pricingProfiles[section.pricingProfile]) {
      issues.push({
        path: `sections.${section.id}`,
        message: `Profil tarifaire inconnu : ${section.pricingProfile}`,
      });
    }
    if (!config.ageBandProfiles[section.ageBandProfileId]) {
      issues.push({
        path: `sections.${section.id}`,
        message: `Profil de tranche d'âge inconnu : ${section.ageBandProfileId}`,
      });
    }
  }
}

function validateSites(config: RegistrationConfigV1, issues: ConfigValidationIssue[]): void {
  collectUniqueIds(
    config.sites.map((s) => s.id),
    "sites",
    issues
  );

  const sectionIds = new Set(config.sections.map((s) => s.id));
  const slotIds: string[] = [];

  for (const site of config.sites) {
    for (const linkedId of site.linkedSectionIds) {
      if (!sectionIds.has(linkedId)) {
        issues.push({
          path: `sites.${site.id}`,
          message: `Section liée inconnue : ${linkedId}`,
        });
      }
    }
    for (const slot of site.slots) {
      slotIds.push(slot.id);
    }
  }

  collectUniqueIds(slotIds, "sites.slots", issues);
}

function validateCompetitions(config: RegistrationConfigV1, issues: ConfigValidationIssue[]): void {
  collectUniqueIds(
    config.competitions.map((c) => c.id),
    "competitions",
    issues
  );

  const competitionIds = new Set(config.competitions.map((c) => c.id));

  for (const bundle of config.competitionBundles) {
    collectUniqueIds(bundle.sourceIds, `competitionBundles.${bundle.billingId}`, issues);
    for (const sourceId of bundle.sourceIds) {
      if (!competitionIds.has(sourceId)) {
        issues.push({
          path: `competitionBundles.${bundle.billingId}`,
          message: `Compétition source inconnue : ${sourceId}`,
        });
      }
    }
  }
}

function validateRateTable(config: RegistrationConfigV1, issues: ConfigValidationIssue[]): void {
  collectUniqueIds(
    config.rateTable.map((r) => r.id),
    "rateTable",
    issues
  );

  for (const entry of config.rateTable) {
    if (!config.pricingProfiles[entry.match.pricingProfile]) {
      issues.push({
        path: `rateTable.${entry.id}`,
        message: `Profil tarifaire inconnu : ${entry.match.pricingProfile}`,
      });
    }
    if (entry.match.ageBandId) {
      const profile = config.ageBandProfiles[entry.match.pricingProfile];
      if (profile && !profile.bands.some((b) => b.id === entry.match.ageBandId)) {
        issues.push({
          path: `rateTable.${entry.id}`,
          message: `Tranche d'âge inconnue : ${entry.match.ageBandId}`,
        });
      }
    }
  }
}

function validateAidRules(config: RegistrationConfigV1, issues: ConfigValidationIssue[]): void {
  collectUniqueIds(
    config.aidRules.map((r) => r.id),
    "aidRules",
    issues
  );
}

/** Validation croisée métier au-delà du schéma Zod. */
export function validateRegistrationConfigCrossRefs(
  config: RegistrationConfigV1
): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];
  validatePricingProfiles(config, issues);
  validateAgeBandProfiles(config, issues);
  validateSections(config, issues);
  validateSites(config, issues);
  validateCompetitions(config, issues);
  validateRateTable(config, issues);
  validateAidRules(config, issues);
  return issues;
}

const SAMPLE_QUOTE_CONTEXTS: Array<Partial<PricingContext> & Pick<PricingContext, "birthDate">> = [
  { birthDate: "2020-01-01" },
  { birthDate: "2014-06-01", wantsCompetitorExtras: true },
  { birthDate: "1990-01-01", mainSectionId: "handisport", wantsCompetitorExtras: false },
  { birthDate: "2010-01-01", mainSectionId: "handisport", wantsCompetitorExtras: true },
  { birthDate: "2010-01-01", mainSectionId: "sport-adapte" },
];

/** Quotes témoins exécutées avant publication. */
export function runSampleQuoteChecks(config: RegistrationConfigV1): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];
  const defaultConfig = getDefaultRegistrationConfig();

  for (const partial of SAMPLE_QUOTE_CONTEXTS) {
    const ctx: PricingContext = {
      mainSectionId: partial.mainSectionId ?? "voisins",
      wantsCompetitorExtras: partial.wantsCompetitorExtras ?? false,
      competitionIds: [],
      familyRegistrationOrder: "none",
      sex: "male",
      pricingDate: "2025-09-01",
      ...partial,
    };

    const sectionExists = config.sections.some(
      (s) => s.id === ctx.mainSectionId && s.enabled
    );
    if (!sectionExists) continue;

    const quote = calculateQuoteFromConfig(ctx, config);
    if (quote.totalCents <= 0 && quote.lines.length === 0) {
      issues.push({
        path: "rateTable",
        message: `Impossible de calculer un tarif pour ${ctx.mainSectionId} (${ctx.birthDate})`,
      });
    }

    const defaultQuote = calculateQuoteFromConfig(ctx, defaultConfig);
    if (defaultQuote.totalCents > 0 && quote.totalCents <= 0) {
      issues.push({
        path: "rateTable",
        message: `Tarif nul inattendu pour ${ctx.mainSectionId} (${ctx.birthDate})`,
      });
    }
  }

  return issues;
}

export function validateRegistrationConfigForPublish(
  config: RegistrationConfigV1
): ConfigValidationIssue[] {
  return [
    ...validateRegistrationConfigCrossRefs(config),
    ...runSampleQuoteChecks(config),
  ];
}
