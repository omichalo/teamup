import { idEpreuveForCompositionDocs } from "@/lib/compositions/composition-batch-operations";

describe("idEpreuveForCompositionDocs", () => {
  it("omits idEpreuve for France équipes (align disponibilites)", () => {
    expect(
      idEpreuveForCompositionDocs([
        { team: { id: "a", idEpreuve: 18368 } },
        { team: { id: "b", idEpreuve: 18369 } },
      ])
    ).toBeUndefined();
  });

  it("keeps stable Paris doc id even when teams use current FFTT id", () => {
    expect(
      idEpreuveForCompositionDocs([{ team: { id: "p", idEpreuve: 15980 } }])
    ).toBe(15980);
    expect(
      idEpreuveForCompositionDocs([{ team: { id: "p", idEpreuve: 18394 } }])
    ).toBe(15980);
  });
});
