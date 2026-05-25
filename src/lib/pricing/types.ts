/**
 * Modèle tarifaire SQY Ping — types partagés (moteur pur, sans Stripe ni Firestore).
 */

export const PRICING_CATALOG_VERSION = "sqyping-2025-05" as const;

export type PricingCatalogVersion = string;

export type FamilyRegistrationOrder = "none" | "second" | "third_or_more";

export type PriceLineKind =
  | "membership"
  | "fftt_license"
  | "competition"
  | "discount_family"
  | "discount_female_first"
  | "discount_aid"
  | "info";

export type PriceLineSource = "catalog" | "pending_validation";

export type PriceLine = {
  id: string;
  kind: PriceLineKind;
  label: string;
  amountCents: number;
  source: PriceLineSource;
  metadata?: Record<string, string>;
};

export type PricingContext = {
  /** Date ISO de référence pour le calcul d'âge (défaut : aujourd'hui). */
  pricingDate?: string;
  birthDate: string;
  mainSectionId: string;
  wantsCompetitorExtras: boolean;
  competitionIds: string[];
  familyRegistrationOrder: FamilyRegistrationOrder;
  sex: "female" | "male" | "other";
  firstFemaleRegistrationSqy?: boolean;
  /** Aides déclarées — informatif en V1 (pas de montant). */
  reductionTypes?: string[];
};

export type PriceQuote = {
  catalogVersion: PricingCatalogVersion;
  segmentLabel: string;
  lines: PriceLine[];
  subtotalCents: number;
  totalCents: number;
  warnings: string[];
  requiresAdminReview: boolean;
};
