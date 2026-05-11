import { clubRegistrationPayloadSchema } from "./schema";

/**
 * Helper qui construit un payload valide minimal pour un adulte qui s'inscrit lui-même,
 * et permet d'écraser des champs spécifiques pour cibler chaque cas de test.
 */
function buildPayload(
  overrides: Partial<Parameters<typeof clubRegistrationPayloadSchema.safeParse>[0]> = {}
) {
  const base = {
    adherentRole: "self" as const,
    firstName: "Olivier",
    lastName: "Dupont",
    sex: "male" as const,
    birthCity: "Paris",
    birthDate: "1985-04-12",
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
    medicalCertificateDeclaration: "under_40_all_no",
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
  return { ...base, ...overrides };
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
});
