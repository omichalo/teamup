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

  it("ne traite pas l’ancien régime comme PPS pour un mineur de saison", () => {
    expect(
      resolveMedicalFollowUpKind(
        "under_40_all_no",
        "not_required",
        undefined,
        "2012-06-01"
      )
    ).toBe("ok");
    expect(
      formatMedicalCertificateLabel(
        "not_required",
        "adult_pps_declared",
        "expected",
        "2008-01-15"
      )
    ).toBe("OK");
    expect(
      resolveMedicalFollowUpKind(
        "under_40_all_no",
        "not_required",
        undefined,
        "2000-04-12"
      )
    ).toBe("pps_expected");
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

  it("distingue les états locaux du suivi PPS", () => {
    expect(
      resolveMedicalFollowUpKind("adult_pps_declared", "not_required", "ok")
    ).toBe("ok");
    expect(
      resolveMedicalFollowUpKind(
        "adult_pps_declared",
        "not_required",
        "checked_incomplete"
      )
    ).toBe("pps_checked_incomplete");
    expect(
      formatMedicalFollowUpLabel(
        "adult_pps_declared",
        "not_required",
        "checked_incomplete"
      )
    ).toBe("PPS non fait");
    expect(
      formatMedicalCertificateLabel("not_required", "adult_pps_declared", "ok")
    ).toBe("OK");
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
