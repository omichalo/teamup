import {
  createPaidOutOfBandInvoice,
  pickInvoiceDownloadUrl,
} from "./stripe";

const originalFetch = global.fetch;

function mockStripeFetch() {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

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

  it("crée, finalise et marque payée une facture Stripe hors ligne", async () => {
    const result = await createPaidOutOfBandInvoice({
      registrationId: "reg_1",
      customerEmail: "adherent@example.com",
      amountCents: 12000,
      description: "Adhésion SQY Ping — Ada Lovelace",
    });

    expect(result).toEqual({ invoiceId: "in_paid" });
    expect(global.fetch).toHaveBeenCalledTimes(5);
  });

  it("refuse un montant nul ou négatif", async () => {
    await expect(
      createPaidOutOfBandInvoice({
        registrationId: "reg_1",
        customerEmail: "adherent@example.com",
        amountCents: 0,
        description: "Adhésion SQY Ping — Ada Lovelace",
      })
    ).rejects.toThrow("Montant de facture invalide");
  });
});

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
