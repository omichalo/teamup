/**
 * @jest-environment jsdom
 */

import { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AdminStep } from "./AdminStep";
import {
  createEmptyDraft,
  type RegistrationDraft,
} from "./registration-defaults";

function renderStep(overrides: Partial<RegistrationDraft> = {}) {
  const onChange = jest.fn();

  function StepHost() {
    const [draft, setDraft] = useState<RegistrationDraft>(() => ({
      ...createEmptyDraft(),
      ...overrides,
    }));
    const handleChange = (patch: Partial<RegistrationDraft>) => {
      onChange(patch);
      setDraft((prev) => ({ ...prev, ...patch }));
    };
    return <AdminStep draft={draft} onChange={handleChange} />;
  }

  render(<StepHost />);
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

  it("ne signale pas une incompatibilité médicale sur un brouillon initial 40+", () => {
    renderStep({ birthDate: "1970-04-12" });
    expect(
      screen.queryByText(/précédemment sélectionnée.*compatible/i)
    ).not.toBeInTheDocument();
  });

  it("demande un certificat pour une première licence à 40 ans et plus", () => {
    const { onChange } = renderStep({ birthDate: "1970-04-12" });

    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: /déjà eu une licence/i })
      ).getByLabelText(/première licence/i)
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        medicalCertificateDeclaration:
          "over_40_first_or_changed_certificate_required",
        medicalVeteranPath: expect.objectContaining({ hadFfttLicense: "no" }),
      })
    );
  });

  it("demande un certificat pour un changement de catégorie vétéran", () => {
    const { onChange } = renderStep({ birthDate: "1970-04-12" });

    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: /déjà eu une licence/i })
      ).getByLabelText(/déjà été licencié FFTT/i)
    );
    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: /changé de catégorie vétéran/i })
      ).getByLabelText("Oui")
    );

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        medicalCertificateDeclaration:
          "over_40_first_or_changed_certificate_required",
        medicalVeteranPath: expect.objectContaining({ categoryChanged: "yes" }),
      })
    );
  });

  it("propose le questionnaire santé si le certificat 40+ reste valable", () => {
    const { onChange } = renderStep({ birthDate: "1970-04-12" });

    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: /déjà eu une licence/i })
      ).getByLabelText(/déjà été licencié FFTT/i)
    );
    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: /changé de catégorie vétéran/i })
      ).getByLabelText("Non")
    );
    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: /questionnaire de santé/i })
      ).getByLabelText(/toutes mes réponses sont/i)
    );

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        medicalCertificateDeclaration: "over_40_cert_unchanged_all_no",
        medicalQuestionnaire: expect.objectContaining({ summary: "all_no" }),
      })
    );
  });

  it("ne demande pas si le joueur a déjà eu une licence quand elle a été retrouvée", () => {
    renderStep({
      birthDate: "1970-04-12",
      ffttLicense: "7864877",
      ffttLicenseLookup: {
        licence: "7864877",
        nom: "MICHALOWICZ",
        prenom: "Olivier",
        categorie: "V50",
      },
    });

    expect(
      screen.queryByRole("radiogroup", { name: /déjà eu une licence/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: /changé de catégorie vétéran/i })
    ).toBeInTheDocument();
  });

  it("persiste le parcours vétéran dans le draft (rechargement)", () => {
    const draft: RegistrationDraft = {
      ...createEmptyDraft(),
      birthDate: "1970-04-12",
      medicalVeteranPath: {
        hadFfttLicense: "yes",
        categoryChanged: "no",
      },
      medicalQuestionnaire: { summary: "all_no", answers: {} },
      medicalCertificateDeclaration: "over_40_cert_unchanged_all_no",
    };
    const onChange = jest.fn();
    render(<AdminStep draft={draft} onChange={onChange} />);

    expect(
      within(
        screen.getByRole("radiogroup", { name: /changé de catégorie vétéran/i })
      ).getByLabelText("Non")
    ).toBeChecked();
    expect(
      within(
        screen.getByRole("radiogroup", { name: /questionnaire de santé/i })
      ).getByLabelText(/toutes mes réponses sont/i)
    ).toBeChecked();
  });

  it("demande un certificat si une réponse du questionnaire santé est positive", () => {
    const { onChange } = renderStep({ birthDate: "2000-04-12" });

    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: /questionnaire de santé/i })
      ).getByLabelText(/au moins une réponse/i)
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        medicalCertificateDeclaration: "questionnaire_yes_certificate_required",
        medicalQuestionnaire: expect.objectContaining({ summary: "has_yes" }),
      })
    );
  });
});

describe("AdminStep — aides avec code (config)", () => {
  it("active une aide interrupteur ajoute la réduction et affiche le champ code", () => {
    const { onChange } = renderStep({ reductionTypes: [] });
    const toggle = screen.getByLabelText(/j'ai un pass sport/i);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        reductionTypes: expect.arrayContaining(["pass_sport"]),
      })
    );
  });

  it("désactiver une aide interrupteur vide le code", () => {
    const { onChange } = renderStep({
      reductionTypes: ["pass_sport"],
      reductionReferenceCodes: { pass_sport: "ABC123" },
    });
    const toggle = screen.getByLabelText(/j'ai un pass sport/i);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        reductionReferenceCodes: {},
        reductionTypes: expect.not.arrayContaining(["pass_sport"]),
      })
    );
  });

  it("Pass Sport n'apparaît pas dans les cases à cocher", () => {
    renderStep({ reductionTypes: [] });
    expect(screen.queryByRole("checkbox", { name: /^pass sport$/i })).not.toBeInTheDocument();
  });
});
