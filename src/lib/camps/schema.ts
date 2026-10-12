import { z } from "zod";
import {
  CAMP_PAYMENT_METHOD_IDS,
  CAMP_PRICING_MODES,
  CAMP_STATUSES,
} from "./constants";
import { campPricingRatesSchema } from "./catalog-schema";
import { seasonLabelFromYmd } from "./season";

const ymdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD");

const sessionTemplateSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    startMinutes: z.number().int().min(0).max(24 * 60 - 1),
    endMinutes: z.number().int().min(1).max(24 * 60),
  })
  .refine((s) => s.endMinutes > s.startMinutes, {
    message: "La fin doit être après le début",
  });

const formulaSchema = z.object({
  id: z.string().trim().min(1).max(64),
  catalogFormulaId: z.string().trim().min(1).max(64).optional(),
  label: z.string().trim().min(1).max(120),
  pricingMode: z.enum(CAMP_PRICING_MODES),
  sessions: z.array(sessionTemplateSchema).min(1).max(12),
});

const siteSchema = z.object({
  id: z.string().trim().min(1).max(64),
  catalogSiteId: z.string().trim().min(1).max(64).optional(),
  label: z.string().trim().min(1).max(120),
  formulas: z.array(formulaSchema).min(1),
});

const zeroPricing = {
  memberDayCents: 0,
  memberWeekCents: 0,
  nonMemberDayCents: 0,
  nonMemberWeekCents: 0,
  session2hCents: 0,
  twoSessionsSameDayCents: 0,
};

const campFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).default(""),
  /** Optionnel : déduit de startDate (saison sportive sept.→août). */
  seasonLabel: z.string().trim().min(1).max(120).optional(),
  status: z.enum(CAMP_STATUSES).default("draft"),
  registrationOpensAt: z.string().datetime().nullable().optional(),
  registrationClosesAt: z.string().datetime().nullable().optional(),
  startDate: ymdSchema,
  endDate: ymdSchema,
  /** Brouillon : sites optionnels ; requis avant statut « open ». */
  sites: z.array(siteSchema).default([]),
  pricing: campPricingRatesSchema.default(zeroPricing),
  catalogPricingId: z.string().trim().min(1).max(64).nullable().optional(),
});

export const campCreateSchema = campFieldsSchema.transform((data) => ({
  ...data,
  seasonLabel: data.seasonLabel?.trim() || seasonLabelFromYmd(data.startDate),
}));

/**
 * Patch sans `.default()` : sinon Zod remplit `sites: []` / pricing à 0
 * quand on n’envoie que `{ status: "open" }`, et écrase (ou bloque) le stage.
 */
export const campPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  seasonLabel: z.string().trim().min(1).max(120).optional(),
  status: z.enum(CAMP_STATUSES).optional(),
  registrationOpensAt: z.string().datetime().nullable().optional(),
  registrationClosesAt: z.string().datetime().nullable().optional(),
  startDate: ymdSchema.optional(),
  endDate: ymdSchema.optional(),
  sites: z.array(siteSchema).optional(),
  pricing: campPricingRatesSchema.optional(),
  catalogPricingId: z.string().trim().min(1).max(64).nullable().optional(),
});

export const campSlotCreateSchema = z.object({
  siteId: z.string().trim().min(1).max(64),
  siteLabel: z.string().trim().min(1).max(120),
  formulaId: z.string().trim().min(1).max(64),
  formulaLabel: z.string().trim().min(1).max(120),
  date: ymdSchema,
  startMinutes: z.number().int().min(0).max(24 * 60 - 1),
  endMinutes: z.number().int().min(1).max(24 * 60),
  label: z.string().trim().min(1).max(200),
  capacity: z.number().int().min(1).max(500).nullable().optional(),
});

export const campSlotsBulkCreateSchema = z.object({
  slots: z.array(campSlotCreateSchema).min(1).max(500),
});

export const campSlotPatchSchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  capacity: z.number().int().min(1).max(500).nullable().optional(),
  cancelled: z.boolean().optional(),
  startMinutes: z.number().int().min(0).max(24 * 60 - 1).optional(),
  endMinutes: z.number().int().min(1).max(24 * 60).optional(),
});

export const campRegistrationSubmitSchema = z.object({
  campId: z.string().trim().min(1),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  birthDate: ymdSchema,
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(200),
  isClubMember: z.boolean(),
  clubRegistrationId: z.string().trim().min(1).max(128).nullable().optional(),
  formulaId: z.string().trim().min(1).max(64),
  siteId: z.string().trim().min(1).max(64),
  siteLabel: z.string().trim().min(1).max(120),
  slotIds: z.array(z.string().trim().min(1)).min(1).max(40),
  chosenMethod: z.enum(CAMP_PAYMENT_METHOD_IDS),
  ownerUid: z.string().trim().min(1).max(128).optional(),
});

export const campManualPaymentSchema = z.object({
  method: z.enum(CAMP_PAYMENT_METHOD_IDS),
  amountCents: z.number().int().positive().max(1_000_000),
  paidAt: z.string().datetime().optional(),
  reference: z.string().trim().max(200).nullable().optional(),
});

export type CampCreateInput = z.infer<typeof campCreateSchema>;
export type CampRegistrationSubmitInput = z.infer<typeof campRegistrationSubmitSchema>;
