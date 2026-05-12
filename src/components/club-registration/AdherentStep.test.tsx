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

  render(<AdherentStep draft={draft} onPatch={onPatch} onSetSex={onSetSex} />);
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
    const emailInput = screen.getByLabelText(/e-mail de l’adhérent/i);
    fireEvent.blur(emailInput);
    expect(screen.getByText(/adresse e-mail invalide/i)).toBeInTheDocument();
  });

  it("ne montre pas d'erreur si l'e-mail est vide même après blur (champ optionnel)", () => {
    setup({ adherentEmail: "" });
    const emailInput = screen.getByLabelText(/e-mail de l’adhérent/i);
    fireEvent.blur(emailInput);
    expect(
      screen.queryByText(/adresse e-mail invalide/i)
    ).not.toBeInTheDocument();
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
  it("propose un message orienté « adulte » par défaut (date vide → considéré majeur)", () => {
    setup({});
    expect(
      screen.getByText(/communications directes du club avec l’adhérent/i)
    ).toBeInTheDocument();
  });

  it("propose un message orienté « mineur » si la date correspond à un mineur", () => {
    const minorBirth = new Date();
    minorBirth.setFullYear(minorBirth.getFullYear() - 10);
    setup({ birthDate: minorBirth.toISOString().slice(0, 10) });
    expect(
      screen.getByText(/adresse personnelle de l’adhérent mineur/i)
    ).toBeInTheDocument();
  });
});
