import { calculateQuote } from "@/lib/pricing/calculate-quote";
import { isValidVoluntaryDonationCents } from "@/lib/pricing/donation-discount";
import {
  readVoluntaryDonationCents,
  resolveRegistrationDonationPricing,
} from "./resolve-registration-donation";

describe("resolve-registration-donation", () => {
  it("lit le don depuis le dossier Firestore", () => {
    expect(readVoluntaryDonationCents({ voluntaryDonationCents: 5000 })).toBe(5000);
    expect(readVoluntaryDonationCents({})).toBe(0);
    expect(readVoluntaryDonationCents({ voluntaryDonationCents: -1 })).toBe(0);
  });

  it("rejette un don invalide", () => {
    const quote = calculateQuote({
      birthDate: "2014-06-01",
      mainSectionId: "voisins",
      wantsCompetitorExtras: false,
      wantsOptionalJersey: false,
      competitionIds: [],
      familyRegistrationOrder: "none",
      sex: "male",
    });
    expect(() =>
      resolveRegistrationDonationPricing(quote, { voluntaryDonationCents: 50 })
    ).toThrow("Montant de don invalide");
    expect(isValidVoluntaryDonationCents(50)).toBe(false);
  });
});
