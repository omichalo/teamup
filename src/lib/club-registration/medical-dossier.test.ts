import {
  createEmptyMedicalQuestionnaire,
  createEmptyMedicalVeteranPath,
  deriveMedicalCertificateDeclaration,
  inferMedicalDossierFromDeclaration,
  isMedicalAdminStepComplete,
} from "./medical-dossier";

describe("medical-dossier", () => {
  const minorBirth = "2015-04-12";
  const adultBirth = "2000-04-12";
  const seniorBirth = "1960-04-12";

  it("dérive minor_all_no pour un mineur avec toutes les réponses non", () => {
    expect(
      deriveMedicalCertificateDeclaration({
        birthDate: minorBirth,
        questionnaire: { summary: "all_no", answers: {} },
        veteranPath: createEmptyMedicalVeteranPath(),
        hasVerifiedFfttLicense: false,
      })
    ).toBe("minor_all_no");
  });

  it("dérive minor_yes_certificate_required pour un mineur avec au moins un oui", () => {
    expect(
      deriveMedicalCertificateDeclaration({
        birthDate: minorBirth,
        questionnaire: { summary: "has_yes", answers: {} },
        veteranPath: createEmptyMedicalVeteranPath(),
        hasVerifiedFfttLicense: false,
      })
    ).toBe("minor_yes_certificate_required");
  });

  it("dérive adult_pps_declared pour un adulte 18-64 ans", () => {
    expect(
      deriveMedicalCertificateDeclaration({
        birthDate: adultBirth,
        questionnaire: { summary: "pps_declared", answers: {} },
        veteranPath: createEmptyMedicalVeteranPath(),
        hasVerifiedFfttLicense: false,
      })
    ).toBe("adult_pps_declared");
  });

  it("dérive adult_certificate_required pour un adulte choisissant le certificat", () => {
    expect(
      deriveMedicalCertificateDeclaration({
        birthDate: adultBirth,
        questionnaire: { summary: "certificate_choice", answers: {} },
        veteranPath: createEmptyMedicalVeteranPath(),
        hasVerifiedFfttLicense: false,
      })
    ).toBe("adult_certificate_required");
  });

  it("dérive senior_certificate_required pour une première licence à 65 ans et plus", () => {
    expect(
      deriveMedicalCertificateDeclaration({
        birthDate: seniorBirth,
        questionnaire: createEmptyMedicalQuestionnaire(),
        veteranPath: { hadFfttLicense: "no", categoryChanged: "" },
        hasVerifiedFfttLicense: false,
      })
    ).toBe("senior_certificate_required");
  });

  it("dérive adult_pps_declared pour un senior sans changement de catégorie vétéran", () => {
    expect(
      deriveMedicalCertificateDeclaration({
        birthDate: seniorBirth,
        questionnaire: { summary: "pps_declared", answers: {} },
        veteranPath: { hadFfttLicense: "yes", categoryChanged: "no" },
        hasVerifiedFfttLicense: false,
      })
    ).toBe("adult_pps_declared");
  });

  it("reconstruit le dossier depuis une déclaration PPS adulte", () => {
    const inferred = inferMedicalDossierFromDeclaration(
      "adult_pps_declared",
      adultBirth
    );
    expect(inferred.questionnaire.summary).toBe("pps_declared");
  });

  it("reconstruit le parcours vétéran senior depuis senior_certificate_required", () => {
    const inferred = inferMedicalDossierFromDeclaration(
      "senior_certificate_required",
      seniorBirth
    );
    expect(inferred.veteranPath).toEqual({
      hadFfttLicense: "no",
      categoryChanged: "",
    });
  });

  it("considère le parcours admin incomplet tant que les réponses manquent", () => {
    expect(
      isMedicalAdminStepComplete({
        birthDate: seniorBirth,
        questionnaire: createEmptyMedicalQuestionnaire(),
        veteranPath: createEmptyMedicalVeteranPath(),
        hasVerifiedFfttLicense: false,
      })
    ).toBe(false);
  });
});
