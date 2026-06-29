import { findRegistrationLicenseConflicts } from "./find-registration-license-conflicts";

function createLicenseConflictDb(
  resultsByField: Record<string, Array<{ id: string; data: Record<string, unknown> }>>
) {
  return {
    collection: () => ({
      where: (field: string) => ({
        limit: () => ({
          get: async () => ({
            docs: (resultsByField[field] ?? []).map((entry) => ({
              id: entry.id,
              data: () => entry.data,
            })),
          }),
        }),
      }),
    }),
  };
}

describe("findRegistrationLicenseConflicts", () => {
  it("bloque tout dossier non refusé partageant la même licence", async () => {
    const docs = [
      {
        id: "active-1",
        data: {
          status: "submitted",
          firstName: "A",
          lastName: "B",
        },
      },
      {
        id: "paid-1",
        data: {
          status: "paid",
          firstName: "C",
          lastName: "D",
        },
      },
      {
        id: "rejected-1",
        data: {
          status: "rejected",
          firstName: "E",
          lastName: "F",
        },
      },
    ];
    const db = createLicenseConflictDb({
      ffttLicense: docs,
      "ffttLicenseLookup.licence": [],
    });

    const result = await findRegistrationLicenseConflicts(db as never, "1234567");
    expect(result.blocking.map((c) => c.id)).toEqual(["active-1", "paid-1"]);
    expect(result.warnings).toHaveLength(0);
  });

  it("détecte les anciens dossiers où la licence est seulement dans le lookup", async () => {
    const db = createLicenseConflictDb({
      ffttLicense: [],
      "ffttLicenseLookup.licence": [
        {
          id: "legacy-1",
          data: {
            status: "approved",
            firstName: "Jean",
            lastName: "Dupont",
          },
        },
      ],
    });

    const result = await findRegistrationLicenseConflicts(db as never, "1234567");
    expect(result.blocking.map((c) => c.id)).toEqual(["legacy-1"]);
  });

  it("déduplique un dossier trouvé sur les deux champs", async () => {
    const doc = {
      id: "same",
      data: {
        status: "submitted",
        firstName: "A",
        lastName: "B",
      },
    };
    const db = createLicenseConflictDb({
      ffttLicense: [doc],
      "ffttLicenseLookup.licence": [doc],
    });

    const result = await findRegistrationLicenseConflicts(db as never, "1234567");
    expect(result.blocking).toHaveLength(1);
    expect(result.blocking[0]?.id).toBe("same");
  });

  it("ignore le dossier courant lors d'une édition", async () => {
    const doc = {
      id: "self",
      data: {
        status: "in_review",
        firstName: "A",
        lastName: "B",
      },
    };
    const db = createLicenseConflictDb({
      ffttLicense: [doc],
      "ffttLicenseLookup.licence": [doc],
    });

    const result = await findRegistrationLicenseConflicts(
      db as never,
      "1234567",
      "self"
    );
    expect(result.blocking).toHaveLength(0);
  });
});
