/**
 * Types pour la configuration paramétrable de l'inscription club.
 */

export const REGISTRATION_CONFIG_SCHEMA_VERSION = "1.0.0" as const;

import type { ConfigEditorAccent } from "./config-editor-accents";

export type PricingProfileBehavior = "classic_like" | "handisport" | "sport_adapte";

export type PricingProfileDefinition = {
  id: string;
  label: string;
  sortOrder: number;
  accent: ConfigEditorAccent;
  iconKey: string;
  behavior: PricingProfileBehavior;
  /** Profil livré avec l'application : non supprimable. */
  builtIn?: boolean | undefined;
};

export type RegistrationConfigMeta = {
  catalogVersion: string;
  clubName: string;
  currency: "eur";
  seasonLabel: string;
};

export type RegistrationSection = {
  id: string;
  label: string;
  sortOrder: number;
  pricingProfile: string;
  ageBandProfileId: string;
  enabled: boolean;
};

export type RegistrationSiteSlot = {
  id: string;
  label: string;
  sortOrder: number;
  schoolPickupSchool?: string | undefined;
  enabled: boolean;
};

export type RegistrationSite = {
  id: string;
  label: string;
  /** Nom du gymnase affiché aux familles (ex. « Gymnase des Côtes »). */
  gymnasiumName?: string | undefined;
  linkedSectionIds: string[];
  sortOrder: number;
  slots: RegistrationSiteSlot[];
};

export type RegistrationCompetition = {
  id: string;
  formLabel: string;
  stripeLabel: string;
  priceCents: number;
  formGroup: "youth" | "other";
  enabled: boolean;
};

export type CompetitionBundle = {
  billingId: string;
  sourceIds: string[];
  priceCents: number;
  stripeLabel: string;
};

export type AgeBand = {
  id: string;
  minAge: number;
  maxAge?: number | undefined;
  label: string;
};

export type AgeBandProfile = {
  id: string;
  label: string;
  bands: AgeBand[];
};

export type RateTableMatch = {
  pricingProfile: string;
  ageBandId?: string | undefined;
  practiceLevel?: "leisure" | "competition" | undefined;
  wantsCompetitorExtras?: boolean | undefined;
};

export type RateTableEntry = {
  id: string;
  match: RateTableMatch;
  membershipCents: number;
  licenseCents: number;
  segmentLabel: string;
};

export type DiscountRuleConditions = {
  familyRegistrationOrder?: "second" | "third_or_more" | undefined;
  sex?: "female" | undefined;
  firstFemaleRegistrationSqy?: boolean | undefined;
};

export type DiscountRule = {
  id: string;
  conditions: DiscountRuleConditions;
  amountCents: number;
  label: string;
  appliesTo: "membership";
  stripeKind: "discount_family" | "discount_female_first" | "discount_aid";
};

export type AidRuleEffect =
  | { type: "admin_review" }
  | { type: "fixed_discount"; amountCents: number }
  | { type: "percentage"; percent: number };

export type AidRuleFormPresentation =
  | { style: "checkbox" }
  | {
      style: "toggle";
      toggleLabel: string;
      referenceCode: {
        label: string;
        helperText?: string | undefined;
        maxLength?: number | undefined;
      };
    };

export type AidRule = {
  id: string;
  label: string;
  effect: AidRuleEffect;
  form?: AidRuleFormPresentation | undefined;
  /** Texte d'accompagnement affiché aux familles à côté de l'aide. */
  helperText?: string | undefined;
  /** Plafond facultatif du montant saisi par la famille (centimes). */
  maxAmountCents?: number | undefined;
  /** Montant exact imposé (centimes) — le champ est prérempli et non modifiable. */
  fixedAmountCents?: number | undefined;
};

export type StripePresentationConfig = {
  membershipLabel: string;
  membershipLabelWithDiscounts: string;
  licenseLabel: string;
  competitorJerseyInfoLabel: string;
  invoiceHeaderTemplate: string;
  discountCustomFieldName: string;
  /** Ligne facture Stripe pour le don libre. */
  donationLabel: string;
  /** Libellé du coupon de remise don affiché sur la facture. */
  donationDiscountCouponName: string;
};

/** Tarification et libellé Stripe du maillot commandé hors section compétiteur. */
export type JerseyCatalogConfig = {
  optionalPriceCents: number;
  optionalStripeLabel: string;
};

export type PricingDeviceConditions = {
  /** Sections principales éligibles (ex. trappes, la-verriere). */
  sectionIds: string[];
  /** Nombre exact de créneaux requis (ex. 1). */
  exactSlotCount: number;
  /** Aucune section complémentaire cochée. */
  requiresNoAdditionalSections: boolean;
  /** Section compétiteur désactivée. */
  requiresNoCompetitorExtras: boolean;
  /** Aucune compétition sélectionnée. */
  requiresNoCompetitionSelection: boolean;
};

export type PricingDeviceUiCopy = {
  recapHint?: string | undefined;
  adminBadge?: string | undefined;
  segmentLabelPrefix?: string | undefined;
};

export type PricingDevice = {
  id: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  /** Priorité de résolution (plus élevé = évalué en premier). */
  priority: number;
  conditions: PricingDeviceConditions;
  /** Profil tarifaire substitué lorsque le dispositif s'applique. */
  pricingProfileId: string;
  /** Profil de tranches d'âge (défaut : celui de la section). */
  ageBandProfileId?: string | undefined;
  /** Remises catalogue (famille, 1re féminine) cumulables ou non. */
  stackableWithDiscounts: boolean;
  /** Facturer la ligne licence FFTT lorsque le dispositif s'applique. */
  includesFfttLicense: boolean;
  uiCopy?: PricingDeviceUiCopy | undefined;
  /** Livré avec l'application : réinjecté si absent d'une config importée. */
  builtIn?: boolean | undefined;
};

export type SchoolPickupServiceCopy = {
  title: string;
  intro: string;
  steps: string[];
  optInLabel: string;
};

export type RegistrationUiCopy = {
  schoolPickupService: SchoolPickupServiceCopy;
  jerseySizes: string[];
  handisportPracticeOptions: Array<{ id: "leisure" | "competition"; label: string }>;
  /** Texte d'aide sous l'option section compétiteur (maillot obligatoire, 15 € inclus). */
  competitorJerseyHelper: string;
  /** Note sous le sélecteur de taille (modèle garçon). */
  jerseySizeHelper: string;
  /** Libellé de la case à cocher maillot hors section compétiteur. */
  optionalJerseyOptInLabel: string;
};

export type RegistrationConfigV1 = {
  meta: RegistrationConfigMeta;
  pricingProfiles: Record<string, PricingProfileDefinition>;
  sections: RegistrationSection[];
  sites: RegistrationSite[];
  competitions: RegistrationCompetition[];
  competitionBundles: CompetitionBundle[];
  ageBandProfiles: Record<string, AgeBandProfile>;
  rateTable: RateTableEntry[];
  discountRules: DiscountRule[];
  aidRules: AidRule[];
  stripePresentation: StripePresentationConfig;
  jersey: JerseyCatalogConfig;
  uiCopy: RegistrationUiCopy;
  pricingDevices: PricingDevice[];
};

export type RegistrationConfigExport = {
  schemaVersion: typeof REGISTRATION_CONFIG_SCHEMA_VERSION;
  exportedAt: string;
  config: RegistrationConfigV1;
};
