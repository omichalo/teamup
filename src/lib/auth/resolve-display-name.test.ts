import {
  fetchUserDisplayNames,
  pickDisplayName,
} from "@/lib/auth/resolve-display-name";

describe("pickDisplayName", () => {
  it("priorise le profil Firestore", () => {
    expect(
      pickDisplayName(
        { displayName: "  Alice Martin  " },
        { tokenName: "Bob", email: "bob@example.com" }
      )
    ).toBe("Alice Martin");
  });

  it("retombe sur le nom du token puis l'email", () => {
    expect(pickDisplayName(null, { tokenName: "Coach Dupont" })).toBe(
      "Coach Dupont"
    );
    expect(pickDisplayName(null, { email: "marie.durand@club.fr" })).toBe(
      "marie.durand"
    );
  });
});

describe("fetchUserDisplayNames", () => {
  it("retourne une map vide sans uid", async () => {
    const db = {
      collection: () => ({
        doc: () => ({}),
      }),
      getAll: async () => [],
    };

    const result = await fetchUserDisplayNames(db as never, []);
    expect(result.size).toBe(0);
  });
});
