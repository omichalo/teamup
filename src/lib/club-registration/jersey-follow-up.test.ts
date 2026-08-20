import {
  initialJerseyFollowUpStatus,
  isJerseyRequested,
  matchesJerseyFollowUpFilter,
  normalizeJerseyFollowUpStatus,
  resolveJerseyFollowUpStatusForPatch,
  resolveManagedListJerseyFollowUpFilter,
} from "./jersey-follow-up";

describe("jersey-follow-up", () => {
  it("détecte un maillot à remettre (compétiteur ou optionnel)", () => {
    expect(isJerseyRequested(true, false)).toBe(true);
    expect(isJerseyRequested(false, true)).toBe(true);
    expect(isJerseyRequested(false, false)).toBe(false);
    expect(isJerseyRequested(undefined, undefined)).toBe(false);
  });

  it("initialise À faire seulement si un maillot est commandé", () => {
    expect(initialJerseyFollowUpStatus(true, false)).toBe("to_do");
    expect(initialJerseyFollowUpStatus(false, true)).toBe("to_do");
    expect(initialJerseyFollowUpStatus(false, false)).toBe("not_applicable");
  });

  it("conserve Donné tant qu’un maillot reste commandé", () => {
    expect(normalizeJerseyFollowUpStatus("given", true, false)).toBe("given");
    expect(normalizeJerseyFollowUpStatus("to_do", false, true)).toBe("to_do");
  });

  it("repasse à non applicable si plus aucun maillot n’est commandé", () => {
    expect(normalizeJerseyFollowUpStatus("given", false, false)).toBe("not_applicable");
  });

  it("remet À faire si le statut stocké est incohérent", () => {
    expect(normalizeJerseyFollowUpStatus("not_applicable", true, false)).toBe("to_do");
    expect(normalizeJerseyFollowUpStatus(undefined, false, true)).toBe("to_do");
  });

  it("préserve Donné au PATCH si on recocher le maillot sans renvoyer le statut", () => {
    expect(
      resolveJerseyFollowUpStatusForPatch({
        wantsCompetitorExtras: true,
        wantsOptionalJersey: false,
        currentStatus: "given",
        requestedStatus: undefined,
      })
    ).toBe("given");
  });

  it("écrit non applicable au PATCH si le maillot est retiré", () => {
    expect(
      resolveJerseyFollowUpStatusForPatch({
        wantsCompetitorExtras: false,
        wantsOptionalJersey: false,
        currentStatus: "given",
        requestedStatus: "given",
      })
    ).toBe("not_applicable");
  });

  it("filtre la liste secrétariat sur À faire / Donné", () => {
    expect(resolveManagedListJerseyFollowUpFilter(null)).toBe("all");
    expect(resolveManagedListJerseyFollowUpFilter("not_applicable")).toBe("all");
    expect(resolveManagedListJerseyFollowUpFilter("given")).toBe("given");

    const awaiting = {
      wantsCompetitorExtras: true,
      jerseyFollowUpStatus: "to_do",
    };
    const done = {
      wantsOptionalJersey: true,
      jerseyFollowUpStatus: "given",
    };
    const leisure = {
      wantsCompetitorExtras: false,
      wantsOptionalJersey: false,
      jerseyFollowUpStatus: "given",
    };

    expect(matchesJerseyFollowUpFilter(awaiting, "all")).toBe(true);
    expect(matchesJerseyFollowUpFilter(awaiting, "to_do")).toBe(true);
    expect(matchesJerseyFollowUpFilter(awaiting, "given")).toBe(false);
    expect(matchesJerseyFollowUpFilter(done, "given")).toBe(true);
    expect(matchesJerseyFollowUpFilter(leisure, "to_do")).toBe(false);
    expect(matchesJerseyFollowUpFilter(leisure, "given")).toBe(false);
  });
});
