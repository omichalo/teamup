import type { ClubRegistrationPayload, Representative } from "@/lib/club-registration/schema";

/**
 * Forme du draft local.
 *
 * Diffère du payload final sur trois points :
 * - `internalRulesAccepted` côté schéma exige `true` ; on expose un `rulesAccepted: boolean`
 *   pour rester contrôlable dans l'UI.
 * - `sex` et `photoConsent` autorisent la chaîne vide tant que l'utilisateur n'a pas
 *   activement choisi. RGPD oblige : le consentement à la diffusion d'images doit être
 *   un acte positif (pas de pré-cochage), et le sexe ne doit pas être imposé par défaut.
 *   `buildPayload()` côté wizard refuse la chaîne vide avant tout POST.
 */
export type RegistrationDraft = Omit<
  ClubRegistrationPayload,
  "internalRulesAccepted" | "sex" | "photoConsent"
> & {
  rulesAccepted: boolean;
  sex: ClubRegistrationPayload["sex"] | "";
  photoConsent: ClubRegistrationPayload["photoConsent"] | "";
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

export function createEmptyDraft(): RegistrationDraft {
  return {
    adherentRole: "self",
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
    medicalCertificateDeclaration: "under_40_all_no",
    wantsRegistrationCertificate: false,
    familyRegistrationOrder: "none",
    reductionTypes: [],
    passSportCode: "",
    firstFemaleRegistrationSqy: undefined,
    photoConsent: "",
    emergencyMedicalAuthorization: "not_applicable_adult",
    supervisionAcknowledgement: "not_applicable_adult",
    rulesAccepted: false,
    wantsCompetitorExtras: false,
    competitionJerseySize: undefined,
    competitionIds: [],
  };
}
