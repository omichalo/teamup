import {
  findRecentDuplicateRegistrationId,
  RECENT_DUPLICATE_WINDOW_MS,
} from "./create-registration-with-idempotency";

function makeQuerySnapshot(
  docs: Array<{ id: string; data: Record<string, unknown> }>
) {
  return {
    docs: docs.map((doc) => ({
      id: doc.id,
      data: () => doc.data,
    })),
  };
}

function makeDb(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    collection: () => ({
      where: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              get: async () => makeQuerySnapshot(docs),
            }),
          }),
        }),
      }),
    }),
  };
}

describe("findRecentDuplicateRegistrationId", () => {
  const identity = {
    firstName: "Théo",
    lastName: "Nosperger",
    birthDate: "2012-05-10",
  };

  it("retourne l'id d'un dossier identique récent", async () => {
    const db = makeDb([
      {
        id: "dup-1",
        data: {
          firstName: "Théo",
          lastName: "Nosperger",
          birthDate: "2012-05-10",
          status: "submitted",
        },
      },
    ]);

    const id = await findRecentDuplicateRegistrationId(
      db as never,
      "uid-parent",
      identity
    );
    expect(id).toBe("dup-1");
  });

  it("ignore un dossier refusé", async () => {
    const db = makeDb([
      {
        id: "rejected-1",
        data: {
          firstName: "Théo",
          lastName: "Nosperger",
          birthDate: "2012-05-10",
          status: "rejected",
        },
      },
    ]);

    const id = await findRecentDuplicateRegistrationId(
      db as never,
      "uid-parent",
      identity
    );
    expect(id).toBeNull();
  });

  it("expose une fenêtre de détection de 2 minutes", () => {
    expect(RECENT_DUPLICATE_WINDOW_MS).toBe(120_000);
  });
});
