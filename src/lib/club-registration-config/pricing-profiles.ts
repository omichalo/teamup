import type { ConfigEditorAccent } from "./config-editor-accents";
import type {
  PricingProfileDefinition,
  RateTableMatch,
  RegistrationConfigV1,
} from "./types";
import { sortBySortOrder } from "./sort-order";

export type PricingProfileBehavior = PricingProfileDefinition["behavior"];

export const BUILTIN_PRICING_PROFILE_IDS = [
  "classic",
  "handisport",
  "sport_adapte",
  "ecole",
  "champ_yon",
] as const;

export type BuiltinPricingProfileId = (typeof BUILTIN_PRICING_PROFILE_IDS)[number];

/** @deprecated Utiliser config.pricingProfiles — conservé pour migrations. */
export type PricingProfileId = string;

export function buildDefaultPricingProfilesRecord(): Record<string, PricingProfileDefinition> {
  const defs: PricingProfileDefinition[] = [
    {
      id: "classic",
      label: "Classique",
      sortOrder: 0,
      accent: "primary",
      iconKey: "category",
      behavior: "classic_like",
      builtIn: true,
    },
    {
      id: "handisport",
      label: "Handisport",
      sortOrder: 1,
      accent: "secondary",
      iconKey: "accessible",
      behavior: "handisport",
      builtIn: true,
    },
    {
      id: "sport_adapte",
      label: "Sport adapté",
      sortOrder: 2,
      accent: "info",
      iconKey: "sports_handball",
      behavior: "sport_adapte",
      builtIn: true,
    },
    {
      id: "ecole",
      label: "École de ping",
      sortOrder: 3,
      accent: "success",
      iconKey: "school",
      behavior: "classic_like",
      builtIn: true,
    },
    {
      id: "champ_yon",
      label: "CHAMP'YON",
      sortOrder: 4,
      accent: "warning",
      iconKey: "emoji_events",
      behavior: "classic_like",
      builtIn: true,
    },
  ];
  return Object.fromEntries(defs.map((def) => [def.id, def]));
}

export function listPricingProfiles(config: RegistrationConfigV1): PricingProfileDefinition[] {
  return sortBySortOrder(Object.values(config.pricingProfiles));
}

export function getPricingProfileDef(
  config: RegistrationConfigV1,
  profileId: string
): PricingProfileDefinition | undefined {
  return config.pricingProfiles[profileId];
}

export function getPricingProfileBehavior(
  config: RegistrationConfigV1,
  profileId: string
): PricingProfileBehavior {
  return getPricingProfileDef(config, profileId)?.behavior ?? "classic_like";
}

export function pricingProfileLabel(config: RegistrationConfigV1, profileId: string): string {
  return getPricingProfileDef(config, profileId)?.label ?? profileId;
}

export function defaultAgeBandProfileIdForPricingProfile(
  config: RegistrationConfigV1,
  profileId: string
): string {
  const def = getPricingProfileDef(config, profileId);
  if (def && config.ageBandProfiles[profileId]) {
    return profileId;
  }
  if (config.ageBandProfiles.classic) return "classic";
  const first = Object.keys(config.ageBandProfiles)[0];
  return first ?? profileId;
}

export function isClassicLikePricingProfile(
  config: RegistrationConfigV1,
  profileId: string
): boolean {
  return getPricingProfileBehavior(config, profileId) === "classic_like";
}

export function sectionIdsWithBehavior(
  config: RegistrationConfigV1,
  behavior: PricingProfileBehavior
): Set<string> {
  return new Set(
    config.sections
      .filter((section) => getPricingProfileBehavior(config, section.pricingProfile) === behavior)
      .map((section) => section.id)
  );
}

export function profileAccent(
  config: RegistrationConfigV1,
  profileId: string
): ConfigEditorAccent {
  return getPricingProfileDef(config, profileId)?.accent ?? "primary";
}

export function profileIconKey(config: RegistrationConfigV1, profileId: string): string {
  return getPricingProfileDef(config, profileId)?.iconKey ?? "category";
}

/** Ancien critère handisport : `practiceLevel` → `wantsCompetitorExtras`. */
function migrateHandisportRateMatch(match: RateTableMatch): RateTableMatch {
  if (match.practiceLevel === undefined) {
    return match;
  }
  const { practiceLevel, ...rest } = match;
  return {
    ...rest,
    wantsCompetitorExtras: practiceLevel === "competition",
  };
}

/** Répare les configs sans bloc pricingProfiles (import / brouillon ancien). */
export function repairPricingProfiles(config: RegistrationConfigV1): RegistrationConfigV1 {
  const defaults = buildDefaultPricingProfilesRecord();
  const merged: Record<string, PricingProfileDefinition> = {
    ...defaults,
    ...(config.pricingProfiles ?? {}),
  };

  const normalized: Record<string, PricingProfileDefinition> = {};
  for (const [key, def] of Object.entries(merged)) {
    const id = def.id || key;
    normalized[id] = { ...def, id };
  }

  for (const section of config.sections) {
    if (!normalized[section.pricingProfile]) {
      normalized[section.pricingProfile] = {
        id: section.pricingProfile,
        label: section.pricingProfile,
        sortOrder: Object.keys(normalized).length,
        accent: "primary",
        iconKey: "category",
        behavior: "classic_like",
      };
    }
  }

  for (const entry of config.rateTable) {
    if (!normalized[entry.match.pricingProfile]) {
      normalized[entry.match.pricingProfile] = {
        id: entry.match.pricingProfile,
        label: entry.match.pricingProfile,
        sortOrder: Object.keys(normalized).length,
        accent: "primary",
        iconKey: "category",
        behavior: "classic_like",
      };
    }
  }

  const sorted = sortBySortOrder(Object.values(normalized)).map((def, index) => ({
    ...def,
    sortOrder: index,
  }));

  const rateTable = config.rateTable.map((entry) => ({
    ...entry,
    match: migrateHandisportRateMatch(entry.match),
  }));

  return {
    ...config,
    pricingProfiles: Object.fromEntries(sorted.map((def) => [def.id, def])),
    rateTable,
  };
}
