import { resolveDownloadFileName } from "./download-registration-payment-pdf";

describe("resolveDownloadFileName", () => {
  it("préfère filename= du Content-Disposition", () => {
    expect(
      resolveDownloadFileName(
        'attachment; filename="FAC-2026-2027-00042.pdf"',
        "fallback.pdf"
      )
    ).toBe("FAC-2026-2027-00042.pdf");
  });

  it("supporte filename*=UTF-8''", () => {
    expect(
      resolveDownloadFileName(
        "attachment; filename*=UTF-8''REC-2026-2027-00007.pdf",
        "fallback.pdf"
      )
    ).toBe("REC-2026-2027-00007.pdf");
  });

  it("retombe sur le fallback si header absent", () => {
    expect(resolveDownloadFileName(null, "fallback.pdf")).toBe("fallback.pdf");
  });
});
