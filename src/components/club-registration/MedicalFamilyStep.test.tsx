/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { MedicalFamilyStep } from "./MedicalFamilyStep";
import { createEmptyDraft, type RegistrationDraft } from "./registration-defaults";

function renderStep(overrides: Partial<RegistrationDraft> = {}) {
  const draft: RegistrationDraft = { ...createEmptyDraft(), ...overrides };
  render(<MedicalFamilyStep draft={draft} onChange={jest.fn()} />);
}

describe("MedicalFamilyStep — questionnaire de santé conditionnel", () => {
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
    /* Adulte clairement majeur mais sous 40 ans. */
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
