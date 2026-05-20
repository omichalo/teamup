import { clubRegistrationPayloadSchema } from "./schema";
import { inferMedicalDossierFromDeclaration } from "./medical-dossier";

/**
 * Helper qui construit un payload valide minimal pour un adulte qui s'inscrit lui-même,
 * et permet d'écraser des champs spécifiques pour cibler chaque cas de test.
 */
function buildPayload(
  overrides: Partial<Parameters<typeof clubRegistrationPayloadSchema.safeParse>[0]> = {}
) {
  const birthDate = overrides.birthDate ?? "2000-04-12";
  const medicalCertificateDeclaration =
    overrides.medicalCertificateDeclaration ?? "under_40_all_no";
  const inferred = inferMedicalDossierFromDeclaration(
    medicalCertificateDeclaration,
    birthDate
  );
  const inferredSummary = inferred.questionnaire.summary;
  const summary =
    overrides.medicalQuestionnaire?.summary ??
    (inferredSummary !== "" ? inferredSummary : undefined);
  const base = {
    adherentRole: "self" as const,
    firstName: "Olivier",
    lastName: "Dupont",
    sex: "male" as const,
    birthCity: "Paris",
    /* Date choisie pour rester un majeur < 40 ans quelle que soit l'année du run
       du test (compatible avec la déclaration `under_40_all_no` par défaut). */
    birthDate,
    adherentEmail: "olivier@example.com",
    adherentPhonePrimary: "0612345678",
    adherentPhoneSecondary: "",
    addressLine1: "12 rue Victor Hugo",
    addressLine2: "",
    postalCode: "78280",
    city: "Guyancourt",
    representatives: [],
    mainSectionId: "voisins",
    additionalSectionIds: [],
    slotIds: ["voisins-mar-2030-adultes-loisirs"],
    medicalQuestionnaire: {
      ...(summary !== undefined ? { summary } : {}),
      answers: overrides.medicalQuestionnaire?.answers ?? {},
    },
    medicalCertificateDeclaration,
    wantsRegistrationCertificate: false,
    familyRegistrationOrder: "none",
    reductionTypes: [],
    passSportCode: "",
    photoConsent: "accept",
    emergencyMedicalAuthorization: "not_applicable_adult",
    supervisionAcknowledgement: "not_applicable_adult",
    internalRulesAccepted: true,
    wantsCompetitorExtras: false,
    competitionIds: [],
  };
  const merged = { ...base, ...overrides };
  if (
    overrides.medicalVeteranPath === undefined &&
    inferred.veteranPath.hadFfttLicense !== ""
  ) {
    const { hadFfttLicense, categoryChanged } = inferred.veteranPath;
    merged.medicalVeteranPath = {
      hadFfttLicense,
      ...(categoryChanged !== ""
        ? { categoryChanged: categoryChanged as "yes" | "no" }
        : {}),
    };
  }
  return merged;
}

describe("clubRegistrationPayloadSchema", () => {
  it("accepte un payload minimal valide pour un adulte qui s'inscrit lui-même", () => {
    const r = clubRegistrationPayloadSchema.safeParse(buildPayload());
    expect(r.success).toBe(true);
  });

  it("refuse un mineur qui s'inscrit en mode self", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({ birthDate: "2015-04-12", adherentRole: "self" })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("adherentRole"))).toBe(true);
    }
  });

  it("refuse un mineur en mode minor_dependent sans représentant", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "2015-04-12",
        adherentRole: "minor_dependent",
        representatives: [],
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "representatives")).toBe(true);
    }
  });

  it("accepte un mineur avec un représentant légal", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "2015-04-12",
        adherentRole: "minor_dependent",
        emergencyMedicalAuthorization: "yes",
        supervisionAcknowledgement: "yes",
        representatives: [
          {
            role: "mother",
            firstName: "Marie",
            lastName: "Dupont",
            email: "marie@example.com",
            phone: "0612345670",
          },
        ],
      })
    );
    expect(r.success).toBe(true);
  });

  it("refuse 2 représentants avec le même email", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "2015-04-12",
        adherentRole: "minor_dependent",
        emergencyMedicalAuthorization: "yes",
        supervisionAcknowledgement: "yes",
        representatives: [
          {
            role: "mother",
            firstName: "Marie",
            lastName: "Dupont",
            email: "duplicate@example.com",
            phone: "0612345670",
          },
          {
            role: "father",
            firstName: "Pierre",
            lastName: "Dupont",
            email: "duplicate@example.com",
            phone: "0612345671",
          },
        ],
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "representatives")).toBe(true);
    }
  });

  it("refuse 3 représentants (max 2)", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "2015-04-12",
        adherentRole: "minor_dependent",
        emergencyMedicalAuthorization: "yes",
        supervisionAcknowledgement: "yes",
        representatives: [
          { role: "mother", firstName: "A", lastName: "A", email: "a@a.fr", phone: "0612345670" },
          { role: "father", firstName: "B", lastName: "B", email: "b@b.fr", phone: "0612345671" },
          { role: "guardian", firstName: "C", lastName: "C", email: "c@c.fr", phone: "0612345672" },
        ],
      })
    );
    expect(r.success).toBe(false);
  });

  it("refuse un adulte (self) avec un représentant légal", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        adherentRole: "self",
        representatives: [
          {
            role: "mother",
            firstName: "Marie",
            lastName: "Dupont",
            email: "marie@example.com",
            phone: "0612345670",
          },
        ],
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "representatives")).toBe(true);
    }
  });

  it("refuse un autre adulte (other_adult) avec un représentant légal", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        adherentRole: "other_adult",
        representatives: [
          {
            role: "guardian",
            firstName: "Tuteur",
            lastName: "Légal",
            email: "tuteur@example.com",
            phone: "0612345670",
          },
        ],
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "representatives")).toBe(true);
    }
  });

  it("refuse une femme sans firstFemaleRegistrationSqy", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({ sex: "female", firstFemaleRegistrationSqy: undefined })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("firstFemaleRegistrationSqy"))
      ).toBe(true);
    }
  });

  it("refuse firstFemaleRegistrationSqy orphelin (sex !== female)", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({ sex: "male", firstFemaleRegistrationSqy: true })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some(
          (i) =>
            i.path.includes("firstFemaleRegistrationSqy") &&
            typeof i.message === "string" &&
            /sexe féminin/i.test(i.message)
        )
      ).toBe(true);
    }
  });

  it("accepte un homme avec firstFemaleRegistrationSqy non renseigné (undefined)", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({ sex: "male", firstFemaleRegistrationSqy: undefined })
    );
    expect(r.success).toBe(true);
  });

  it("refuse wantsCompetitorExtras=true avec section handisport", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        mainSectionId: "handisport",
        slotIds: ["voisins-mar-1830-handisport"],
        wantsCompetitorExtras: true,
        competitionJerseySize: "M",
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("wantsCompetitorExtras"))
      ).toBe(true);
    }
  });

  it("refuse wantsCompetitorExtras=true avec section sport-adapté", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        mainSectionId: "sport-adapte",
        slotIds: ["villepreux-jeu-1030-sport-adapte"],
        wantsCompetitorExtras: true,
        competitionJerseySize: "M",
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("wantsCompetitorExtras"))
      ).toBe(true);
    }
  });

  it("accepte une section handisport sans extension compétiteur", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        mainSectionId: "handisport",
        slotIds: ["voisins-mar-1830-handisport"],
        handisportPracticeLevel: "leisure",
        wantsCompetitorExtras: false,
      })
    );
    expect(r.success).toBe(true);
  });

  it("refuse un compétiteur sans taille de maillot", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({ wantsCompetitorExtras: true, competitionJerseySize: undefined })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("competitionJerseySize"))
      ).toBe(true);
    }
  });

  it("refuse un téléphone principal invalide", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({ adherentPhonePrimary: "01234" })
    );
    expect(r.success).toBe(false);
  });

  it("refuse un payload sans créneau", () => {
    const r = clubRegistrationPayloadSchema.safeParse(buildPayload({ slotIds: [] }));
    expect(r.success).toBe(false);
  });

  it("refuse une section additionnelle qui reprend la principale", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({ mainSectionId: "voisins", additionalSectionIds: ["voisins"] })
    );
    expect(r.success).toBe(false);
  });

  it("refuse une déclaration médicale `over_40_*` pour un moins de 40 ans", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "1995-04-12",
        medicalCertificateDeclaration: "over_40_cert_unchanged_all_no",
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("medicalCertificateDeclaration"))
      ).toBe(true);
    }
  });

  it("refuse une déclaration médicale `under_40_all_no` pour un ≥ 40 ans", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "1960-04-12",
        medicalCertificateDeclaration: "under_40_all_no",
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("medicalCertificateDeclaration"))
      ).toBe(true);
    }
  });

  it("accepte la nouvelle option `over_40_first_or_changed_certificate_required` pour un ≥ 40 ans", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "1960-04-12",
        medicalCertificateDeclaration: "over_40_first_or_changed_certificate_required",
      })
    );
    expect(r.success).toBe(true);
  });

  it("refuse un mineur sans autorisation médicale d'urgence (yes)", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "2015-04-12",
        adherentRole: "minor_dependent",
        emergencyMedicalAuthorization: "not_applicable_adult",
        supervisionAcknowledgement: "yes",
        representatives: [
          {
            role: "mother",
            firstName: "Marie",
            lastName: "Dupont",
            email: "marie@example.com",
            phone: "0612345670",
          },
        ],
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("emergencyMedicalAuthorization"))
      ).toBe(true);
    }
  });

  it("refuse un mineur sans engagement de prise en charge (yes)", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "2015-04-12",
        adherentRole: "minor_dependent",
        emergencyMedicalAuthorization: "yes",
        supervisionAcknowledgement: "not_applicable_adult",
        representatives: [
          {
            role: "mother",
            firstName: "Marie",
            lastName: "Dupont",
            email: "marie@example.com",
            phone: "0612345670",
          },
        ],
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("supervisionAcknowledgement"))
      ).toBe(true);
    }
  });

  it("refuse un majeur qui aurait `yes` sur l'autorisation médicale d'urgence", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        emergencyMedicalAuthorization: "yes",
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("emergencyMedicalAuthorization"))
      ).toBe(true);
    }
  });

  it("refuse un majeur qui aurait `yes` sur l'engagement de prise en charge", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        supervisionAcknowledgement: "yes",
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("supervisionAcknowledgement"))
      ).toBe(true);
    }
  });

  it("exige handisportPracticeLevel pour la section handisport", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        mainSectionId: "handisport",
        slotIds: ["voisins-mar-1830-handisport"],
        wantsCompetitorExtras: false,
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("handisportPracticeLevel"))
      ).toBe(true);
    }
  });

  it("accepte handisport en loisirs avec handisportPracticeLevel", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        mainSectionId: "handisport",
        slotIds: ["voisins-mar-1830-handisport"],
        handisportPracticeLevel: "leisure",
        wantsCompetitorExtras: false,
      })
    );
    expect(r.success).toBe(true);
  });

  it("refuse handisportPracticeLevel hors section handisport", () => {
    const r = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        handisportPracticeLevel: "leisure",
      })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("handisportPracticeLevel"))
      ).toBe(true);
    }
  });

  it("accepte `questionnaire_yes_certificate_required` quel que soit l'âge", () => {
    const young = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "1995-04-12",
        medicalCertificateDeclaration: "questionnaire_yes_certificate_required",
      })
    );
    const old = clubRegistrationPayloadSchema.safeParse(
      buildPayload({
        birthDate: "1960-04-12",
        medicalCertificateDeclaration: "questionnaire_yes_certificate_required",
        medicalQuestionnaire: { summary: "has_yes", answers: {} },
        medicalVeteranPath: { hadFfttLicense: "yes", categoryChanged: "no" },
      })
    );
    expect(young.success).toBe(true);
    expect(old.success).toBe(true);
  });
});
