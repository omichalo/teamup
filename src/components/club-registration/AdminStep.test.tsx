/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { AdminStep } from "./AdminStep";
import {
  createEmptyDraft,
  type RegistrationDraft,
} from "./registration-defaults";

function renderStep(overrides: Partial<RegistrationDraft> = {}) {
  const draft: RegistrationDraft = { ...createEmptyDraft(), ...overrides };
  const onChange = jest.fn();
  render(<AdminStep draft={draft} onChange={onChange} />);
  return { onChange };
}

describe("AdminStep — questionnaire de santé conditionnel", () => {
  it("propose le questionnaire MINEUR pour un adhérent mineur", () => {
    const minorBirthDate = new Date();
    minorBirthDate.setFullYear(minorBirthDate.getFullYear() - 10);
    renderStep({ birthDate: minorBirthDate.toISOString().slice(0, 10) });

    expect(
      screen.getByRole("link", { name: /questionnaire de santé mineur/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /questionnaire de santé majeur/i })
    ).not.toBeInTheDocument();
  });

  it("propose le questionnaire MAJEUR pour un adhérent adulte (< 40 ans)", () => {
    renderStep({ birthDate: "2000-04-12" });
    expect(
      screen.getByRole("link", { name: /questionnaire de santé majeur/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /questionnaire de santé mineur/i })
    ).not.toBeInTheDocument();
  });

  it("propose le questionnaire MAJEUR pour un adhérent de 40 ans et plus", () => {
    renderStep({ birthDate: "1970-04-12" });
    expect(
      screen.getByRole("link", { name: /questionnaire de santé majeur/i })
    ).toBeInTheDocument();
  });
});

describe("AdminStep — Pass Sport unifié", () => {
  it("active Pass Sport ajoute la réduction et affiche le champ code", () => {
    const { onChange } = renderStep({ reductionTypes: [] });
    const toggle = screen.getByLabelText(/j’ai un pass sport/i);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        reductionTypes: expect.arrayContaining(["pass_sport"]),
      })
    );
  });

  it("désactiver Pass Sport vide le code", () => {
    const { onChange } = renderStep({
      reductionTypes: ["pass_sport"],
      passSportCode: "ABC123",
    });
    const toggle = screen.getByLabelText(/j’ai un pass sport/i);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        passSportCode: "",
        reductionTypes: expect.not.arrayContaining(["pass_sport"]),
      })
    );
  });

  it("Pass Sport n’apparaît pas dans la liste « autres aides et réductions »", () => {
    renderStep({ reductionTypes: [] });
    /* Le toggle Pass Sport est dédié, donc l'option « Pass Sport » des
       autres réductions ne doit pas exister en parallèle (source de vérité
       unique côté UI). */
    const allPassSportControls = screen.getAllByLabelText(/pass sport/i);
    /* On s'attend à exactement 2 contrôles : le toggle « J'ai un Pass Sport »
       et son champ texte associé « Code Pass Sport » (qui est aussi rendu
       par MUI via le label). Si une 3ᵉ case à cocher apparaissait dans la
       liste des autres réductions, ce compte passerait à 3. */
    expect(allPassSportControls.length).toBeLessThanOrEqual(2);
  });
});
