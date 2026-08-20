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
      })
    ).toEqual([{ id: "attestation", label: "Attestation · À faire" }]);
  });
});
