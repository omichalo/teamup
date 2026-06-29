import {
  getRegistrationDeleteConfirmationPhrase,
  isRegistrationDeleteConfirmationValid,
} from "./validate-registration-delete-confirmation";

describe("validate-registration-delete-confirmation", () => {
  const identity = { firstName: "Théo", lastName: "Nosperger" };

  it("génère une phrase lisible à partir du nom de l'adhérent", () => {
    expect(getRegistrationDeleteConfirmationPhrase(identity)).toBe("SUPPRIMER Théo NOSPERGER");
  });

  it("accepte la phrase exacte ou une variante de casse / accents", () => {
    expect(isRegistrationDeleteConfirmationValid(identity, "SUPPRIMER Théo NOSPERGER")).toBe(
      true
    );
    expect(isRegistrationDeleteConfirmationValid(identity, "supprimer theo nosperger")).toBe(
      true
    );
    expect(isRegistrationDeleteConfirmationValid(identity, "  SUPPRIMER   Théo   NOSPERGER  ")).toBe(
      true
    );
    expect(isRegistrationDeleteConfirmationValid(identity, "SUPPRIMER Jean DUPONT")).toBe(false);
    expect(isRegistrationDeleteConfirmationValid(identity, null)).toBe(false);
  });
});
