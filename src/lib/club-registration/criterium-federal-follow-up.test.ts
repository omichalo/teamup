import { COMPETITIONS_JEUNES_ID } from "@/lib/club-registration/competition-ids";
import {
  hasCriteriumFederalSelection,
  initialCriteriumFederalRegistrationStatus,
  isCriteriumFederalCompetitionId,
  matchesCriteriumFederalFilter,
  normalizeCriteriumFederalRegistrationStatus,
  resolveCriteriumFederalRegistrationStatusForPatch,
  resolveManagedListCriteriumFederalFilter,
} from "./criterium-federal-follow-up";

describe("criterium-federal-follow-up", () => {
  it("reconnaît les compétitions critérium (jeunes, seniors, bundle historique)", () => {
    expect(isCriteriumFederalCompetitionId("criterium_federal_jeunes")).toBe(true);
    expect(isCriteriumFederalCompetitionId("criterium_federal_seniors")).toBe(true);
    expect(isCriteriumFederalCompetitionId(COMPETITIONS_JEUNES_ID)).toBe(true);
    expect(isCriteriumFederalCompetitionId("championnat_jeunes")).toBe(false);
    expect(isCriteriumFederalCompetitionId("championnat_equipe")).toBe(false);
  });

  it("détecte une sélection dès qu’un critérium est demandé", () => {
    expect(hasCriteriumFederalSelection(["championnat_jeunes"])).toBe(false);
    expect(
      hasCriteriumFederalSelection(["championnat_jeunes", "criterium_federal_jeunes"])
    ).toBe(true);
    expect(hasCriteriumFederalSelection(["criterium_federal_seniors"])).toBe(true);
    expect(hasCriteriumFederalSelection([COMPETITIONS_JEUNES_ID])).toBe(true);
    expect(hasCriteriumFederalSelection([])).toBe(false);
    expect(hasCriteriumFederalSelection(undefined)).toBe(false);
  });

  it("initialise À faire seulement si un critérium est coché", () => {
    expect(initialCriteriumFederalRegistrationStatus(["criterium_federal_jeunes"])).toBe(
      "to_do"
    );
    expect(initialCriteriumFederalRegistrationStatus(["championnat_paris"])).toBe(
      "not_applicable"
    );
  });

  it("conserve Validé tant que le critérium reste coché", () => {
    expect(
      normalizeCriteriumFederalRegistrationStatus("validated", [
        "criterium_federal_seniors",
      ])
    ).toBe("validated");
    expect(
      normalizeCriteriumFederalRegistrationStatus("to_do", ["criterium_federal_jeunes"])
    ).toBe("to_do");
  });

  it("repasse à non applicable dès qu’aucun critérium n’est coché", () => {
    expect(
      normalizeCriteriumFederalRegistrationStatus("validated", ["championnat_jeunes"])
    ).toBe("not_applicable");
  });

  it("remet À faire si le statut stocké est incoherent alors qu’un critérium est coché", () => {
    expect(
      normalizeCriteriumFederalRegistrationStatus("not_applicable", [
        "criterium_federal_jeunes",
      ])
    ).toBe("to_do");
    expect(
      normalizeCriteriumFederalRegistrationStatus(undefined, [
        "criterium_federal_seniors",
      ])
    ).toBe("to_do");
  });

  it("préserve Validé au PATCH si on recoche le critérium sans renvoyer le statut", () => {
    expect(
      resolveCriteriumFederalRegistrationStatusForPatch({
        competitionIds: ["criterium_federal_jeunes"],
        currentStatus: "validated",
        requestedStatus: undefined,
      })
    ).toBe("validated");
  });

  it("écrit non applicable au PATCH si le critérium est retiré", () => {
    expect(
      resolveCriteriumFederalRegistrationStatusForPatch({
        competitionIds: ["championnat_equipe"],
        currentStatus: "validated",
        requestedStatus: "validated",
      })
    ).toBe("not_applicable");
  });

  it("filtre la liste secrétariat sur À faire / Validé", () => {
    expect(resolveManagedListCriteriumFederalFilter(null)).toBe("all");
    expect(resolveManagedListCriteriumFederalFilter("not_applicable")).toBe("all");
    expect(resolveManagedListCriteriumFederalFilter("to_do")).toBe("to_do");

    const awaiting = {
      competitionIds: ["criterium_federal_jeunes"],
      criteriumFederalRegistrationStatus: "to_do",
    };
    const done = {
      competitionIds: ["criterium_federal_seniors"],
      criteriumFederalRegistrationStatus: "validated",
    };
    const leisure = {
      competitionIds: ["championnat_jeunes"],
      criteriumFederalRegistrationStatus: "validated",
    };

    expect(matchesCriteriumFederalFilter(awaiting, "all")).toBe(true);
    expect(matchesCriteriumFederalFilter(awaiting, "to_do")).toBe(true);
    expect(matchesCriteriumFederalFilter(awaiting, "validated")).toBe(false);
    expect(matchesCriteriumFederalFilter(done, "validated")).toBe(true);
    expect(matchesCriteriumFederalFilter(leisure, "to_do")).toBe(false);
    expect(matchesCriteriumFederalFilter(leisure, "validated")).toBe(false);
  });
});
