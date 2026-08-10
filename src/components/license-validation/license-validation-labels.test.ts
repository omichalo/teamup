import { formatMedicalCertificateLabel } from "@/components/license-validation/license-validation-labels";
import {
  formatMedicalFollowUpLabel,
  resolveMedicalFollowUpKind,
} from "@/lib/club-registration/medical-certificate";

describe("resolveMedicalFollowUpKind", () => {
  it("traite le PPS et l’ancien régime équivalent comme PPS attendu", () => {
    expect(resolveMedicalFollowUpKind("adult_pps_declared", "not_required")).toBe(
      "pps_expected"
    );
    expect(resolveMedicalFollowUpKind("under_40_all_no", "not_required")).toBe(
      "pps_expected"
    );
    expect(
      resolveMedicalFollowUpKind("over_40_cert_unchanged_all_no", "not_required")
    ).toBe("pps_expected");
  });

  it("marque OK le questionnaire mineur sans certificat", () => {
    expect(resolveMedicalFollowUpKind("minor_all_no", "not_required")).toBe("ok");
  });

  it("distingue certificat attendu, reçu et validé", () => {
    expect(
      resolveMedicalFollowUpKind("adult_certificate_required", "required_not_received")
    ).toBe("certificate_expected");
    expect(
      resolveMedicalFollowUpKind("adult_certificate_required", "received")
    ).toBe("certificate_received");
    expect(
      resolveMedicalFollowUpKind("adult_certificate_required", "validated")
    ).toBe("ok");
    expect(
      resolveMedicalFollowUpKind(
        "questionnaire_yes_certificate_required",
        "required_not_received"
      )
    ).toBe("certificate_expected");
  });
});

describe("formatMedicalFollowUpLabel / formatMedicalCertificateLabel", () => {
  it("expose les wordings secrétariat rationnalisés", () => {
    expect(formatMedicalFollowUpLabel("adult_pps_declared", "not_required")).toBe(
      "PPS attendu"
    );
    expect(formatMedicalCertificateLabel("not_required", "under_40_all_no")).toBe(
      "PPS attendu"
    );
    expect(formatMedicalCertificateLabel("not_required", "minor_all_no")).toBe("OK");
    expect(
      formatMedicalCertificateLabel(
        "required_not_received",
        "adult_certificate_required"
      )
    ).toBe("Certificat médical attendu");
    expect(
      formatMedicalCertificateLabel("received", "senior_certificate_required")
    ).toBe("Certificat médical reçu");
    expect(
      formatMedicalCertificateLabel("validated", "minor_yes_certificate_required")
    ).toBe("OK");
    expect(formatMedicalCertificateLabel(null, null)).toBe("—");
  });
});
