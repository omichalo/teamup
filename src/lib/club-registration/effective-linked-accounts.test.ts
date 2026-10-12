import {
  effectiveLinkedAccountEmails,
  effectiveLinkedAccountUids,
  isLinkedAccountOwner,
} from "./effective-linked-accounts";

describe("effectiveLinkedAccountUids", () => {
  it("retombe sur submitterUid si linkedAccountUids absent", () => {
    expect(effectiveLinkedAccountUids({ submitterUid: "uid-a" })).toEqual(["uid-a"]);
  });

  it("utilise la liste exclusive quand le champ est présent", () => {
    expect(
      effectiveLinkedAccountUids({
        submitterUid: "staff",
        linkedAccountUids: ["member"],
      })
    ).toEqual(["member"]);
  });

  it("accepte une liste vide (aucun accès owner)", () => {
    expect(
      effectiveLinkedAccountUids({
        submitterUid: "staff",
        linkedAccountUids: [],
      })
    ).toEqual([]);
  });

  it("filtre les valeurs invalides", () => {
    expect(
      effectiveLinkedAccountUids({
        linkedAccountUids: ["ok", "", "  ", 42, null],
      })
    ).toEqual(["ok"]);
  });
});

describe("effectiveLinkedAccountEmails", () => {
  it("lit linkedAccountEmails quand présent", () => {
    expect(
      effectiveLinkedAccountEmails({
        linkedAccountEmails: ["a@ex.com"],
        submitterAccountEmail: "staff@club.fr",
      })
    ).toEqual(["a@ex.com"]);
  });

  it("legacy : e-mail soumettant si pas de linkedAccountUids", () => {
    expect(
      effectiveLinkedAccountEmails({
        submitterUid: "parent",
        submitterAccountEmail: "parent@ex.com",
      })
    ).toEqual(["parent@ex.com"]);
  });

  it("ne retombe pas sur le soumettant s'il n'est plus dans les comptes d'accès", () => {
    expect(
      effectiveLinkedAccountEmails({
        submitterUid: "staff",
        linkedAccountUids: ["member"],
        submitterAccountEmail: "staff@club.fr",
      })
    ).toEqual([]);
  });

  it("retombe sur l'e-mail soumettant si c'est encore le compte d'accès", () => {
    expect(
      effectiveLinkedAccountEmails({
        submitterUid: "player",
        linkedAccountUids: ["player"],
        linkedAccountEmails: [],
        submitterAccountEmail: "player@ex.com",
      })
    ).toEqual(["player@ex.com"]);
  });
});

describe("isLinkedAccountOwner", () => {
  it("autorise un uid présent dans la liste", () => {
    expect(isLinkedAccountOwner(["a", "b"], "b")).toBe(true);
    expect(isLinkedAccountOwner(["a"], "z")).toBe(false);
  });
});
