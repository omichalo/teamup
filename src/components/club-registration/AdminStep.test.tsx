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

describe("AdminStep — déclaration médicale PPS", () => {
  it("propose le questionnaire MINEUR pour un adhérent mineur", () => {
    const minorBirthDate = new Date();
    minorBirthDate.setFullYear(minorBirthDate.getFullYear() - 10);
    renderStep({ birthDate: minorBirthDate.toISOString().slice(0, 10) });

    expect(
      screen.getByRole("link", { name: /questionnaire de santé mineur/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Parcours Prévention Santé/i)
    ).not.toBeInTheDocument();
  });

  it("propose le PPS pour un adulte de 18 à 64 ans", () => {
    renderStep({ birthDate: "2000-04-12" });
    expect(screen.getByText(/Parcours Prévention Santé/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /espace licencié FFTT/i })
    ).toHaveAttribute("href", "https://malicence.fftt.com/");
    expect(
      screen.getByRole("radiogroup", {
        name: /obligation médicale FFTT/i,
      })
    ).toBeInTheDocument();
  });

  it("enregistre adult_pps_declared quand l'adulte choisit le PPS", () => {
    const { onChange } = renderStep({ birthDate: "2000-04-12" });

    fireEvent.click(
      screen.getByLabelText(/je compléterai le PPS/i)
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        medicalCertificateDeclaration: "adult_pps_declared",
        medicalQuestionnaire: expect.objectContaining({ summary: "pps_declared" }),
      })
    );
  });

  it("enregistre adult_certificate_required quand l'adulte choisit le certificat", () => {
    const { onChange } = renderStep({ birthDate: "2000-04-12" });

    fireEvent.click(
      screen.getByLabelText(/je fournirai un certificat médical/i)
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        medicalCertificateDeclaration: "adult_certificate_required",
        medicalQuestionnaire: expect.objectContaining({
          summary: "certificate_choice",
        }),
      })
    );
  });

  it("demande un certificat pour une première licence à 65 ans et plus", () => {
    const { onChange } = renderStep({ birthDate: "1960-04-12" });

    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: /déjà eu une licence/i })
      ).getByLabelText(/première licence/i)
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        medicalCertificateDeclaration: "senior_certificate_required",
        medicalVeteranPath: expect.objectContaining({ hadFfttLicense: "no" }),
      })
    );
  });

  it("propose le choix PPS si le certificat senior n'est pas requis", () => {
    const { onChange } = renderStep({ birthDate: "1960-04-12" });

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
    fireEvent.click(screen.getByLabelText(/je compléterai le PPS/i));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        medicalCertificateDeclaration: "adult_pps_declared",
        medicalQuestionnaire: expect.objectContaining({ summary: "pps_declared" }),
      })
    );
  });

  it("ne demande pas si le joueur a déjà eu une licence quand elle a été retrouvée", () => {
    renderStep({
      birthDate: "1960-04-12",
      ffttLicense: "7864877",
      ffttLicenseLookup: {
        licence: "7864877",
        nom: "MICHALOWICZ",
        prenom: "Olivier",
        categorie: "V60",
      },
    });

    expect(
      screen.queryByRole("radiogroup", { name: /déjà eu une licence/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: /changé de catégorie vétéran/i })
    ).toBeInTheDocument();
  });

  it("affiche un message informatif sans bloquer quand le PPS est déclaré", () => {
    renderStep({
      birthDate: "2000-04-12",
      medicalQuestionnaire: { summary: "pps_declared", answers: {} },
      medicalCertificateDeclaration: "adult_pps_declared",
    });

    expect(
      screen.getByRole("alert")
    ).toHaveTextContent(/inscription au club peut être finalisée/i);
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
