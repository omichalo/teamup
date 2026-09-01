import type { DocumentData } from "firebase-admin/firestore";
import { isRegistrationStatus } from "@/lib/club-registration/registration-status";
import type { AnalyticsRegistrationRecord } from "./types";

function readString(data: DocumentData, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readSex(data: DocumentData): AnalyticsRegistrationRecord["sex"] | undefined {
  const value = data.sex;
  if (value === "female" || value === "male" || value === "other") return value;
  return undefined;
}

function readFfttCategorie(data: DocumentData): string | undefined {
  const lookup = data.ffttLicenseLookup;
  if (!lookup || typeof lookup !== "object") return undefined;
  const categorie = (lookup as { categorie?: unknown }).categorie;
  return typeof categorie === "string" && categorie.trim().length > 0
    ? categorie.trim()
    : undefined;
}

function readAdditionalSectionIds(data: DocumentData): string[] {
  const value = data.additionalSectionIds;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readPaymentAidTypes(data: DocumentData): string[] {
  const aids = data.paymentAids;
  if (!Array.isArray(aids)) return [];
  const types = new Set<string>();
  for (const aid of aids) {
    if (!aid || typeof aid !== "object") continue;
    const type = (aid as { type?: unknown }).type;
    if (typeof type === "string" && type.trim().length > 0) {
      types.add(type.trim());
    }
  }
  return [...types];
}

function readBoolean(data: DocumentData, key: string): boolean | undefined {
  const value = data[key];
  return typeof value === "boolean" ? value : undefined;
}

export function mapDocToAnalyticsRecord(data: DocumentData): AnalyticsRegistrationRecord {
  const record: AnalyticsRegistrationRecord = {
    additionalSectionIds: readAdditionalSectionIds(data),
    paymentAidTypes: readPaymentAidTypes(data),
  };

  const sex = readSex(data);
  if (sex) record.sex = sex;

  const birthDate = readString(data, "birthDate");
  if (birthDate) record.birthDate = birthDate;

  const ffttCategorie = readFfttCategorie(data);
  if (ffttCategorie) record.ffttCategorie = ffttCategorie;

  const mainSectionId = readString(data, "mainSectionId");
  if (mainSectionId) record.mainSectionId = mainSectionId;

  const city = readString(data, "city");
  if (city) record.city = city;

  const postalCode = readString(data, "postalCode");
  if (postalCode) record.postalCode = postalCode;

  const status = readString(data, "status");
  if (status && isRegistrationStatus(status)) record.status = status;

  const wasSqyMemberLastYear = readBoolean(data, "wasSqyMemberLastYear");
  if (wasSqyMemberLastYear !== undefined) record.wasSqyMemberLastYear = wasSqyMemberLastYear;

  const handisportPracticeLevel = readString(data, "handisportPracticeLevel");
  if (handisportPracticeLevel) record.handisportPracticeLevel = handisportPracticeLevel;

  const wantsCompetitorExtras = readBoolean(data, "wantsCompetitorExtras");
  if (wantsCompetitorExtras !== undefined) record.wantsCompetitorExtras = wantsCompetitorExtras;

  const isMinor = readBoolean(data, "isMinor");
  if (isMinor !== undefined) record.isMinor = isMinor;

  return record;
}
