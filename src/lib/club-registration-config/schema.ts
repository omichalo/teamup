import { z } from "zod";
import { CONFIG_EDITOR_ACCENTS } from "./config-editor-accents";
import { CONFIG_EDITOR_ICON_KEYS } from "@/components/club-registration-config/config-editor-icons";
import { REGISTRATION_CONFIG_SCHEMA_VERSION } from "./types";
import type { RegistrationConfigV1 } from "./types";
import { repairPricingProfiles } from "./pricing-profiles";
import { repairJerseyConfig } from "./repair-jersey";

const pricingProfileBehaviorSchema = z.enum(["classic_like", "handisport", "sport_adapte"]);

const pricingProfileDefinitionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0),
  accent: z.enum(CONFIG_EDITOR_ACCENTS),
  iconKey: z.enum(CONFIG_EDITOR_ICON_KEYS),
  behavior: pricingProfileBehaviorSchema,
  builtIn: z.boolean().optional(),
});

const pricingProfileIdSchema = z.string().trim().min(1).max(80);

const registrationSectionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().min(0),
  pricingProfile: pricingProfileIdSchema,
  ageBandProfileId: z.string().trim().min(1).max(80),
  enabled: z.boolean(),
});

const registrationSiteSlotSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(300),
  sortOrder: z.number().int().min(0).default(0),
  schoolPickupSchool: z.string().trim().min(1).max(200).optional(),
  enabled: z.boolean(),
});

/** Chaîne optionnelle : vide ou espaces → `undefined` (champ masqué côté formulaire). */
const optionalTrimmedLabelSchema = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const registrationSiteSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  gymnasiumName: optionalTrimmedLabelSchema(200),
  linkedSectionIds: z.array(z.string().trim().min(1)).default([]),
  sortOrder: z.number().int().min(0),
  slots: z.array(registrationSiteSlotSchema),
});

const registrationCompetitionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  formLabel: z.string().trim().min(1).max(300),
  stripeLabel: z.string().trim().min(1).max(300),
  priceCents: z.number().int().min(0),
  formGroup: z.enum(["youth", "other"]),
  enabled: z.boolean(),
});

const competitionBundleSchema = z.object({
  billingId: z.string().trim().min(1).max(80),
  sourceIds: z.array(z.string().trim().min(1)).min(1),
  priceCents: z.number().int().min(0),
  stripeLabel: z.string().trim().min(1).max(300),
});

const ageBandSchema = z.object({
  id: z.string().trim().min(1).max(80),
  minAge: z.number().int().min(0).max(120),
  maxAge: z.number().int().min(0).max(120).optional(),
  label: z.string().trim().min(1).max(200),
});

const ageBandProfileSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  bands: z.array(ageBandSchema).min(1),
});

const rateTableMatchSchema = z.object({
  pricingProfile: pricingProfileIdSchema,
  ageBandId: z.string().trim().min(1).max(80).optional(),
  practiceLevel: z.enum(["leisure", "competition"]).optional(),
  wantsCompetitorExtras: z.boolean().optional(),
});

const rateTableEntrySchema = z.object({
  id: z.string().trim().min(1).max(80),
  match: rateTableMatchSchema,
  membershipCents: z.number().int().min(0),
  licenseCents: z.number().int().min(0),
  segmentLabel: z.string().trim().min(1).max(300),
});

const discountRuleSchema = z.object({
  id: z.string().trim().min(1).max(80),
  conditions: z.object({
    familyRegistrationOrder: z.enum(["second", "third_or_more"]).optional(),
    sex: z.enum(["female"]).optional(),
    firstFemaleRegistrationSqy: z.boolean().optional(),
  }),
  amountCents: z.number().int().min(0),
  label: z.string().trim().min(1).max(300),
  appliesTo: z.literal("membership"),
  stripeKind: z.enum(["discount_family", "discount_female_first", "discount_aid"]),
});

const aidRuleEffectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("admin_review") }),
  z.object({ type: z.literal("fixed_discount"), amountCents: z.number().int().min(0) }),
  z.object({ type: z.literal("percentage"), percent: z.number().min(0).max(100) }),
]);

const aidRuleFormPresentationSchema = z.discriminatedUnion("style", [
  z.object({ style: z.literal("checkbox") }),
  z.object({
    style: z.literal("toggle"),
    toggleLabel: z.string().trim().min(1).max(200),
    referenceCode: z.object({
      label: z.string().trim().min(1).max(200),
      helperText: z.string().trim().max(500).optional(),
      maxLength: z.number().int().min(1).max(200).optional(),
    }),
  }),
]);

const aidRuleSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  effect: aidRuleEffectSchema,
  form: aidRuleFormPresentationSchema.optional(),
});

const stripePresentationSchema = z.object({
  membershipLabel: z.string().trim().min(1).max(200),
  membershipLabelWithDiscounts: z.string().trim().min(1).max(200),
  licenseLabel: z.string().trim().min(1).max(200),
  competitorJerseyInfoLabel: z.string().trim().min(1).max(300),
  invoiceHeaderTemplate: z.string().trim().min(1).max(300),
  discountCustomFieldName: z.string().trim().min(1).max(200),
});

const jerseyCatalogSchema = z.object({
  optionalPriceCents: z.number().int().min(0),
  optionalStripeLabel: z.string().trim().min(1).max(300),
});

const registrationUiCopySchema = z.object({
  schoolPickupService: z.object({
    title: z.string().trim().min(1).max(200),
    intro: z.string().trim().min(1).max(2000),
    steps: z.array(z.string().trim().min(1).max(500)).min(1),
    optInLabel: z.string().trim().min(1).max(500),
  }),
  jerseySizes: z.array(z.string().trim().min(1).max(20)).min(1),
  handisportPracticeOptions: z
    .array(
      z.object({
        id: z.enum(["leisure", "competition"]),
        label: z.string().trim().min(1).max(100),
      })
    )
    .min(1),
  competitorJerseyHelper: z.string().trim().min(1).max(500).optional(),
  jerseySizeHelper: z.string().trim().min(1).max(500).optional(),
  optionalJerseyOptInLabel: z.string().trim().min(1).max(500).optional(),
});

export const registrationConfigV1Schema = z
  .object({
  meta: z.object({
    catalogVersion: z.string().trim().min(1).max(80),
    clubName: z.string().trim().min(1).max(200),
    currency: z.literal("eur"),
    seasonLabel: z.string().trim().min(1).max(120),
  }),
  pricingProfiles: z.record(z.string(), pricingProfileDefinitionSchema).optional(),
  sections: z.array(registrationSectionSchema).min(1),
  sites: z.array(registrationSiteSchema).min(1),
  competitions: z.array(registrationCompetitionSchema),
  competitionBundles: z.array(competitionBundleSchema),
  ageBandProfiles: z.record(z.string(), ageBandProfileSchema),
  rateTable: z.array(rateTableEntrySchema).min(1),
  discountRules: z.array(discountRuleSchema),
  aidRules: z.array(aidRuleSchema),
  stripePresentation: stripePresentationSchema,
  jersey: jerseyCatalogSchema.optional(),
  uiCopy: registrationUiCopySchema,
})
  .transform((config) => repairPricingProfiles(config as RegistrationConfigV1))
  .transform((config) => repairJerseyConfig(config as RegistrationConfigV1));

export const registrationConfigExportSchema = z.object({
  schemaVersion: z.literal(REGISTRATION_CONFIG_SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  config: registrationConfigV1Schema,
});

export type RegistrationConfigV1Input = z.infer<typeof registrationConfigV1Schema>;
