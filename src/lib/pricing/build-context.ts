import type { ClubRegistrationPayload } from "@/lib/club-registration/schema";
import type { PricingContext } from "./types";

type RegistrationPricingInput = Pick<
  ClubRegistrationPayload,
  | "birthDate"
  | "mainSectionId"
  | "slotIds"
  | "additionalSectionIds"
  | "wantsCompetitorExtras"
  | "wantsOptionalJersey"
  | "competitionIds"
  | "familyRegistrationOrder"
  | "sex"
  | "firstFemaleRegistrationSqy"
  | "reductionTypes"
> & {
  pricingDate?: string;
};

/** Construit un `PricingContext` à partir des champs d'un dossier d'inscription. */
export function buildPricingContext(
  input: RegistrationPricingInput
): PricingContext {
  const ctx: PricingContext = {
    birthDate: input.birthDate,
    mainSectionId: input.mainSectionId,
    wantsCompetitorExtras: input.wantsCompetitorExtras,
    wantsOptionalJersey: input.wantsCompetitorExtras
      ? false
      : input.wantsOptionalJersey,
    competitionIds: input.competitionIds,
    familyRegistrationOrder: input.familyRegistrationOrder,
    sex: input.sex,
  };

  if (input.slotIds.length > 0) {
    ctx.slotIds = [...input.slotIds];
  }
  if (input.additionalSectionIds.length > 0) {
    ctx.additionalSectionIds = [...input.additionalSectionIds];
  }

  if (input.pricingDate) {
    ctx.pricingDate = input.pricingDate;
  }
  if (input.firstFemaleRegistrationSqy !== undefined) {
    ctx.firstFemaleRegistrationSqy = input.firstFemaleRegistrationSqy;
  }
  if (input.reductionTypes && input.reductionTypes.length > 0) {
    ctx.reductionTypes = input.reductionTypes;
  }

  return ctx;
}
