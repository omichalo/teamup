import type { ClubRegistrationPayload, Representative } from "@/lib/club-registration/schema";

/**
 * Forme du draft local. Conserve une bascule UI pour `internalRulesAccepted`
 * (case à cocher contrôlée par l'utilisateur, alors que côté schéma on attend `true`).
 */
export type RegistrationDraft = Omit<ClubRegistrationPayload, "internalRulesAccepted"> & {
  rulesAccepted: boolean;
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
    sex: "male",
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
    photoConsent: "accept",
    emergencyMedicalAuthorization: "not_applicable_adult",
    supervisionAcknowledgement: "not_applicable_adult",
    rulesAccepted: false,
    wantsCompetitorExtras: false,
    competitionJerseySize: undefined,
    competitionIds: [],
  };
}
