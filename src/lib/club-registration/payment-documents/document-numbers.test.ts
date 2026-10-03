import { formatPaymentDocumentNumber } from "./document-numbers";

describe("formatPaymentDocumentNumber", () => {
  it("formate un n° séquentiel de saison", () => {
    expect(formatPaymentDocumentNumber("FAC", "2026-2027", 42)).toBe(
      "FAC-2026-2027-00042"
    );
    expect(formatPaymentDocumentNumber("REC", "2026-2027", 7)).toBe(
      "REC-2026-2027-00007"
    );
    expect(formatPaymentDocumentNumber("AVO", "2026-2027", 3)).toBe(
      "AVO-2026-2027-00003"
    );
    expect(formatPaymentDocumentNumber("AID", "2026-2027", 11)).toBe(
      "AID-2026-2027-00011"
    );
  });
});
