import type { RegistrationDraft } from "./registration-defaults";

/** Données factices pour accélérer les tests manuels en local (non utilisé en production). */
export function getDevIdentityFixture(): Partial<RegistrationDraft> {
  return {
    adherentRole: "self",
    firstName: "Camille",
    lastName: "DevTest",
    sex: "male",
    birthCity: "Paris",
    birthDate: "1995-06-15",
    adherentEmail: "",
    adherentPhonePrimary: "06 12 34 56 78",
    adherentPhoneSecondary: "",
    addressLine1: "12 rue du Test",
    addressLine2: "",
    postalCode: "78280",
    city: "Guyancourt",
  };
}
