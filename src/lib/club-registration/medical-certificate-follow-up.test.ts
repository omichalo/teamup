import {
  canApplyMedicalCertificateFollowUpEvent,
  isMedicalCertificateFollowUpApplicable,
  medicalCertificateFollowUpChipLabel,
  medicalCertificateStatusForFollowUpEvent,
  normalizeMedicalCertificateFollowUpNote,
  parseMedicalCertificateFollowUpEvents,
  readMedicalCertificateFollowUpState,
} from "@/lib/club-registration/medical-certificate-follow-up";

describe("medical-certificate-follow-up", () => {
  it("détecte les déclarations soumises au suivi certificat", () => {
    expect(isMedicalCertificateFollowUpApplicable("adult_certificate_required")).toBe(
      true
    );
    expect(
      isMedicalCertificateFollowUpApplicable("senior_certificate_required")
    ).toBe(true);
    expect(isMedicalCertificateFollowUpApplicable("adult_pps_declared")).toBe(
      false
    );
  });

  it("dérive le chip depuis le statut dossier", () => {
    expect(medicalCertificateFollowUpChipLabel("required_not_received")).toBe(
      "Requis - non reçu"
    );
    expect(medicalCertificateFollowUpChipLabel("received")).toBe("Reçu");
    expect(medicalCertificateFollowUpChipLabel("validated")).toBe("Validé");
  });

  it("autorise les actions selon le statut dossier", () => {
    expect(
      canApplyMedicalCertificateFollowUpEvent(
        "required_not_received",
        "adult_certificate_required",
        "reminder"
      )
    ).toBe(true);
    expect(
      canApplyMedicalCertificateFollowUpEvent(
        "required_not_received",
        "adult_certificate_required",
        "marked_ok"
      )
    ).toBe(true);
    expect(
      canApplyMedicalCertificateFollowUpEvent(
        "received",
        "adult_certificate_required",
        "marked_ok"
      )
    ).toBe(true);
    expect(
      canApplyMedicalCertificateFollowUpEvent(
        "validated",
        "adult_certificate_required",
        "marked_ok"
      )
    ).toBe(false);
    expect(
      canApplyMedicalCertificateFollowUpEvent(
        "validated",
        "adult_certificate_required",
        "reopened"
      )
    ).toBe(true);
    expect(
      canApplyMedicalCertificateFollowUpEvent(
        "required_not_received",
        "adult_certificate_required",
        "reopened"
      )
    ).toBe(false);
    expect(
      canApplyMedicalCertificateFollowUpEvent(
        "required_not_received",
        "adult_pps_declared",
        "reminder"
      )
    ).toBe(false);
  });

  it("passe directement à validated (sans étape reçu)", () => {
    expect(medicalCertificateStatusForFollowUpEvent("marked_ok")).toBe(
      "validated"
    );
    expect(medicalCertificateStatusForFollowUpEvent("reopened")).toBe(
      "required_not_received"
    );
    expect(medicalCertificateStatusForFollowUpEvent("reminder")).toBeNull();
  });

  it("valide les notes", () => {
    expect(normalizeMedicalCertificateFollowUpNote(undefined)).toBeNull();
    expect(normalizeMedicalCertificateFollowUpNote("  ok  ")).toBe("ok");
    expect(normalizeMedicalCertificateFollowUpNote("x".repeat(501))).toEqual({
      error: expect.stringContaining("trop longue"),
    });
  });

  it("parse les événements stockés", () => {
    expect(
      parseMedicalCertificateFollowUpEvents([
        {
          id: "e1",
          type: "reminder",
          note: "Mail",
          at: "2026-09-07T10:00:00.000Z",
          byUid: "u1",
        },
        { id: "bad" },
      ])
    ).toEqual([
      {
        id: "e1",
        type: "reminder",
        note: "Mail",
        at: "2026-09-07T10:00:00.000Z",
        byUid: "u1",
      },
    ]);
  });

  it("lit l’état depuis le statut dossier (pas de statut parallèle)", () => {
    const state = readMedicalCertificateFollowUpState(
      {
        medicalCertificateStatus: "validated",
        medicalCertificateFollowUpEvents: [],
      },
      "adult_certificate_required"
    );
    expect(state.medicalCertificateStatus).toBe("validated");
    expect(state.events).toEqual([]);
  });
});
