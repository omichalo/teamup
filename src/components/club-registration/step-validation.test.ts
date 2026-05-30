import { APPLICANT_NOTES_MAX_LENGTH } from "@/lib/club-registration/applicant-notes";
import { createEmptyDraft } from "./registration-defaults";
import { validateStep } from "./step-validation";

describe("validateStep focusSelector", () => {
  it("pointe vers la déclaration médicale si le dossier est incomplet", () => {
    const draft = createEmptyDraft();
    draft.birthDate = "1975-07-22";
    const result = validateStep("admin", draft);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain("déclaration médicale");
      expect(result.focusSelector).toMatch(/medical/);
    }
  });

  it("exige un montant pour chaque aide cochée à l'étape admin", () => {
    const draft = createEmptyDraft();
    draft.birthDate = "2010-05-15";
    draft.medicalQuestionnaire = { summary: "all_no", answers: {} };
    draft.medicalCertificateDeclaration = "under_40_all_no";
    draft.reductionTypes = ["pass_sport"];
    draft.paymentAids = [];
    const result = validateStep("admin", draft);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/montant/i);
    }
  });

  it("refuse des précisions trop longues sur l'étape récap", () => {
    const draft = createEmptyDraft();
    draft.applicantNotes = "x".repeat(APPLICANT_NOTES_MAX_LENGTH + 1);
    const result = validateStep("recap", draft);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.focusSelector).toBe("#applicant-notes-field");
    }
  });
});
