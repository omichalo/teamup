import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { getEnabledSections } from "@/lib/club-registration-config/helpers";
import {
  normalizeMedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import { normalizeReductionReferenceCodes } from "@/lib/club-registration/reduction-reference-codes";
import { expandCompetitionIdsForForm } from "@/lib/club-registration/competition-ids";
import { normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import type { PaymentAid, RegistrationPayment } from "@/lib/club-registration/payment/types";
import type { EditableRegistration, RegistrationDetail } from "./types";

/** Reprend les aides déclarées à la soumission (objet `payment` après persist). */
export function resolveRegistrationPaymentAids(
  registration: RegistrationDetail,
  payment: RegistrationPayment | null
): PaymentAid[] {
  const fromTop = registration.paymentAids;
  if (fromTop && fromTop.length > 0) {
    return normalizePaymentAidList(fromTop);
  }
  if (payment?.aids && payment.aids.length > 0) {
    return normalizePaymentAidList(payment.aids);
  }
  return [];
}

export function toEditableRegistration(
  registration: RegistrationDetail,
  config: RegistrationConfigV1,
  payment: RegistrationPayment | null
): EditableRegistration {
  return {
    adherentRole: registration.adherentRole ?? "self",
    ffttLicense: registration.ffttLicense ?? registration.ffttLicenseLookup?.licence ?? "",
    firstName: registration.firstName ?? "",
    lastName: registration.lastName ?? "",
    sex: registration.sex ?? "other",
    birthCity: registration.birthCity ?? "",
    birthDate: registration.birthDate ?? "",
    adherentEmail: registration.adherentEmail ?? "",
    adherentPhonePrimary: registration.adherentPhonePrimary ?? "",
    adherentPhoneSecondary: registration.adherentPhoneSecondary ?? "",
    addressLine1: registration.addressLine1 ?? "",
    addressLine2: registration.addressLine2 ?? "",
    postalCode: registration.postalCode ?? "",
    city: registration.city ?? "",
    representatives: registration.representatives ?? [],
    mainSectionId:
      registration.mainSectionId ??
      getEnabledSections(config)[0]?.id ??
      "voisins",
    additionalSectionIds: registration.additionalSectionIds ?? [],
    slotIds: registration.slotIds ?? [],
    schoolPickupSlotIds: registration.schoolPickupSlotIds ?? [],
    medicalCertificateDeclaration:
      registration.medicalCertificateDeclaration ?? "under_40_all_no",
    medicalCertificateStatus: normalizeMedicalCertificateStatus(
      registration.medicalCertificateStatus,
      registration.medicalCertificateDeclaration
    ),
    wantsRegistrationCertificate: registration.wantsRegistrationCertificate ?? false,
    familyRegistrationOrder: registration.familyRegistrationOrder ?? "none",
    reductionTypes: registration.reductionTypes ?? [],
    reductionReferenceCodes: normalizeReductionReferenceCodes(
      registration.reductionReferenceCodes,
      registration.passSportCode
    ),
    firstFemaleRegistrationSqy: registration.firstFemaleRegistrationSqy,
    photoConsent: registration.photoConsent ?? "refuse",
    emergencyMedicalAuthorization:
      registration.emergencyMedicalAuthorization ?? "not_applicable_adult",
    supervisionAcknowledgement:
      registration.supervisionAcknowledgement ?? "not_applicable_adult",
    internalRulesAccepted: registration.internalRulesAccepted ?? false,
    wantsCompetitorExtras:
      registration.wantsCompetitorExtras ??
      registration.handisportPracticeLevel === "competition",
    competitionJerseySize: registration.competitionJerseySize ?? "",
    wantsOptionalJersey: registration.wantsOptionalJersey ?? false,
    optionalJerseySize: registration.optionalJerseySize ?? "",
    competitionIds: expandCompetitionIdsForForm(registration.competitionIds ?? []),
    applicantNotes: registration.applicantNotes ?? "",
    reviewNotes: registration.reviewNotes ?? "",
    amountEuros:
      typeof registration.paymentAmountCents === "number"
        ? String(registration.paymentAmountCents / 100)
        : "",
    paymentAids: resolveRegistrationPaymentAids(registration, payment),
  };
}
