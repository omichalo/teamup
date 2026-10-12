import { computeCampPricingQuote } from "./pricing";
import type { CampSlot } from "./types";

const pricing = {
  memberDayCents: 2500,
  memberWeekCents: 10000,
  nonMemberDayCents: 3000,
  nonMemberWeekCents: 12000,
  session2hCents: 1000,
  twoSessionsSameDayCents: 1500,
};

function slot(partial: Partial<CampSlot> & Pick<CampSlot, "id" | "date">): CampSlot {
  return {
    campId: "c1",
    siteId: "s1",
    siteLabel: "Site",
    formulaId: "f1",
    formulaLabel: "Formule",
    startMinutes: 540,
    endMinutes: 720,
    label: "Matin",
    capacity: null,
    cancelled: false,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("computeCampPricingQuote", () => {
  it("facture des journées adhérent", () => {
    const quote = computeCampPricingQuote({
      pricing,
      isClubMember: true,
      pricingMode: "day_week",
      slots: [
        slot({ id: "a", date: "2026-10-19" }),
        slot({ id: "b", date: "2026-10-20" }),
      ],
      nowIso: "2026-10-01T00:00:00.000Z",
    });
    expect(quote.totalCents).toBe(5000);
    expect(quote.lines[0]?.kind).toBe("day");
  });

  it("applique le forfait semaine pour 5 jours", () => {
    const quote = computeCampPricingQuote({
      pricing,
      isClubMember: false,
      pricingMode: "day_week",
      slots: [1, 2, 3, 4, 5].map((d) =>
        slot({ id: `d${d}`, date: `2026-10-${20 + d}` })
      ),
      nowIso: "2026-10-01T00:00:00.000Z",
    });
    expect(quote.totalCents).toBe(12000);
    expect(quote.lines[0]?.kind).toBe("week");
  });

  it("facture sessions avec bundle 2 sessions", () => {
    const quote = computeCampPricingQuote({
      pricing,
      isClubMember: true,
      pricingMode: "session",
      slots: [
        slot({
          id: "m",
          date: "2026-10-19",
          startMinutes: 540,
          endMinutes: 720,
        }),
        slot({
          id: "a",
          date: "2026-10-19",
          startMinutes: 840,
          endMinutes: 1020,
        }),
      ],
      nowIso: "2026-10-01T00:00:00.000Z",
    });
    expect(quote.totalCents).toBe(1500);
    expect(quote.lines[0]?.kind).toBe("two_sessions");
  });
});
