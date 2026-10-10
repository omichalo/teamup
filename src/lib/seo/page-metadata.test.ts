import { pageMetadata } from "./page-metadata";

describe("pageMetadata", () => {
  it("expose le titre pour le template racine", () => {
    expect(pageMetadata("Joueurs")).toEqual({ title: "Joueurs" });
  });
});
