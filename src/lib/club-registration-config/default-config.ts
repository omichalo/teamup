import {
  CLUB_REGISTRATION_SITES,
  COMPETITION_OPTIONS,
  HANDISPORT_PRACTICE_OPTIONS,
  JERSEY_SIZES,
  REDUCTION_OPTIONS,
  SECTION_PRINCIPALE_OPTIONS,
} from "@/lib/club-registration/constants";
import {
  COMPETITIONS_JEUNES_ID,
  YOUTH_COMPETITION_FORM_IDS,
} from "@/lib/club-registration/competition-ids";
import { SCHOOL_PICKUP_SERVICE } from "@/lib/club-registration/school-pickup";
import { DEFAULT_PASS_SPORT_FORM } from "@/lib/club-registration-config/aid-rules";
import {
  COMPETITION_LABELS,
  COMPETITION_PRICE_CENTS,
  FAMILY_DISCOUNT_ON_MEMBERSHIP_CENTS,
  FEMALE_FIRST_MEMBERSHIP_DISCOUNT_CENTS,
} from "@/lib/pricing/catalog/sqyping-2025";
import { PRICING_CATALOG_VERSION } from "@/lib/pricing/types";
import { inferLinkedSectionIdsFromSite } from "./site-section-links";
import {
  buildDefaultPricingProfilesRecord,
} from "./pricing-profiles";
import type {
  CompetitionBundle,
  RateTableEntry,
  RegistrationConfigV1,
  RegistrationSection,
} from "./types";

function sectionPricingProfile(id: string): RegistrationSection["pricingProfile"] {
  if (id === "handisport") return "handisport";
  if (id === "sport-adapte") return "sport_adapte";
  return "classic";
}

function sectionAgeBandProfileId(profile: RegistrationSection["pricingProfile"]): string {
  return profile;
}

function buildEcoleRateEntries(classicEntries: RateTableEntry[]): RateTableEntry[] {
  return classicEntries
    .filter((entry) => entry.match.pricingProfile === "classic")
    .map((entry) => ({
      ...entry,
      id: entry.id.replace(/^classic_/, "ecole_"),
      match: { ...entry.match, pricingProfile: "ecole" as const },
      segmentLabel: entry.segmentLabel
        .replace(/^Loisirs —/, "École —")
        .replace(/^Compétiteur —/, "École compétiteur —"),
    }));
}

function buildRateTable(): RateTableEntry[] {
  const classicAndSpecialty: RateTableEntry[] = [
    {
      id: "classic_leisure_baby",
      match: { pricingProfile: "classic", ageBandId: "baby_ping", wantsCompetitorExtras: false },
      membershipCents: 11_000,
      licenseCents: 4_500,
      segmentLabel: "Loisirs — Baby Ping (moins de 7 ans)",
    },
    {
      id: "classic_leisure_under15",
      match: { pricingProfile: "classic", ageBandId: "under_15", wantsCompetitorExtras: false },
      membershipCents: 16_000,
      licenseCents: 4_500,
      segmentLabel: "Loisirs — Moins de 15 ans",
    },
    {
      id: "classic_leisure_adult",
      match: { pricingProfile: "classic", ageBandId: "adult_15_plus", wantsCompetitorExtras: false },
      membershipCents: 16_000,
      licenseCents: 6_200,
      segmentLabel: "Loisirs — 15 ans et plus",
    },
    {
      id: "classic_compet_baby",
      match: { pricingProfile: "classic", ageBandId: "baby_ping", wantsCompetitorExtras: true },
      membershipCents: 12_500,
      licenseCents: 4_500,
      segmentLabel: "Compétiteur — Baby Ping (moins de 7 ans)",
    },
    {
      id: "classic_compet_under15",
      match: { pricingProfile: "classic", ageBandId: "under_15", wantsCompetitorExtras: true },
      membershipCents: 17_500,
      licenseCents: 4_500,
      segmentLabel: "Compétiteur — Moins de 15 ans",
    },
    {
      id: "classic_compet_adult",
      match: { pricingProfile: "classic", ageBandId: "adult_15_plus", wantsCompetitorExtras: true },
      membershipCents: 17_500,
      licenseCents: 6_200,
      segmentLabel: "Compétiteur — 15 ans et plus",
    },
    {
      id: "handisport_leisure",
      match: { pricingProfile: "handisport", wantsCompetitorExtras: false },
      membershipCents: 16_000,
      licenseCents: 3_100,
      segmentLabel: "Handisport — Loisirs",
    },
    {
      id: "handisport_compet_under20",
      match: {
        pricingProfile: "handisport",
        wantsCompetitorExtras: true,
        ageBandId: "under_20",
      },
      membershipCents: 17_500,
      licenseCents: 3_000,
      segmentLabel: "Handisport — Compétiteur (moins de 20 ans)",
    },
    {
      id: "handisport_compet_adult",
      match: {
        pricingProfile: "handisport",
        wantsCompetitorExtras: true,
        ageBandId: "adult_20_plus",
      },
      membershipCents: 17_500,
      licenseCents: 7_000,
      segmentLabel: "Handisport — Compétiteur (20 ans et plus)",
    },
    {
      id: "sport_adapte_leisure_under21",
      match: {
        pricingProfile: "sport_adapte",
        ageBandId: "under_21",
        wantsCompetitorExtras: false,
      },
      membershipCents: 16_000,
      licenseCents: 3_500,
      segmentLabel: "Sport adapté — Loisirs (moins de 21 ans)",
    },
    {
      id: "sport_adapte_leisure_adult",
      match: {
        pricingProfile: "sport_adapte",
        ageBandId: "adult_21_plus",
        wantsCompetitorExtras: false,
      },
      membershipCents: 16_000,
      licenseCents: 4_000,
      segmentLabel: "Sport adapté — Loisirs (21 ans et plus)",
    },
    {
      id: "sport_adapte_compet_under21",
      match: {
        pricingProfile: "sport_adapte",
        ageBandId: "under_21",
        wantsCompetitorExtras: true,
      },
      membershipCents: 17_500,
      licenseCents: 3_500,
      segmentLabel: "Sport adapté — Compétiteur (moins de 21 ans)",
    },
    {
      id: "sport_adapte_compet_adult",
      match: {
        pricingProfile: "sport_adapte",
        ageBandId: "adult_21_plus",
        wantsCompetitorExtras: true,
      },
      membershipCents: 17_500,
      licenseCents: 4_000,
      segmentLabel: "Sport adapté — Compétiteur (21 ans et plus)",
    },
  ];
  return [...classicAndSpecialty, ...buildEcoleRateEntries(classicAndSpecialty)];
}

function buildCompetitionBundles(): CompetitionBundle[] {
  return [
    {
      billingId: COMPETITIONS_JEUNES_ID,
      sourceIds: [...YOUTH_COMPETITION_FORM_IDS],
      priceCents: COMPETITION_PRICE_CENTS.competitions_jeunes ?? 2_500,
      stripeLabel: COMPETITION_LABELS.competitions_jeunes ?? "Compétitions jeunes",
    },
  ];
}

/** Construit la configuration par défaut à partir des constantes codées en dur actuelles. */
export function buildDefaultRegistrationConfig(): RegistrationConfigV1 {
  const youthIds = new Set<string>(YOUTH_COMPETITION_FORM_IDS);

  return {
    meta: {
      catalogVersion: PRICING_CATALOG_VERSION,
      clubName: "SQY Ping",
      currency: "eur",
      seasonLabel: "2025-2026",
    },
    pricingProfiles: buildDefaultPricingProfilesRecord(),
    sections: SECTION_PRINCIPALE_OPTIONS.map((section, index) => {
      const pricingProfile = sectionPricingProfile(section.id);
      return {
        id: section.id,
        label: section.label,
        sortOrder: index,
        pricingProfile,
        ageBandProfileId: sectionAgeBandProfileId(pricingProfile),
        enabled: true,
      };
    }),
    sites: CLUB_REGISTRATION_SITES.map((site, index) => ({
      id: site.id,
      label: site.label,
      ...(site.gymnasiumName?.trim()
        ? { gymnasiumName: site.gymnasiumName.trim() }
        : {}),
      linkedSectionIds: inferLinkedSectionIdsFromSite(site),
      sortOrder: index,
      slots: site.slots.map((slot, slotIndex) => ({
        id: slot.id,
        label: slot.label,
        sortOrder: slotIndex,
        enabled: true,
        ...(slot.schoolPickupSchool
          ? { schoolPickupSchool: slot.schoolPickupSchool }
          : {}),
      })),
    })),
    competitions: COMPETITION_OPTIONS.map((comp) => ({
      id: comp.id,
      formLabel: comp.label.replace(/\s*\([0-9 €—]+.*\)$/, ""),
      stripeLabel: COMPETITION_LABELS[comp.id] ?? comp.label,
      priceCents: COMPETITION_PRICE_CENTS[comp.id] ?? 0,
      formGroup: youthIds.has(comp.id) ? "youth" : "other",
      enabled: true,
    })),
    competitionBundles: buildCompetitionBundles(),
    ageBandProfiles: {
      classic: {
        id: "classic",
        label: "Sections classiques",
        bands: [
          { id: "baby_ping", minAge: 0, maxAge: 6, label: "Baby Ping (moins de 7 ans)" },
          { id: "under_15", minAge: 7, maxAge: 14, label: "Moins de 15 ans" },
          { id: "adult_15_plus", minAge: 15, label: "15 ans et plus" },
        ],
      },
      handisport: {
        id: "handisport",
        label: "Handisport compétition",
        bands: [
          { id: "under_20", minAge: 0, maxAge: 19, label: "Moins de 20 ans" },
          { id: "adult_20_plus", minAge: 20, label: "20 ans et plus" },
        ],
      },
      sport_adapte: {
        id: "sport_adapte",
        label: "Sport adapté",
        bands: [
          { id: "under_21", minAge: 0, maxAge: 20, label: "Moins de 21 ans" },
          { id: "adult_21_plus", minAge: 21, label: "21 ans et plus" },
        ],
      },
      ecole: {
        id: "ecole",
        label: "École de ping",
        bands: [
          { id: "baby_ping", minAge: 0, maxAge: 6, label: "Baby Ping (moins de 7 ans)" },
          { id: "under_15", minAge: 7, maxAge: 14, label: "Moins de 15 ans" },
          { id: "adult_15_plus", minAge: 15, label: "15 ans et plus" },
        ],
      },
    },
    rateTable: buildRateTable(),
    discountRules: [
      {
        id: "family_second",
        conditions: { familyRegistrationOrder: "second" },
        amountCents: FAMILY_DISCOUNT_ON_MEMBERSHIP_CENTS.second,
        label: "Réduction — 2ᵉ adhérent de la famille",
        appliesTo: "membership",
        stripeKind: "discount_family",
      },
      {
        id: "family_third_or_more",
        conditions: { familyRegistrationOrder: "third_or_more" },
        amountCents: FAMILY_DISCOUNT_ON_MEMBERSHIP_CENTS.third_or_more,
        label: "Réduction — 3ᵉ adhérent (ou plus) de la famille",
        appliesTo: "membership",
        stripeKind: "discount_family",
      },
      {
        id: "female_first",
        conditions: { sex: "female", firstFemaleRegistrationSqy: true },
        amountCents: FEMALE_FIRST_MEMBERSHIP_DISCOUNT_CENTS,
        label: "Réduction — 1ʳᵉ inscription féminine au club",
        appliesTo: "membership",
        stripeKind: "discount_female_first",
      },
    ],
    aidRules: REDUCTION_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      effect: { type: "admin_review" as const },
      ...(option.id === "pass_sport" ? { form: DEFAULT_PASS_SPORT_FORM } : {}),
    })),
    stripePresentation: {
      membershipLabel: "Adhésion club",
      membershipLabelWithDiscounts: "Adhésion club (net après remises)",
      licenseLabel: "Licence FFTT",
      competitorJerseyInfoLabel:
        "Maillot compétiteur inclus (renouvellement tous les deux ans)",
      invoiceHeaderTemplate: "Adhésion {{clubName}} — dossier {{registrationId}}",
      discountCustomFieldName: "Remises sur adhésion",
    },
    uiCopy: {
      schoolPickupService: {
        title: SCHOOL_PICKUP_SERVICE.title,
        intro: SCHOOL_PICKUP_SERVICE.intro,
        steps: [...SCHOOL_PICKUP_SERVICE.steps],
        optInLabel: SCHOOL_PICKUP_SERVICE.optInLabel,
      },
      jerseySizes: [...JERSEY_SIZES],
      handisportPracticeOptions: HANDISPORT_PRACTICE_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
      })),
    },
  };
}

let cachedDefaultConfig: RegistrationConfigV1 | null = null;

/** Config par défaut (seed / tests / fallback hors Firestore). */
export function getDefaultRegistrationConfig(): RegistrationConfigV1 {
  if (!cachedDefaultConfig) {
    cachedDefaultConfig = buildDefaultRegistrationConfig();
  }
  return cachedDefaultConfig;
}
