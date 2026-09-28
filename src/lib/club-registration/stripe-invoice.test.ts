import {
  createPaidOutOfBandInvoice,
  pickInvoiceDownloadUrl,
} from "./stripe";

const originalFetch = global.fetch;

function mockStripeFetch() {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/v1/customers?")) {
      return {
        ok: true,
        json: async () => ({ data: [] }),
      } as Response;
    }

    if (url.endsWith("/v1/customers")) {
      return {
        ok: true,
        json: async () => ({ id: "cus_test" }),
      } as Response;
    }

    if (url.endsWith("/v1/invoiceitems")) {
      return {
        ok: true,
        json: async () => ({ id: "ii_test" }),
      } as Response;
    }

    if (url.endsWith("/v1/invoices") && !url.includes("/finalize") && !url.includes("/pay")) {
      return {
        ok: true,
        json: async () => ({ id: "in_draft" }),
      } as Response;
    }

    if (url.endsWith("/v1/invoices/in_draft/finalize")) {
      return {
        ok: true,
        json: async () => ({ id: "in_final" }),
      } as Response;
    }

    if (url.endsWith("/v1/invoices/in_final/pay")) {
      return {
        ok: true,
        json: async () => ({ id: "in_paid" }),
      } as Response;
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as typeof fetch;
}

describe("createPaidOutOfBandInvoice", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_mock";
    mockStripeFetch();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("crée, finalise et marque payée une facture multi-lignes", async () => {
    const result = await createPaidOutOfBandInvoice({
      registrationId: "reg_1",
      customerEmail: "adherent@example.com",
      customerName: "Ada Lovelace",
      invoiceDescription: "Adhésion SQY Ping — Ada Lovelace",
      lineItems: [
        { name: "Adhésion club", amountCents: 10_000 },
        { name: "Licence", amountCents: 2_000 },
      ],
    });

    expect(result).toEqual({ invoiceId: "in_paid" });
    expect(global.fetch).toHaveBeenCalledTimes(7);

    const invoiceCreateCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url]: [RequestInfo]) =>
        String(url).endsWith("/v1/invoices") &&
        !String(url).includes("/finalize") &&
        !String(url).includes("/pay")
    );
    expect(invoiceCreateCall).toBeDefined();
    const body = String(invoiceCreateCall?.[1]?.body ?? "");
    expect(body).toContain("collection_method=send_invoice");
    expect(body).toContain("days_until_due=30");
  });

  it("applique plusieurs coupons de remise", async () => {
    const result = await createPaidOutOfBandInvoice({
      registrationId: "reg_1",
      customerEmail: "adherent@example.com",
      customerName: "Ada Lovelace",
      invoiceDescription: "Adhésion SQY Ping — Ada Lovelace",
      lineItems: [
        { name: "Adhésion club", amountCents: 10_000 },
        { name: "Don libre au club", amountCents: 4_000 },
      ],
      discountCouponIds: ["coupon_don", "coupon_pass_sport"],
    });

    expect(result).toEqual({ invoiceId: "in_paid" });
    expect(global.fetch).toHaveBeenCalledTimes(7);
  });

  it("refuse une facture sans lignes", async () => {
    await expect(
      createPaidOutOfBandInvoice({
        registrationId: "reg_1",
        customerEmail: "adherent@example.com",
        customerName: "Ada Lovelace",
        invoiceDescription: "Adhésion SQY Ping — Ada Lovelace",
        lineItems: [],
      })
    ).rejects.toThrow("Aucune ligne de facture");
  });
});

describe("pickInvoiceDownloadUrl", () => {
  it("préfère le PDF Stripe tant que la facture n'est pas payée", () => {
    expect(
      pickInvoiceDownloadUrl({
        invoicePdf: "https://pay.stripe.com/pdf",
        hostedInvoiceUrl: "https://invoice.stripe.com/i",
        status: "open",
        paid: false,
      })
    ).toBe("https://pay.stripe.com/pdf");
  });

  it("préfère la page hébergée lorsque la facture est payée", () => {
    expect(
      pickInvoiceDownloadUrl({
        invoicePdf: "https://pay.stripe.com/pdf",
        hostedInvoiceUrl: "https://invoice.stripe.com/i",
        status: "paid",
        paid: true,
      })
    ).toBe("https://invoice.stripe.com/i");
  });

  it("retombe sur la page hébergée", () => {
    expect(
      pickInvoiceDownloadUrl({
        invoicePdf: null,
        hostedInvoiceUrl: "https://invoice.stripe.com/i",
        status: "open",
        paid: false,
      })
    ).toBe("https://invoice.stripe.com/i");
  });
});
