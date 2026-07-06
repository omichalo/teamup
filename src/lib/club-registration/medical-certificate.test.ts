import {
  initialMedicalCertificateStatus,
  isMedicalCertificateRequired,
  normalizeMedicalCertificateStatus,
} from "./medical-certificate";

describe("medical-certificate", () => {
  it("détecte les déclarations qui nécessitent un certificat", () => {
    expect(isMedicalCertificateRequired("senior_certificate_required")).toBe(true);
    expect(isMedicalCertificateRequired("adult_certificate_required")).toBe(true);
    expect(isMedicalCertificateRequired("minor_yes_certificate_required")).toBe(true);
    expect(
      isMedicalCertificateRequired(
        "over_40_first_or_changed_certificate_required"
      )
    ).toBe(true);
    expect(
      isMedicalCertificateRequired("questionnaire_yes_certificate_required")
    ).toBe(true);
    expect(isMedicalCertificateRequired("adult_pps_declared")).toBe(false);
    expect(isMedicalCertificateRequired("minor_all_no")).toBe(false);
  });

  it("initialise le suivi selon la déclaration médicale", () => {
    expect(
      initialMedicalCertificateStatus("adult_certificate_required")
    ).toBe("required_not_received");
    expect(initialMedicalCertificateStatus("adult_pps_declared")).toBe(
      "not_required"
    );
  });

  it("normalise un statut incohérent quand le certificat est requis", () => {
    expect(
      normalizeMedicalCertificateStatus(
        "not_required",
        "questionnaire_yes_certificate_required"
      )
    ).toBe("required_not_received");
    expect(
      normalizeMedicalCertificateStatus(
        "validated",
        "questionnaire_yes_certificate_required"
      )
    ).toBe("validated");
  });

  it("force non requis quand la déclaration ne demande pas de certificat", () => {
    expect(normalizeMedicalCertificateStatus("validated", "under_40_all_no")).toBe(
      "not_required"
    );
  });
});
