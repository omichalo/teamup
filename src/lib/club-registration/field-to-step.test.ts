import {
  REGISTRATION_FIELD_TO_STEP,
  firstStepWithError,
  stepsWithError,
} from "./field-to-step";

describe("REGISTRATION_FIELD_TO_STEP", () => {
  it("mappe les champs identité sur l'étape 0", () => {
    expect(REGISTRATION_FIELD_TO_STEP.firstName).toBe(0);
    expect(REGISTRATION_FIELD_TO_STEP.birthDate).toBe(0);
    expect(REGISTRATION_FIELD_TO_STEP.representatives).toBe(0);
  });

  it("mappe slotIds sur l'étape 1", () => {
    expect(REGISTRATION_FIELD_TO_STEP.slotIds).toBe(1);
    expect(REGISTRATION_FIELD_TO_STEP.mainSectionId).toBe(1);
  });

  it("mappe medical / aides sur l'étape 2", () => {
    expect(REGISTRATION_FIELD_TO_STEP.medicalCertificateDeclaration).toBe(2);
    expect(REGISTRATION_FIELD_TO_STEP.passSportCode).toBe(2);
  });

  it("mappe consentements / compétition sur l'étape 3", () => {
    expect(REGISTRATION_FIELD_TO_STEP.photoConsent).toBe(3);
    expect(REGISTRATION_FIELD_TO_STEP.competitionJerseySize).toBe(3);
  });
});

describe("firstStepWithError", () => {
  it("retourne null si aucun fieldErrors", () => {
    expect(firstStepWithError(null)).toBeNull();
    expect(firstStepWithError(undefined)).toBeNull();
    expect(firstStepWithError({})).toBeNull();
  });

  it("retourne null si toutes les valeurs sont vides", () => {
    expect(firstStepWithError({ firstName: [], slotIds: undefined })).toBeNull();
  });

  it("retourne l'étape la plus petite parmi les erreurs", () => {
    expect(
      firstStepWithError({
        photoConsent: ["err"],
        firstName: ["err"],
        slotIds: ["err"],
      })
    ).toBe(0);
  });

  it("retourne 1 si l'erreur la plus en amont est sur slotIds", () => {
    expect(
      firstStepWithError({
        photoConsent: ["err"],
        slotIds: ["err"],
      })
    ).toBe(1);
  });

  it("retombe sur l'étape 0 pour une clé inconnue", () => {
    expect(firstStepWithError({ unknownField: ["err"] })).toBe(0);
  });
});

describe("stepsWithError", () => {
  it("retourne un tableau vide si aucune erreur", () => {
    expect(stepsWithError(null)).toEqual([]);
    expect(stepsWithError({})).toEqual([]);
  });

  it("dédoublonne les étapes et les trie", () => {
    expect(
      stepsWithError({
        photoConsent: ["err"],
        firstName: ["err"],
        slotIds: ["err"],
        passSportCode: ["err"],
      })
    ).toEqual([0, 1, 2, 3]);
  });
});
