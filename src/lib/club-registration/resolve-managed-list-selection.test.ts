import { resolveManagedListSelection } from "./resolve-managed-list-selection";

describe("resolveManagedListSelection", () => {
  const ids = ["reg-a", "reg-b"];

  it("ne touche pas à la sélection tant que la liste n’est pas prête", () => {
    expect(
      resolveManagedListSelection({
        selectedId: "from-mail",
        registrationIds: [],
        listReady: false,
        preserveSelectedId: true,
      })
    ).toBeUndefined();
  });

  it("conserve l’id du lien mail même si la liste est vide ou sans ce dossier", () => {
    expect(
      resolveManagedListSelection({
        selectedId: "from-mail",
        registrationIds: [],
        listReady: true,
        preserveSelectedId: true,
      })
    ).toBeUndefined();
    expect(
      resolveManagedListSelection({
        selectedId: "from-mail",
        registrationIds: ids,
        listReady: true,
        preserveSelectedId: true,
      })
    ).toBeUndefined();
  });

  it("efface la sélection si la file est vide sans id à conserver", () => {
    expect(
      resolveManagedListSelection({
        selectedId: "reg-a",
        registrationIds: [],
        listReady: true,
        preserveSelectedId: false,
      })
    ).toBeNull();
  });

  it("garde la sélection si elle est dans la liste", () => {
    expect(
      resolveManagedListSelection({
        selectedId: "reg-b",
        registrationIds: ids,
        listReady: true,
        preserveSelectedId: false,
      })
    ).toBeUndefined();
  });

  it("prend le premier dossier si la sélection n’est plus dans la file", () => {
    expect(
      resolveManagedListSelection({
        selectedId: "missing",
        registrationIds: ids,
        listReady: true,
        preserveSelectedId: false,
      })
    ).toBe("reg-a");
  });

  it("sélectionne le premier dossier en l’absence d’id", () => {
    expect(
      resolveManagedListSelection({
        selectedId: null,
        registrationIds: ids,
        listReady: true,
        preserveSelectedId: false,
      })
    ).toBe("reg-a");
  });
});
