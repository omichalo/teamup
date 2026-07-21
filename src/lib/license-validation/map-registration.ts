import type { DocumentSnapshot } from "firebase-admin/firestore";
import {
  normalizeMedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import {
  resolveRegistrationPaymentStatus,
} from "@/lib/club-registration/resolve-registration-payment-status";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";
import {
  normalizeLicenseValidationStatus,
  type LicenseValidationStatus,
} from "@/lib/license-validation/license-validation-status";
import type { PaymentStatusId } from "@/lib/club-registration/payment-constants";

export const LICENSE_VALIDATION_LIST_FIELDS = [
  "firstName",
  "lastName",
  "adherentEmail",
  "birthDate",
  "ffttLicense",
  "licenseValidationStatus",
  "wantsCompetitorExtras",
  "paymentStatus",
  "status",
] as const;

export type LicenseValidationListItem = {
  id: string;
  firstName: string;
  lastName: string;
  adherentEmail: string;
  birthDate: string | null;
  ffttLicense: string | null;
  licenseValidationStatus: LicenseValidationStatus;
  wantsCompetitorExtras: boolean;
  paymentStatus: PaymentStatusId | null;
  status: string | null;
  submittedAt: string | null;
};

export type LicenseValidationDetail = LicenseValidationListItem & {
  birthCity: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  ffttLicenseLookup: Record<string, unknown> | null;
  medicalCertificateDeclaration: string | null;
  medicalCertificateStatus: string | null;
  medicalQuestionnaire: Record<string, unknown> | null;
  wantsRegistrationCertificate: boolean;
  payment: RegistrationPayment | null;
};

function readString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBoolean(data: Record<string, unknown>, key: string): boolean {
  return data[key] === true;
}

export function mapRegistrationToLicenseValidationListItem(
  doc: DocumentSnapshot
): LicenseValidationListItem {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    firstName: readString(data, "firstName") ?? "",
    lastName: readString(data, "lastName") ?? "",
    adherentEmail: readString(data, "adherentEmail") ?? "",
    birthDate: readString(data, "birthDate"),
    ffttLicense: readString(data, "ffttLicense"),
    licenseValidationStatus: normalizeLicenseValidationStatus(
      data.licenseValidationStatus
    ),
    wantsCompetitorExtras: readBoolean(data, "wantsCompetitorExtras"),
    paymentStatus: resolveRegistrationPaymentStatus(
      data as Record<string, unknown>
    ),
    status: readString(data, "status"),
    submittedAt: data.submittedAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

export function mapRegistrationToLicenseValidationDetail(
  doc: DocumentSnapshot
): LicenseValidationDetail {
  const data = doc.data() ?? {};
  const listItem = mapRegistrationToLicenseValidationListItem(doc);
  const medicalCertificateDeclaration = readString(
    data,
    "medicalCertificateDeclaration"
  );

  return {
    ...listItem,
    birthCity: readString(data, "birthCity"),
    addressLine1: readString(data, "addressLine1"),
    addressLine2: readString(data, "addressLine2"),
    postalCode: readString(data, "postalCode"),
    city: readString(data, "city"),
    ffttLicenseLookup:
      typeof data.ffttLicenseLookup === "object" && data.ffttLicenseLookup !== null
        ? (data.ffttLicenseLookup as Record<string, unknown>)
        : null,
    medicalCertificateDeclaration,
    medicalCertificateStatus: normalizeMedicalCertificateStatus(
      data.medicalCertificateStatus,
      medicalCertificateDeclaration
    ),
    medicalQuestionnaire:
      typeof data.medicalQuestionnaire === "object" &&
      data.medicalQuestionnaire !== null
        ? (data.medicalQuestionnaire as Record<string, unknown>)
        : null,
    wantsRegistrationCertificate: readBoolean(data, "wantsRegistrationCertificate"),
    payment: normalizeRegistrationPayment(data),
  };
}

export function formatRegistrationAddress(detail: LicenseValidationDetail): string {
  const parts = [
    detail.addressLine1,
    detail.addressLine2,
    [detail.postalCode, detail.city].filter(Boolean).join(" "),
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));
  return parts.join(", ");
}
