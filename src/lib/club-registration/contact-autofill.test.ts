import {
  shouldAutofillAdherentEmailFromAccount,
  shouldAutofillRepresentativeEmailFromAccount,
  shouldClearAdherentEmailFromAccount,
  shouldClearRepresentativeEmailFromAccount,
} from "./contact-autofill";

describe("contact-autofill", () => {
  const adultBirthDate = "1990-01-01";
  const minorBirthDate = "2015-01-01";

  it("préremplit l'e-mail adhérent pour un joueur majeur qui s'inscrit", () => {
    expect(
      shouldAutofillAdherentEmailFromAccount({
        isRegistrationManager: false,
        adherentRole: "self",
        birthDate: adultBirthDate,
      })
    ).toBe(true);
  });

  it("ne préremplit pas pour admin ou secrétaire", () => {
    expect(
      shouldAutofillAdherentEmailFromAccount({
        isRegistrationManager: true,
        adherentRole: "self",
        birthDate: adultBirthDate,
      })
    ).toBe(false);
    expect(
      shouldAutofillRepresentativeEmailFromAccount({
        isRegistrationManager: true,
        adherentRole: "minor_dependent",
      })
    ).toBe(false);
  });

  it("ne préremplit pas l'e-mail adhérent pour un mineur", () => {
    expect(
      shouldAutofillAdherentEmailFromAccount({
        isRegistrationManager: false,
        adherentRole: "minor_dependent",
        birthDate: minorBirthDate,
      })
    ).toBe(false);
  });

  it("préremplit l'e-mail représentant pour un parent, pas pour le staff", () => {
    expect(
      shouldAutofillRepresentativeEmailFromAccount({
        isRegistrationManager: false,
        adherentRole: "minor_dependent",
      })
    ).toBe(true);
    expect(
      shouldAutofillRepresentativeEmailFromAccount({
        isRegistrationManager: true,
        adherentRole: "minor_dependent",
      })
    ).toBe(false);
  });

  it("nettoie l'e-mail adhérent pour mineur ou staff", () => {
    expect(
      shouldClearAdherentEmailFromAccount({
        isRegistrationManager: true,
        adherentRole: "other_adult",
        birthDate: adultBirthDate,
      })
    ).toBe(true);
    expect(
      shouldClearAdherentEmailFromAccount({
        isRegistrationManager: false,
        adherentRole: "minor_dependent",
        birthDate: minorBirthDate,
      })
    ).toBe(true);
    expect(
      shouldClearAdherentEmailFromAccount({
        isRegistrationManager: false,
        adherentRole: "self",
        birthDate: adultBirthDate,
      })
    ).toBe(false);
  });

  it("nettoie l'e-mail représentant uniquement pour le staff", () => {
    expect(
      shouldClearRepresentativeEmailFromAccount({ isRegistrationManager: true })
    ).toBe(true);
    expect(
      shouldClearRepresentativeEmailFromAccount({ isRegistrationManager: false })
    ).toBe(false);
  });
});
