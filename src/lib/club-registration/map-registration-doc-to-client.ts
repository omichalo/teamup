import type { DocumentSnapshot } from "firebase-admin/firestore";
import { normalizeReductionReferenceCodes } from "@/lib/club-registration/reduction-reference-codes";
import { normalizeMedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import { REGISTRATION_CLIENT_FIELDS } from "@/lib/club-registration/registration-api-fields";

export type RegistrationClientRecord = Record<string, unknown> & { id: string };

/** Sérialise un document Firestore `clubRegistrations` pour le client. */
export function mapRegistrationDocToClient(
  snap: DocumentSnapshot
): RegistrationClientRecord {
  const data = snap.data();
  if (!data) {
    throw new Error("Document vide");
  }

  const registration: RegistrationClientRecord = { id: snap.id };
  for (const key of REGISTRATION_CLIENT_FIELDS) {
    if (data[key] !== undefined) {
      registration[key] = data[key];
    }
  }
  registration.reductionReferenceCodes = normalizeReductionReferenceCodes(
    registration.reductionReferenceCodes as Record<string, string> | undefined,
    typeof data.passSportCode === "string" ? data.passSportCode : undefined
  );
  delete registration.passSportCode;
  registration.medicalCertificateStatus = normalizeMedicalCertificateStatus(
    data.medicalCertificateStatus,
    data.medicalCertificateDeclaration
  );
  registration.submittedAt = data.submittedAt?.toDate?.()?.toISOString?.() ?? null;
  registration.updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() ?? null;
  registration.medicalCertificateStatusUpdatedAt =
    data.medicalCertificateStatusUpdatedAt?.toDate?.()?.toISOString?.() ?? null;
  registration.paymentRequestedAt =
    data.paymentRequestedAt?.toDate?.()?.toISOString?.() ?? null;
  registration.paidAt = data.paidAt?.toDate?.()?.toISOString?.() ?? null;
  registration.pricingQuoteComputedAt =
    data.pricingQuoteComputedAt?.toDate?.()?.toISOString?.() ?? null;

  return registration;
}
