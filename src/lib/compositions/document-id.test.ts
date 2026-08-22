import {
  getCompositionDefaultsDocumentId,
  getCompositionDocumentId,
} from "./document-id";

describe("composition document ids", () => {
  it("namespaces day compositions by FFTT epreuve id", () => {
    expect(getCompositionDocumentId(1, "aller", "masculin")).toBe(
      "aller_1_masculin"
    );
    expect(getCompositionDocumentId(1, "aller", "masculin", 18368)).toBe(
      "aller_1_masculin_18368"
    );
  });

  it("namespaces default compositions by FFTT epreuve id", () => {
    expect(getCompositionDefaultsDocumentId("aller", "feminin")).toBe(
      "aller_feminin"
    );
    expect(getCompositionDefaultsDocumentId("aller", "feminin", 18369)).toBe(
      "aller_feminin_18369"
    );
  });
});
