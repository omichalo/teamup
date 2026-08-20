import { normalizeCriteriumFederalRegistrationStatus } from "@/lib/club-registration/criterium-federal-follow-up";
import { normalizeJerseyFollowUpStatus } from "@/lib/club-registration/jersey-follow-up";
import { normalizeRegistrationCertificateFollowUpStatus } from "@/lib/club-registration/registration-certificate-follow-up";
import { parseAmountCents } from "./membership-request-detail-shared";
import type { EditableRegistration } from "./types";

export function buildManagerRegistrationSavePayload(
  form: EditableRegistration
): Record<string, unknown> {
  const amountCents = parseAmountCents(form.amountEuros);

  return {
    adherentRole: form.adherentRole,
    wasSqyMemberLastYear: form.wasSqyMemberLastYear ?? false,
    ffttLicense: form.ffttLicense.trim() || null,
    ffttLicenseLookup: form.ffttLicenseLookup ?? null,
    firstName: form.firstName,
    lastName: form.lastName,
    sex: form.sex,
    birthCity: form.birthCity,
    birthDate: form.birthDate,
    adherentEmail: form.adherentEmail,
    adherentPhonePrimary: form.adherentPhonePrimary,
    adherentPhoneSecondary: form.adherentPhoneSecondary,
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2,
    postalCode: form.postalCode,
    city: form.city,
    representatives: form.representatives,
    mainSectionId: form.mainSectionId,
    additionalSectionIds: form.additionalSectionIds,
    slotIds: form.slotIds,
    schoolPickupSlotIds: form.schoolPickupSlotIds.filter((id) =>
      form.slotIds.includes(id)
    ),
    medicalCertificateDeclaration: form.medicalCertificateDeclaration,
    medicalCertificateStatus: form.medicalCertificateStatus,
    wantsRegistrationCertificate: form.wantsRegistrationCertificate,
    familyRegistrationOrder: form.familyRegistrationOrder,
    reductionTypes: form.reductionTypes,
    reductionReferenceCodes: form.reductionReferenceCodes,
    firstFemaleRegistrationSqy:
      form.sex === "female" ? form.firstFemaleRegistrationSqy ?? false : undefined,
    photoConsent: form.photoConsent,
    emergencyMedicalAuthorization: form.emergencyMedicalAuthorization,
    supervisionAcknowledgement: form.supervisionAcknowledgement,
    internalRulesAccepted: form.internalRulesAccepted,
    wantsCompetitorExtras: form.wantsCompetitorExtras,
    competitionJerseySize: form.competitionJerseySize || undefined,
    wantsOptionalJersey: form.wantsCompetitorExtras ? false : form.wantsOptionalJersey,
    optionalJerseySize:
      !form.wantsCompetitorExtras && form.wantsOptionalJersey
        ? form.optionalJerseySize || undefined
        : undefined,
    competitionIds: form.competitionIds,
    criteriumFederalRegistrationStatus: normalizeCriteriumFederalRegistrationStatus(
      form.criteriumFederalRegistrationStatus,
      form.competitionIds
    ),
    jerseyFollowUpStatus: normalizeJerseyFollowUpStatus(
      form.jerseyFollowUpStatus,
      form.wantsCompetitorExtras,
      form.wantsCompetitorExtras ? false : form.wantsOptionalJersey
    ),
    registrationCertificateFollowUpStatus: normalizeRegistrationCertificateFollowUpStatus(
      form.registrationCertificateFollowUpStatus,
      form.wantsRegistrationCertificate
    ),
    applicantNotes: form.applicantNotes.trim() || undefined,
    reviewNotes: form.reviewNotes,
    voluntaryDonationCents: form.voluntaryDonationCents,
    paymentAids: form.paymentAids,
    ...(amountCents !== null ? { paymentAmountCents: amountCents } : {}),
  };
}
