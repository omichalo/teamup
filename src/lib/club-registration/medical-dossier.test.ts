import {
  createEmptyMedicalQuestionnaire,
  createEmptyMedicalVeteranPath,
  deriveMedicalCertificateDeclaration,
  inferMedicalDossierFromDeclaration,
  isMedicalAdminStepComplete,
} from "./medical-dossier";

describe("medical-dossier", () => {
  const under40Birth = "2000-04-12";
  const over40Birth = "1970-04-12";

  it("dérive under_40_all_no pour un mineur de parcours avec toutes les réponses non", () => {
    expect(
      deriveMedicalCertificateDeclaration({
        birthDate: under40Birth,
        questionnaire: { summary: "all_no", answers: {} },
        veteranPath: createEmptyMedicalVeteranPath(),
        hasVerifiedFfttLicense: false,
      })
    ).toBe("under_40_all_no");
  });

  it("dérive questionnaire_yes pour au moins une réponse oui", () => {
    expect(
      deriveMedicalCertificateDeclaration({
        birthDate: under40Birth,
        questionnaire: { summary: "has_yes", answers: {} },
        veteranPath: createEmptyMedicalVeteranPath(),
        hasVerifiedFfttLicense: false,
      })
    ).toBe("questionnaire_yes_certificate_required");
  });

  it("dérive le certificat obligatoire pour une première licence à 40+", () => {
    expect(
      deriveMedicalCertificateDeclaration({
        birthDate: over40Birth,
        questionnaire: createEmptyMedicalQuestionnaire(),
        veteranPath: { hadFfttLicense: "no", categoryChanged: "" },
        hasVerifiedFfttLicense: false,
      })
    ).toBe("over_40_first_or_changed_certificate_required");
  });

  it("dérive le parcours vétéran inchangé avec questionnaire tout non", () => {
    expect(
      deriveMedicalCertificateDeclaration({
        birthDate: over40Birth,
        questionnaire: { summary: "all_no", answers: {} },
        veteranPath: { hadFfttLicense: "yes", categoryChanged: "no" },
        hasVerifiedFfttLicense: false,
      })
    ).toBe("over_40_cert_unchanged_all_no");
  });

  it("reconstruit le dossier depuis une déclaration agrégée existante", () => {
    const inferred = inferMedicalDossierFromDeclaration(
      "over_40_cert_unchanged_all_no",
      over40Birth
    );
    expect(inferred.veteranPath).toEqual({
      hadFfttLicense: "yes",
      categoryChanged: "no",
    });
    expect(inferred.questionnaire.summary).toBe("all_no");
  });

  it("considère le parcours admin incomplet tant que les réponses manquent", () => {
    expect(
      isMedicalAdminStepComplete({
        birthDate: over40Birth,
        questionnaire: createEmptyMedicalQuestionnaire(),
        veteranPath: createEmptyMedicalVeteranPath(),
        hasVerifiedFfttLicense: false,
      })
    ).toBe(false);
  });
});
