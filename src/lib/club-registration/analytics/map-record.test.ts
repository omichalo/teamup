import {
  mapDocToAnalyticsRecord,
  resolveAnalyticsFfttCategorie,
} from "./map-record";

describe("resolveAnalyticsFfttCategorie", () => {
  it("lit la catégorie du lookup persisté", () => {
    expect(
      resolveAnalyticsFfttCategorie({
        ffttLicenseLookup: { licence: "1234567", categorie: "Sénior" },
      })
    ).toBe("Sénior");
  });

  it("complète depuis le miroir joueur quand le numéro est saisi sans lookup", () => {
    expect(
      resolveAnalyticsFfttCategorie(
        { ffttLicense: "78101965" },
        {
          licence: "78101965",
          listedInClub: true,
          isTemporary: false,
          categorie: "P",
          typeLicence: null,
        }
      )
    ).toBe("P");
  });

  it("préfère le miroir joueur au lookup persisté sans catégorie", () => {
    expect(
      resolveAnalyticsFfttCategorie(
        { ffttLicenseLookup: { licence: "1" } },
        {
          licence: "1",
          listedInClub: true,
          isTemporary: false,
          categorie: "Sénior",
          typeLicence: null,
        }
      )
    ).toBe("Sénior");
  });

  it("conserve la catégorie du lookup quand le miroir n'en fournit pas", () => {
    expect(
      resolveAnalyticsFfttCategorie(
        { ffttLicenseLookup: { licence: "1", categorie: "Cadet" } },
        {
          licence: "1",
          listedInClub: true,
          isTemporary: false,
          typeLicence: null,
        }
      )
    ).toBe("Cadet");
  });

  it("retombe sur le champ dérivé ffttCategorie", () => {
    expect(resolveAnalyticsFfttCategorie({ ffttCategorie: "Minime" })).toBe("Minime");
  });
});

describe("mapDocToAnalyticsRecord", () => {
  it("expose la catégorie FFTT hydratée depuis le miroir", () => {
    const record = mapDocToAnalyticsRecord(
      {
        ffttLicense: "78101965",
        wasSqyMemberLastYear: true,
      },
      {
        ffttMirror: {
          licence: "78101965",
          listedInClub: true,
          isTemporary: false,
          categorie: "P",
          typeLicence: null,
        },
      }
    );

    expect(record.ffttCategorie).toBe("P");
    expect(record.wasSqyMemberLastYear).toBe(true);
  });

  it("mappe créneaux, suivi et montants anonymisés", () => {
    const record = mapDocToAnalyticsRecord({
      slotIds: ["slot-1"],
      schoolPickupSlotIds: ["slot-1"],
      competitionIds: ["criterium_federal_jeunes"],
      wantsCompetitorExtras: true,
      jerseyFollowUpStatus: "to_do",
      pricingQuote: { totalCents: 22000 },
      voluntaryDonationCents: 500,
      paymentAids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 7000, received: false }],
      paymentMethod: "card",
      paymentStatus: "waiting_payment",
    });

    expect(record.slotIds).toEqual(["slot-1"]);
    expect(record.schoolPickupSlotIds).toEqual(["slot-1"]);
    expect(record.competitionIds).toEqual(["criterium_federal_jeunes"]);
    expect(record.jerseyFollowUpStatus).toBe("to_do");
    expect(record.criteriumFederalRegistrationStatus).toBe("to_do");
    expect(record.quoteTotalCents).toBe(22000);
    expect(record.voluntaryDonationCents).toBe(500);
    expect(record.paymentMethod).toBe("card");
    expect(record.paymentStatus).toBe("waiting_payment");
    expect(record.paymentAids?.[0]?.pendingReceipt).toBe(true);
    expect(record.paymentAidTypes).toEqual(["pass_sport"]);
  });
});
