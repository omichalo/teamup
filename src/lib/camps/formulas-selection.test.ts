import {
  campFormulaInstanceId,
  campFormulaSelectionKey,
  parseCampFormulaSelection,
} from "./formulas";

describe("camp formula selection keys", () => {
  it("construit des clés UI uniques par site", () => {
    const a = campFormulaSelectionKey("siteA", "formulaX");
    const b = campFormulaSelectionKey("siteB", "formulaX");
    expect(a).not.toBe(b);
    expect(parseCampFormulaSelection(a)).toEqual({
      siteId: "siteA",
      formulaId: "formulaX",
    });
  });

  it("instancie un id de formule distinct par site à l’assignation", () => {
    expect(campFormulaInstanceId("siteA", "cat1")).toBe("siteA__cat1");
    expect(campFormulaInstanceId("siteB", "cat1")).toBe("siteB__cat1");
  });
});
