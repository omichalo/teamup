import type { FamilyRegistrationOrder, PricingContext } from "./types";

type RegistrationPricingRecord = {
  birthDate?: string;
  mainSectionId?: string;
  wantsCompetitorExtras?: boolean;
  wantsOptionalJersey?: boolean;
  competitionIds?: string[];
  familyRegistrationOrder?: string;
  sex?: string;
  firstFemaleRegistrationSqy?: boolean;
  handisportPracticeLevel?: string;
  reductionTypes?: string[];
};

function parseFamilyOrder(value: string | undefined): FamilyRegistrationOrder {
  if (value === "second" || value === "third_or_more") {
    return value;
  }
  return "none";
}

function parseSex(value: string | undefined): PricingContext["sex"] {
  if (value === "female" || value === "male" || value === "other") {
    return value;
  }
  return "other";
}

/** Construit un contexte tarifaire à partir d'un document Firestore ou d'un patch admin. */
export function buildPricingContextFromRecord(
  record: RegistrationPricingRecord
): PricingContext | null {
  if (!record.birthDate || typeof record.birthDate !== "string") {
    return null;
  }

  let wantsCompetitorExtras = Boolean(record.wantsCompetitorExtras);
  if (
    !wantsCompetitorExtras &&
    record.mainSectionId === "handisport" &&
    record.handisportPracticeLevel === "competition"
  ) {
    wantsCompetitorExtras = true;
  }

  const ctx: PricingContext = {
    birthDate: record.birthDate,
    mainSectionId:
      typeof record.mainSectionId === "string" ? record.mainSectionId : "voisins",
    wantsCompetitorExtras,
    wantsOptionalJersey: wantsCompetitorExtras
      ? false
      : Boolean(record.wantsOptionalJersey),
    competitionIds: Array.isArray(record.competitionIds)
      ? record.competitionIds.filter((id): id is string => typeof id === "string")
      : [],
    familyRegistrationOrder: parseFamilyOrder(record.familyRegistrationOrder),
    sex: parseSex(record.sex),
  };

  if (record.firstFemaleRegistrationSqy !== undefined) {
    ctx.firstFemaleRegistrationSqy = Boolean(record.firstFemaleRegistrationSqy);
  }

  if (Array.isArray(record.reductionTypes) && record.reductionTypes.length > 0) {
    ctx.reductionTypes = record.reductionTypes.filter(
      (id): id is string => typeof id === "string"
    );
  }

  return ctx;
}
