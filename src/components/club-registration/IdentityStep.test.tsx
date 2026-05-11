/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/fr";
import { IdentityStep } from "./IdentityStep";
import { createEmptyDraft, type RegistrationDraft } from "./registration-defaults";

function setup(overrides: Partial<RegistrationDraft> = {}) {
  const draft: RegistrationDraft = { ...createEmptyDraft(), ...overrides };
  const onPatch = jest.fn();
  const onSetAdherentRole = jest.fn();
  const onSetSex = jest.fn();
  const onAddRepresentative = jest.fn();
  const onUpdateRepresentative = jest.fn();
  const onRemoveRepresentative = jest.fn();

  render(
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <IdentityStep
        draft={draft}
        onPatch={onPatch}
        onSetAdherentRole={onSetAdherentRole}
        onSetSex={onSetSex}
        onAddRepresentative={onAddRepresentative}
        onUpdateRepresentative={onUpdateRepresentative}
        onRemoveRepresentative={onRemoveRepresentative}
      />
    </LocalizationProvider>
  );
}

describe("IdentityStep — validation onBlur", () => {
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
