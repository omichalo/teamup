import type { DocumentData } from "firebase-admin/firestore";
import { normalizeCriteriumFederalRegistrationStatus } from "@/lib/club-registration/criterium-federal-follow-up";
import { normalizeJerseyFollowUpStatus } from "@/lib/club-registration/jersey-follow-up";
import {
  resolveMedicalFollowUpKind,
  type MedicalFollowUpKind,
} from "@/lib/club-registration/medical-certificate";
import { getRegistrationPaymentAids, isAidReceiptPending } from "@/lib/club-registration/payment/aid-receipt";
import {
  PAYMENT_METHOD_IDS,
  type PaymentMethodId,
} from "@/lib/club-registration/payment-constants";
import { normalizePpsFollowUpStatus } from "@/lib/club-registration/pps-follow-up";
import { normalizeRegistrationCertificateFollowUpStatus } from "@/lib/club-registration/registration-certificate-follow-up";
import { resolveRegistrationPaymentStatus } from "@/lib/club-registration/resolve-registration-payment-status";
import type { AnalyticsPaymentAid, AnalyticsRegistrationRecord } from "./types";

function readString(data: DocumentData, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readBoolean(data: DocumentData, key: string): boolean | undefined {
  const value = data[key];
  return typeof value === "boolean" ? value : undefined;
}

function readStringIds(data: DocumentData, key: string): string[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readCents(data: DocumentData, key: string): number | undefined {
  const value = data[key];
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  return undefined;
}

function readQuoteTotalCents(data: DocumentData): number | undefined {
  const quote = data.pricingQuote;
  if (quote && typeof quote === "object") {
    const total = (quote as { totalCents?: unknown }).totalCents;
    if (typeof total === "number" && Number.isFinite(total) && total >= 0) {
      return Math.round(total);
    }
  }
  const payment = data.payment;
  if (payment && typeof payment === "object") {
    const total = (payment as { totalAmountCents?: unknown }).totalAmountCents;
    if (typeof total === "number" && Number.isFinite(total) && total >= 0) {
      return Math.round(total);
    }
  }
  return undefined;
}

function readPaymentMethod(data: DocumentData): PaymentMethodId | undefined {
  const value = data.paymentMethod;
  if (typeof value === "string" && (PAYMENT_METHOD_IDS as readonly string[]).includes(value)) {
    return value as PaymentMethodId;
  }
  return undefined;
}

function readPaymentAids(data: DocumentData): AnalyticsPaymentAid[] {
  return getRegistrationPaymentAids(data as Record<string, unknown>).map((aid) => ({
    type: aid.type,
    amountCents: aid.amountCents,
    received: aid.received === true,
    pendingReceipt: isAidReceiptPending(aid),
  }));
}

function readMedicalFollowUpKind(data: DocumentData): MedicalFollowUpKind | undefined {
  const kind = resolveMedicalFollowUpKind(
    readString(data, "medicalCertificateDeclaration") ?? null,
    readString(data, "medicalCertificateStatus") ?? null,
    readString(data, "ppsFollowUpStatus") ?? null,
    readString(data, "birthDate") ?? null
  );
  return kind ?? undefined;
}

/** Champs organisation / finances (anonymisés) à fusionner dans le record analytics. */
export function mapDocToAnalyticsOpsFields(
  data: DocumentData
): Pick<
  AnalyticsRegistrationRecord,
  | "slotIds"
  | "schoolPickupSlotIds"
  | "competitionIds"
  | "jerseyFollowUpStatus"
  | "criteriumFederalRegistrationStatus"
  | "registrationCertificateFollowUpStatus"
  | "medicalFollowUpKind"
  | "ppsFollowUpStatus"
  | "paymentStatus"
  | "paymentMethod"
  | "quoteTotalCents"
  | "voluntaryDonationCents"
  | "holidayVoucherAmountCents"
  | "paymentAids"
> {
  const slotIds = readStringIds(data, "slotIds");
  const schoolPickupSlotIds = readStringIds(data, "schoolPickupSlotIds");
  const competitionIds = readStringIds(data, "competitionIds");
  const paymentAids = readPaymentAids(data);

  const wantsCompetitorExtras = readBoolean(data, "wantsCompetitorExtras");
  const wantsOptionalJersey = readBoolean(data, "wantsOptionalJersey");
  const wantsCertificate = readBoolean(data, "wantsRegistrationCertificate");
  const birthDate = readString(data, "birthDate");
  const medicalDeclaration = readString(data, "medicalCertificateDeclaration");

  const fields: ReturnType<typeof mapDocToAnalyticsOpsFields> = {
    slotIds,
    schoolPickupSlotIds,
    competitionIds,
    paymentAids,
    jerseyFollowUpStatus: normalizeJerseyFollowUpStatus(
      data.jerseyFollowUpStatus,
      wantsCompetitorExtras,
      wantsOptionalJersey
    ),
    criteriumFederalRegistrationStatus: normalizeCriteriumFederalRegistrationStatus(
      data.criteriumFederalRegistrationStatus,
      competitionIds
    ),
    registrationCertificateFollowUpStatus: normalizeRegistrationCertificateFollowUpStatus(
      data.registrationCertificateFollowUpStatus,
      wantsCertificate
    ),
    ppsFollowUpStatus: normalizePpsFollowUpStatus(
      data.ppsFollowUpStatus,
      medicalDeclaration,
      birthDate
    ),
  };

  const medicalFollowUpKind = readMedicalFollowUpKind(data);
  if (medicalFollowUpKind) fields.medicalFollowUpKind = medicalFollowUpKind;

  const paymentStatus = resolveRegistrationPaymentStatus(data as Record<string, unknown>);
  if (paymentStatus) fields.paymentStatus = paymentStatus;

  const paymentMethod = readPaymentMethod(data);
  if (paymentMethod) fields.paymentMethod = paymentMethod;

  const quoteTotalCents = readQuoteTotalCents(data);
  if (quoteTotalCents !== undefined) fields.quoteTotalCents = quoteTotalCents;

  const voluntaryDonationCents = readCents(data, "voluntaryDonationCents");
  if (voluntaryDonationCents !== undefined) {
    fields.voluntaryDonationCents = voluntaryDonationCents;
  }

  const holidayVoucherAmountCents = readCents(data, "holidayVoucherAmountCents");
  if (holidayVoucherAmountCents !== undefined) {
    fields.holidayVoucherAmountCents = holidayVoucherAmountCents;
  }

  return fields;
}
