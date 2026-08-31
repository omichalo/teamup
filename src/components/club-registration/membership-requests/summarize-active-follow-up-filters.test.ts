import { summarizeActiveFollowUpFilters } from "./summarize-active-follow-up-filters";

describe("summarizeActiveFollowUpFilters", () => {
  it("n’affiche rien quand tous les suivis sont ouverts", () => {
    expect(
      summarizeActiveFollowUpFilters({
        medicalCertificateFilter: "all",
        ppsFollowUpFilter: "all",
        criteriumFederalFilter: "all",
        jerseyFollowUpFilter: "all",
        registrationCertificateFollowUpFilter: "all",
        paymentSupplementFilter: "all",
      })
    ).toEqual([]);
  });

  it("ne liste que les suivis réellement filtrés", () => {
    expect(
      summarizeActiveFollowUpFilters({
        medicalCertificateFilter: "all",
        ppsFollowUpFilter: "ok",
        criteriumFederalFilter: "validated",
        jerseyFollowUpFilter: "all",
        registrationCertificateFollowUpFilter: "all",
        paymentSupplementFilter: "all",
      })
    ).toEqual([
      { id: "pps", label: "PPS · OK" },
      { id: "criterium", label: "Critérium · Validé" },
    ]);
  });

  it("affiche le suivi d’attestation filtrée", () => {
    expect(
      summarizeActiveFollowUpFilters({
        medicalCertificateFilter: "all",
        ppsFollowUpFilter: "all",
        criteriumFederalFilter: "all",
        jerseyFollowUpFilter: "all",
        registrationCertificateFollowUpFilter: "to_do",
        paymentSupplementFilter: "all",
      })
    ).toEqual([{ id: "attestation", label: "Attestation · À faire" }]);
  });

  it("affiche le suivi de maillot filtré", () => {
    expect(
      summarizeActiveFollowUpFilters({
        medicalCertificateFilter: "all",
        ppsFollowUpFilter: "all",
        criteriumFederalFilter: "all",
        jerseyFollowUpFilter: "prepared_awaiting_payment",
        registrationCertificateFollowUpFilter: "all",
        paymentSupplementFilter: "all",
      })
    ).toEqual([{ id: "jersey", label: "Maillot · Préparé - attente paiement" }]);
  });

  it("affiche le filtre complément dû", () => {
    expect(
      summarizeActiveFollowUpFilters({
        medicalCertificateFilter: "all",
        ppsFollowUpFilter: "all",
        criteriumFederalFilter: "all",
        jerseyFollowUpFilter: "all",
        registrationCertificateFollowUpFilter: "all",
        paymentSupplementFilter: "due",
      })
    ).toEqual([{ id: "supplement", label: "Paiement · Complément dû" }]);
  });
});
