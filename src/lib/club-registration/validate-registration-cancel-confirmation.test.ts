import {
  getRegistrationCancelConfirmationPhrase,
  isRegistrationCancelConfirmationValid,
  normalizeCancellationReason,
} from "./validate-registration-cancel-confirmation";

describe("validate-registration-cancel-confirmation", () => {
  const identity = { firstName: "Aubin", lastName: "JAEGLE PATOU" };

  it("génère la phrase ANNULER Prénom NOM", () => {
    expect(getRegistrationCancelConfirmationPhrase(identity)).toBe(
      "ANNULER Aubin JAEGLE PATOU"
    );
  });

  it("accepte les variantes de casse / accents", () => {
    expect(isRegistrationCancelConfirmationValid(identity, "ANNULER Aubin JAEGLE PATOU")).toBe(
      true
    );
    expect(isRegistrationCancelConfirmationValid(identity, "annuler aubin jaegle patou")).toBe(
      true
    );
    expect(isRegistrationCancelConfirmationValid(identity, "ANNULER Jean DUPONT")).toBe(false);
  });

  it("valide le motif", () => {
    expect(normalizeCancellationReason("  Doublon  ")).toBe("Doublon");
    expect(normalizeCancellationReason("")).toBeNull();
    expect(normalizeCancellationReason("x".repeat(501))).toBeNull();
  });
});
