import { pickInvoiceDownloadUrl } from "./stripe";

describe("pickInvoiceDownloadUrl", () => {
  it("préfère le PDF Stripe", () => {
    expect(
      pickInvoiceDownloadUrl({
        invoicePdf: "https://pay.stripe.com/pdf",
        hostedInvoiceUrl: "https://invoice.stripe.com/i",
      })
    ).toBe("https://pay.stripe.com/pdf");
  });

  it("retombe sur la page hébergée", () => {
    expect(
      pickInvoiceDownloadUrl({
        invoicePdf: null,
        hostedInvoiceUrl: "https://invoice.stripe.com/i",
      })
    ).toBe("https://invoice.stripe.com/i");
  });
});
