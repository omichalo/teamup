/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { AdherentStep } from "./AdherentStep";
import {
  createEmptyDraft,
  type RegistrationDraft,
} from "./registration-defaults";

function setup(overrides: Partial<RegistrationDraft> = {}) {
  const draft: RegistrationDraft = { ...createEmptyDraft(), ...overrides };
  const onPatch = jest.fn();
  const onSetSex = jest.fn();

  render(
    <AdherentStep
      draft={draft}
      accountEmail={null}
      onPatch={onPatch}
      onSetSex={onSetSex}
    />
  );
}

function setupWithAccountEmail(
  accountEmail: string,
  overrides: Partial<RegistrationDraft> = {}
) {
  const draft: RegistrationDraft = { ...createEmptyDraft(), ...overrides };

  render(
    <AdherentStep
      draft={draft}
      accountEmail={accountEmail}
      onPatch={jest.fn()}
      onSetSex={jest.fn()}
    />
  );
}

describe("AdherentStep — validation onBlur", () => {
  it("n'affiche pas d'erreur e-mail invalide avant le 1er blur (pas de friction)", () => {
    setup({ adherentEmail: "pas-un-email" });
    expect(
      screen.queryByText(/adresse e-mail invalide/i)
    ).not.toBeInTheDocument();
  });

  it("affiche l'erreur e-mail après le blur si le format est invalide", () => {
    setup({ adherentEmail: "pas-un-email" });
    const emailInput = screen.getByLabelText(/e-mail de contact/i);
    fireEvent.blur(emailInput);
    expect(screen.getByText(/adresse e-mail invalide/i)).toBeInTheDocument();
  });

  it("affiche une erreur si l'e-mail de contact d'un adulte est vide après blur", () => {
    setup({ adherentEmail: "" });
    const emailInput = screen.getByLabelText(/e-mail de contact/i);
    fireEvent.blur(emailInput);
    expect(screen.getByText(/e-mail de contact obligatoire/i)).toBeInTheDocument();
  });

  it("ne montre pas d'erreur si l'e-mail du mineur est vide même après blur", () => {
    const minorBirth = new Date();
    minorBirth.setFullYear(minorBirth.getFullYear() - 10);
    setup({ adherentEmail: "", birthDate: minorBirth.toISOString().slice(0, 10) });
    const emailInput = screen.getByLabelText(/e-mail de l’adhérent mineur/i);
    fireEvent.blur(emailInput);
    expect(screen.queryByText(/e-mail de contact obligatoire/i)).not.toBeInTheDocument();
  });

  it("affiche « Téléphone obligatoire » après blur sur un téléphone primaire vide", () => {
    setup({ adherentPhonePrimary: "" });
    const phoneInput = screen.getByLabelText(/téléphone principal/i);
    fireEvent.blur(phoneInput);
    expect(screen.getByText(/téléphone obligatoire/i)).toBeInTheDocument();
  });

  it("affiche « Numéro français invalide » sur téléphone secondaire mal formé après blur", () => {
    setup({ adherentPhoneSecondary: "12" });
    const secondary = screen.getByLabelText(/téléphone secondaire/i);
    fireEvent.blur(secondary);
    expect(
      screen.getByText(/numéro français invalide/i)
    ).toBeInTheDocument();
  });
});

describe("AdherentStep — helper e-mail adapté à l'âge", () => {
  it("explique le fallback vers le compte créé au moment de l'envoi", () => {
    setup({});
    expect(
      screen.getByText(/préremplir la connexion ou la création de compte/i)
    ).toBeInTheDocument();
  });

  it("propose un message orienté « mineur » si la date correspond à un mineur", () => {
    const minorBirth = new Date();
    minorBirth.setFullYear(minorBirth.getFullYear() - 10);
    setup({ birthDate: minorBirth.toISOString().slice(0, 10) });
    expect(
      screen.getByText(/le contact principal est le représentant légal/i)
    ).toBeInTheDocument();
  });

  it("distingue l'e-mail de contact du compte connecté", () => {
    setupWithAccountEmail("parent@example.com", {
      adherentEmail: "parent@example.com",
    });
    expect(
      screen.getByText(/elle peut être différente du compte connecté/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/prérempli avec l’e-mail vérifié de votre compte/i)
    ).not.toBeInTheDocument();
  });
});
