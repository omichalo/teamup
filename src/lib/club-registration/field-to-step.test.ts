import {
  REGISTRATION_FIELD_TO_STEP_ID,
  firstStepWithError,
  stepsWithError,
  type RegistrationStepId,
} from "./field-to-step";

/* Deux séquences typiques : majeur (sans représentants), mineur (avec
   représentants). Les fonctions doivent rester correctes dans les deux cas. */
const SEQUENCE_ADULT: RegistrationStepId[] = [
  "audience",
  "adherent",
  "practice",
  "admin",
  "engagements",
  "payment",
  "recap",
];

const SEQUENCE_MINOR: RegistrationStepId[] = [
  "audience",
  "adherent",
  "representatives",
  "practice",
  "admin",
  "engagements",
  "payment",
  "recap",
];

describe("REGISTRATION_FIELD_TO_STEP_ID", () => {
  it("mappe le rôle et la date de naissance sur l'étape audience", () => {
    expect(REGISTRATION_FIELD_TO_STEP_ID.adherentRole).toBe("audience");
    expect(REGISTRATION_FIELD_TO_STEP_ID.wasSqyMemberLastYear).toBe("audience");
    expect(REGISTRATION_FIELD_TO_STEP_ID.birthDate).toBe("audience");
  });

  it("mappe l'identité, le contact et l'adresse sur l'étape adhérent", () => {
    expect(REGISTRATION_FIELD_TO_STEP_ID.firstName).toBe("adherent");
    expect(REGISTRATION_FIELD_TO_STEP_ID.postalCode).toBe("adherent");
    expect(REGISTRATION_FIELD_TO_STEP_ID.adherentPhonePrimary).toBe("adherent");
  });

  it("mappe les représentants sur l'étape representatives", () => {
    expect(REGISTRATION_FIELD_TO_STEP_ID.representatives).toBe("representatives");
  });

  it("mappe le compétiteur et les créneaux sur l'étape pratique", () => {
    expect(REGISTRATION_FIELD_TO_STEP_ID.slotIds).toBe("practice");
    expect(REGISTRATION_FIELD_TO_STEP_ID.mainSectionId).toBe("practice");
    expect(REGISTRATION_FIELD_TO_STEP_ID.wantsCompetitorExtras).toBe("practice");
    expect(REGISTRATION_FIELD_TO_STEP_ID.competitionJerseySize).toBe("practice");
  });

  it("mappe la déclaration médicale et le Pass Sport sur l'étape admin", () => {
    expect(REGISTRATION_FIELD_TO_STEP_ID.medicalCertificateDeclaration).toBe("admin");
    expect(REGISTRATION_FIELD_TO_STEP_ID.reductionReferenceCodes).toBe("admin");
    expect(REGISTRATION_FIELD_TO_STEP_ID.familyRegistrationOrder).toBe("admin");
  });

  it("mappe les consentements et le règlement intérieur sur l'étape engagements", () => {
    expect(REGISTRATION_FIELD_TO_STEP_ID.photoConsent).toBe("engagements");
    expect(REGISTRATION_FIELD_TO_STEP_ID.internalRulesAccepted).toBe("engagements");
  });
});

describe("firstStepWithError", () => {
  it("retourne null si aucun fieldErrors", () => {
    expect(firstStepWithError(null, SEQUENCE_ADULT)).toBeNull();
    expect(firstStepWithError(undefined, SEQUENCE_ADULT)).toBeNull();
    expect(firstStepWithError({}, SEQUENCE_ADULT)).toBeNull();
  });

  it("retourne null si toutes les valeurs sont vides", () => {
    expect(
      firstStepWithError({ firstName: [], slotIds: undefined }, SEQUENCE_ADULT)
    ).toBeNull();
  });

  it("retourne l'étape la plus en amont (audience) si une erreur y porte", () => {
    expect(
      firstStepWithError(
        {
          photoConsent: ["err"],
          birthDate: ["err"],
          slotIds: ["err"],
        },
        SEQUENCE_ADULT
      )
    ).toBe(0);
  });

  it("indices différents selon la séquence active (mineur vs majeur)", () => {
    const errs = { slotIds: ["err"] };
    /* Sur la séquence majeur : audience(0) → adherent(1) → practice(2) */
    expect(firstStepWithError(errs, SEQUENCE_ADULT)).toBe(2);
    /* Sur la séquence mineur : audience(0) → adherent(1) → representatives(2) → practice(3) */
    expect(firstStepWithError(errs, SEQUENCE_MINOR)).toBe(3);
  });

  it("retombe sur la 1ʳᵉ étape de la séquence pour une clé inconnue", () => {
    expect(firstStepWithError({ unknownField: ["err"] }, SEQUENCE_ADULT)).toBe(0);
  });
});

describe("stepsWithError", () => {
  it("retourne un tableau vide si aucune erreur", () => {
    expect(stepsWithError(null, SEQUENCE_ADULT)).toEqual([]);
    expect(stepsWithError({}, SEQUENCE_ADULT)).toEqual([]);
  });

  it("dédoublonne les étapes et les trie (séquence majeur)", () => {
    expect(
      stepsWithError(
        {
          photoConsent: ["err"],
          firstName: ["err"],
          slotIds: ["err"],
          reductionReferenceCodes: ["err"],
          "reductionReferenceCodes.pass_sport": ["err"],
        },
        SEQUENCE_ADULT
      )
    ).toEqual([1, 2, 3, 4]);
  });

  it("inclut l'étape representatives en séquence mineur", () => {
    expect(
      stepsWithError(
        {
          representatives: ["err"],
          slotIds: ["err"],
        },
        SEQUENCE_MINOR
      )
    ).toEqual([2, 3]);
  });
});
