import type { DocumentSnapshot } from "firebase-admin/firestore";
import { normalizeReductionReferenceCodes } from "@/lib/club-registration/reduction-reference-codes";
import { normalizeMedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import { readPpsFollowUpState } from "@/lib/club-registration/pps-follow-up";
import { normalizeCriteriumFederalRegistrationStatus } from "@/lib/club-registration/criterium-federal-follow-up";
import { normalizeJerseyFollowUpStatus } from "@/lib/club-registration/jersey-follow-up";
import { normalizeRegistrationCertificateFollowUpStatus } from "@/lib/club-registration/registration-certificate-follow-up";
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
  const declaration =
    typeof data.medicalCertificateDeclaration === "string"
      ? data.medicalCertificateDeclaration
      : null;
  const pps = readPpsFollowUpState(data as Record<string, unknown>, declaration);
  registration.ppsFollowUpStatus = pps.status;
  registration.ppsFollowUpUpdatedAt = pps.updatedAt;
  registration.ppsFollowUpUpdatedBy = pps.updatedBy;
  registration.ppsFollowUpEvents = pps.events;
  registration.criteriumFederalRegistrationStatus =
    normalizeCriteriumFederalRegistrationStatus(
      data.criteriumFederalRegistrationStatus,
      Array.isArray(data.competitionIds) ? data.competitionIds : []
    );
  registration.jerseyFollowUpStatus = normalizeJerseyFollowUpStatus(
    data.jerseyFollowUpStatus,
    data.wantsCompetitorExtras,
    data.wantsOptionalJersey
  );
  registration.registrationCertificateFollowUpStatus =
    normalizeRegistrationCertificateFollowUpStatus(
      data.registrationCertificateFollowUpStatus,
      data.wantsRegistrationCertificate
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
