import { z } from "zod";
import { CAMP_PRICING_MODES } from "./constants";

const sessionTemplateSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    startMinutes: z.number().int().min(0).max(24 * 60 - 1),
    endMinutes: z.number().int().min(1).max(24 * 60),
  })
  .refine((s) => s.endMinutes > s.startMinutes, {
    message: "La fin doit être après le début",
  });

export const campPricingRatesSchema = z.object({
  memberDayCents: z.number().int().min(0).max(1_000_000),
  memberWeekCents: z.number().int().min(0).max(1_000_000),
  nonMemberDayCents: z.number().int().min(0).max(1_000_000),
  nonMemberWeekCents: z.number().int().min(0).max(1_000_000),
  session2hCents: z.number().int().min(0).max(1_000_000),
  twoSessionsSameDayCents: z.number().int().min(0).max(1_000_000),
});

export const catalogSiteCreateSchema = z.object({
  label: z.string().trim().min(1).max(120),
  active: z.boolean().default(true),
});

export const catalogSitePatchSchema = catalogSiteCreateSchema.partial();

export const catalogFormulaCreateSchema = z.object({
  label: z.string().trim().min(1).max(120),
  pricingMode: z.enum(CAMP_PRICING_MODES),
  sessions: z.array(sessionTemplateSchema).min(1).max(12),
  /** Vide = formule proposée sous tous les sites. */
  catalogSiteIds: z.array(z.string().trim().min(1).max(64)).max(40).default([]),
  active: z.boolean().default(true),
});

export const catalogFormulaPatchSchema = catalogFormulaCreateSchema.partial();

export const catalogPricingCreateSchema = z.object({
  label: z.string().trim().min(1).max(120),
  rates: campPricingRatesSchema,
  active: z.boolean().default(true),
});

export const catalogPricingPatchSchema = catalogPricingCreateSchema.partial();

export const campAssignFromCatalogSchema = z.object({
  assignments: z
    .array(
      z.object({
        catalogSiteId: z.string().trim().min(1).max(64),
        catalogFormulaIds: z.array(z.string().trim().min(1).max(64)).min(1),
      })
    )
    .min(1)
    .max(40),
});

export type CatalogSiteCreateInput = z.infer<typeof catalogSiteCreateSchema>;
export type CatalogFormulaCreateInput = z.infer<typeof catalogFormulaCreateSchema>;
export type CatalogPricingCreateInput = z.infer<typeof catalogPricingCreateSchema>;
export type CampAssignFromCatalogInput = z.infer<typeof campAssignFromCatalogSchema>;
