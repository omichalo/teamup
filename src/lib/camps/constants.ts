export const CAMP_STATUSES = ["draft", "open", "closed"] as const;
export type CampStatus = (typeof CAMP_STATUSES)[number];

export const CAMP_REGISTRATION_STATUSES = [
  "submitted",
  "awaiting_payment",
  "partially_paid",
  "paid",
  "cancelled",
] as const;
export type CampRegistrationStatus = (typeof CAMP_REGISTRATION_STATUSES)[number];

/** Mode de calcul tarifaire — pas un catalogue de lieux. */
export const CAMP_PRICING_MODES = ["session", "day_week"] as const;
export type CampPricingMode = (typeof CAMP_PRICING_MODES)[number];

export const CAMP_PRICING_MODE_LABELS: Record<CampPricingMode, string> = {
  session: "À la session",
  day_week: "Journée / semaine",
};

export const CAMP_PAYMENT_METHOD_IDS = [
  "card",
  "cheque",
  "holiday_vouchers",
  "cash",
] as const;
export type CampPaymentMethodId = (typeof CAMP_PAYMENT_METHOD_IDS)[number];

export const CAMP_PAYMENT_METHOD_LABELS: Record<CampPaymentMethodId, string> = {
  card: "Carte bancaire",
  cheque: "Chèque",
  holiday_vouchers: "Chèques vacances",
  cash: "Espèces",
};

export const CAMP_COLLECTIONS = {
  camps: "camps",
  slots: "campSlots",
  registrations: "campRegistrations",
  marks: "campAttendanceMarks",
  documentCounters: "campPaymentDocumentCounters",
  catalogSites: "campCatalogSites",
  catalogFormulas: "campCatalogFormulas",
  catalogPricings: "campCatalogPricings",
} as const;

export const CAMP_SCHEMA_VERSION = 1 as const;

/** Anciens ids figés — migration lecture uniquement. */
export const LEGACY_FORMULA_META: Record<
  string,
  { label: string; pricingMode: CampPricingMode }
> = {
  voisins_day: { label: "Sessions 2h — journée", pricingMode: "session" },
  voisins_evening: { label: "Sessions 2h — soirée / midi", pricingMode: "session" },
  villepreux: { label: "Journée / semaine", pricingMode: "day_week" },
  guyancourt: { label: "Journée / semaine", pricingMode: "day_week" },
};
