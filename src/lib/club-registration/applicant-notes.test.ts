import {
  APPLICANT_NOTES_MAX_LENGTH,
  isApplicantNotesTooLong,
  normalizeApplicantNotes,
} from "./applicant-notes";

describe("applicant-notes", () => {
  it("normalise les espaces et ignore les chaînes vides", () => {
    expect(normalizeApplicantNotes("  Bonjour  ")).toBe("Bonjour");
    expect(normalizeApplicantNotes("")).toBeUndefined();
    expect(normalizeApplicantNotes(undefined)).toBeUndefined();
  });

  it("détecte un dépassement de longueur", () => {
    expect(isApplicantNotesTooLong("a".repeat(APPLICANT_NOTES_MAX_LENGTH))).toBe(false);
    expect(isApplicantNotesTooLong("a".repeat(APPLICANT_NOTES_MAX_LENGTH + 1))).toBe(
      true
    );
  });
});
