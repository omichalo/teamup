import { formatPaymentDocumentNumber } from "./document-numbers";

describe("formatPaymentDocumentNumber", () => {
  it("formate un n° séquentiel de saison", () => {
    expect(formatPaymentDocumentNumber("FAC", "2026-2027", 42)).toBe(
      "FAC-2026-2027-00042"
    );
    expect(formatPaymentDocumentNumber("REC", "2026-2027", 7)).toBe(
      "REC-2026-2027-00007"
    );
  });
});
