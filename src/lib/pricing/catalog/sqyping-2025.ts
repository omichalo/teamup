/**
 * Grille tarifaire publique SQY Ping — https://www.sqyping.fr/tarifs
 * Montants en centimes d'euro (EUR).
 */

export const COMPETITION_PRICE_CENTS: Readonly<Record<string, number>> = {
  championnat_jeunes: 2_500,
  criterium_federal_jeunes: 2_500,
  championnat_equipe: 2_500,
  criterium_federal_seniors: 4_200,
  championnat_paris: 1_500,
  competition_handisport: 0,
};

export const COMPETITION_LABELS: Readonly<Record<string, string>> = {
  championnat_jeunes: "Championnat des jeunes",
  criterium_federal_jeunes: "Critérium fédéral jeunes",
  championnat_equipe: "Championnat par équipes",
  criterium_federal_seniors: "Critérium fédéral seniors",
  championnat_paris: "Championnat de Paris",
  competition_handisport: "Compétition handisport",
};

/** Remises famille sur l'adhésion club uniquement. */
export const FAMILY_DISCOUNT_ON_MEMBERSHIP_CENTS: Readonly<
  Record<"none" | "second" | "third_or_more", number>
> = {
  none: 0,
  second: 1_500,
  third_or_more: 3_000,
};

/** Réduction 1ʳᵉ inscription féminine au club — sur l'adhésion uniquement. */
export const FEMALE_FIRST_MEMBERSHIP_DISCOUNT_CENTS = 8_000;

export type BaseRates = {
  membershipCents: number;
  licenseCents: number;
  segmentLabel: string;
};

/* Loisirs */
const LEISURE: Record<"baby_ping" | "under_15" | "adult_15_plus", BaseRates> = {
  baby_ping: {
    membershipCents: 11_000,
    licenseCents: 4_500,
    segmentLabel: "Loisirs — Baby Ping (moins de 7 ans)",
  },
  under_15: {
    membershipCents: 16_000,
    licenseCents: 4_500,
    segmentLabel: "Loisirs — Moins de 15 ans",
  },
  adult_15_plus: {
    membershipCents: 16_000,
    licenseCents: 6_200,
    segmentLabel: "Loisirs — 15 ans et plus",
  },
};

/* Compétiteurs (maillot inclus — informatif, pas de ligne séparée) */
const COMPETITOR: Record<"baby_ping" | "under_15" | "adult_15_plus", BaseRates> = {
  baby_ping: {
    membershipCents: 12_500,
    licenseCents: 4_500,
    segmentLabel: "Compétiteur — Baby Ping (moins de 7 ans)",
  },
  under_15: {
    membershipCents: 17_500,
    licenseCents: 4_500,
    segmentLabel: "Compétiteur — Moins de 15 ans",
  },
  adult_15_plus: {
    membershipCents: 17_500,
    licenseCents: 6_200,
    segmentLabel: "Compétiteur — 15 ans et plus",
  },
};

const HANDISPORT_LEISURE: BaseRates = {
  membershipCents: 16_000,
  licenseCents: 3_200,
  segmentLabel: "Handisport — Loisirs",
};

const HANDISPORT_COMPETITION: Record<"under_20" | "adult_20_plus", BaseRates> = {
  under_20: {
    membershipCents: 17_500,
    licenseCents: 3_200,
    segmentLabel: "Handisport — Moins de 20 ans",
  },
  adult_20_plus: {
    membershipCents: 17_500,
    licenseCents: 7_000,
    segmentLabel: "Handisport — 20 ans et plus",
  },
};

const SPORT_ADAPTE_LEISURE: Record<"under_21" | "adult_21_plus", BaseRates> = {
  under_21: {
    membershipCents: 16_000,
    licenseCents: 5_000,
    segmentLabel: "Sport adapté — Loisirs (moins de 21 ans)",
  },
  adult_21_plus: {
    membershipCents: 16_000,
    licenseCents: 5_000,
    segmentLabel: "Sport adapté — Loisirs (21 ans et plus)",
  },
};

const SPORT_ADAPTE_COMPETITOR: Record<"under_21" | "adult_21_plus", BaseRates> = {
  under_21: {
    membershipCents: 17_500,
    licenseCents: 5_000,
    segmentLabel: "Sport adapté — Compétiteur (moins de 21 ans)",
  },
  adult_21_plus: {
    membershipCents: 17_500,
    licenseCents: 5_000,
    segmentLabel: "Sport adapté — Compétiteur (21 ans et plus)",
  },
};

export type ClassicAgeBand = keyof typeof LEISURE;
export type HandisportCompetitionAgeBand = keyof typeof HANDISPORT_COMPETITION;
export type SportAdapteAgeBand = keyof typeof SPORT_ADAPTE_LEISURE;

export function getLeisureRates(ageBand: ClassicAgeBand): BaseRates {
  return LEISURE[ageBand];
}

export function getCompetitorRates(ageBand: ClassicAgeBand): BaseRates {
  return COMPETITOR[ageBand];
}

export function getHandisportLeisureRates(): BaseRates {
  return HANDISPORT_LEISURE;
}

export function getHandisportCompetitionRates(
  ageBand: HandisportCompetitionAgeBand
): BaseRates {
  return HANDISPORT_COMPETITION[ageBand];
}

export function getSportAdapteRates(
  level: "leisure" | "competitor",
  ageBand: SportAdapteAgeBand
): BaseRates {
  return level === "leisure"
    ? SPORT_ADAPTE_LEISURE[ageBand]
    : SPORT_ADAPTE_COMPETITOR[ageBand];
}
