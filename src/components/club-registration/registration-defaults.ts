import type { ClubRegistrationPayload, Representative } from "@/lib/club-registration/schema";
import type { PaymentAid } from "@/lib/club-registration/payment/types";
import type {
  PaymentMethodId,
  RemainingPaymentMethodId,
} from "@/lib/club-registration/payment-constants";
import {
  createEmptyMedicalQuestionnaire,
  createEmptyMedicalVeteranPath,
  type MedicalQuestionnaire,
  type MedicalVeteranPath,
} from "@/lib/club-registration/medical-dossier";

/**
 * Forme du draft local.
 *
 * Diffère du payload final sur trois points :
 * - `internalRulesAccepted` côté schéma exige `true` ; on expose un `rulesAccepted: boolean`
 *   pour rester contrôlable dans l'UI.
 * - `sex`, `photoConsent` et `wasSqyMemberLastYear` autorisent l'absence de réponse
 *   tant que l'utilisateur n'a pas activement choisi. RGPD oblige : le consentement à la diffusion d'images doit être
 *   un acte positif (pas de pré-cochage), et le sexe ne doit pas être imposé par défaut.
 *   `buildPayload()` côté wizard refuse la chaîne vide avant tout POST.
 */
export type RegistrationDraft = Omit<
  ClubRegistrationPayload,
  | "internalRulesAccepted"
  | "sex"
  | "photoConsent"
  | "wasSqyMemberLastYear"
  | "medicalCertificateDeclaration"
  | "medicalQuestionnaire"
  | "medicalVeteranPath"
  | "applicantNotes"
  | "paymentMethod"
  | "remainingPaymentMethod"
  | "paymentAids"
> & {
  rulesAccepted: boolean;
  /** Précisions libres pour le club (facultatif à l'envoi). */
  applicantNotes: string;
  sex: ClubRegistrationPayload["sex"] | "";
  photoConsent: ClubRegistrationPayload["photoConsent"] | "";
  wasSqyMemberLastYear: boolean | undefined;
  medicalQuestionnaire: MedicalQuestionnaire;
  medicalVeteranPath: MedicalVeteranPath;
  medicalCertificateDeclaration:
    | ClubRegistrationPayload["medicalCertificateDeclaration"]
    | "";
  paymentMethod: PaymentMethodId | "";
  remainingPaymentMethod: RemainingPaymentMethodId | "";
  paymentAids: PaymentAid[];
};

export type { Representative };

/** Représentant légal vide (pour ajout dynamique dans l'UI). */
export function createEmptyRepresentative(): Representative {
  return {
    role: "mother",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  };
}

/** Garantit des chaînes vides pour les champs optionnels manquants (brouillon local, API). */
export function normalizeRepresentative(
  rep: Partial<Representative> | undefined
): Representative {
  const base = createEmptyRepresentative();
  if (!rep) return base;
  return {
    role: rep.role ?? base.role,
    firstName: rep.firstName ?? "",
    lastName: rep.lastName ?? "",
    email: rep.email ?? "",
    phone: rep.phone ?? "",
  };
}

export function normalizeRepresentatives(
  reps: Partial<Representative>[] | undefined
): Representative[] {
  return (reps ?? []).map(normalizeRepresentative);
}

export function createEmptyDraft(): RegistrationDraft {
  return {
    adherentRole: "self",
    wasSqyMemberLastYear: undefined,
    ffttLicense: "",
    ffttLicenseLookup: undefined,
    firstName: "",
    lastName: "",
    sex: "",
    birthCity: "",
    birthDate: "",
    adherentEmail: "",
    adherentPhonePrimary: "",
    adherentPhoneSecondary: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    representatives: [],
    mainSectionId: "voisins",
    additionalSectionIds: [],
    slotIds: [],
    schoolPickupSlotIds: [],
    medicalQuestionnaire: createEmptyMedicalQuestionnaire(),
    medicalVeteranPath: createEmptyMedicalVeteranPath(),
    medicalCertificateDeclaration: "",
    wantsRegistrationCertificate: false,
    familyRegistrationOrder: "none",
    reductionTypes: [],
    reductionReferenceCodes: {},
    firstFemaleRegistrationSqy: undefined,
    photoConsent: "",
    emergencyMedicalAuthorization: "not_applicable_adult",
    supervisionAcknowledgement: "not_applicable_adult",
    rulesAccepted: false,
    wantsCompetitorExtras: false,
    competitionJerseySize: undefined,
    wantsOptionalJersey: false,
    optionalJerseySize: undefined,
    competitionIds: [],
    applicantNotes: "",
    paymentMethod: "" as PaymentMethodId | "",
    paymentInstallments: 1,
    paymentAids: [] as PaymentAid[],
    holidayVoucherAmountCents: null as number | null,
    remainingPaymentMethod: "" as RemainingPaymentMethodId | "",
    paymentNote: "",
    specialPaymentNote: "",
  };
}
