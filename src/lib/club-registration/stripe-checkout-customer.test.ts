import { createMembershipCheckoutSession } from "./stripe";

const originalFetch = global.fetch;

function mockCheckoutCustomerFetch(options?: {
  existingCustomer?: { id: string; name?: string | null };
}) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.includes("/v1/customers?") && method === "GET") {
      return {
        ok: true,
        json: async () => ({
          data: options?.existingCustomer ? [options.existingCustomer] : [],
        }),
      } as Response;
    }

    if (url.endsWith("/v1/customers") && method === "POST") {
      return {
        ok: true,
        json: async () => ({ id: "cus_new" }),
      } as Response;
    }

    if (url.includes("/v1/customers/cus_existing") && method === "POST") {
      return {
        ok: true,
        json: async () => ({ id: "cus_existing" }),
      } as Response;
    }

    if (url.endsWith("/v1/checkout/sessions") && method === "POST") {
      const body = init?.body instanceof URLSearchParams ? init.body.toString() : "";
      return {
        ok: true,
        json: async () => ({
          id: "cs_test",
          url: "https://checkout.stripe.com/test",
          _body: body,
        }),
      } as Response;
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  }) as typeof fetch;
}

describe("createMembershipCheckoutSession — client Stripe", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_mock";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("crée un client avec nom puis lie la session Checkout", async () => {
    mockCheckoutCustomerFetch();

    await createMembershipCheckoutSession({
      registrationId: "reg_1",
      lineItems: [{ name: "Adhésion", amountCents: 27900 }],
      customerEmail: "adherent@example.com",
      customerName: "Olivier Michalowicz",
      invoiceDescription: "Adhésion SQY Ping — Olivier Michalowicz",
      catalogVersion: "v1",
      quoteHash: "abc",
      successUrl: "https://app.example/success",
      cancelUrl: "https://app.example/cancel",
    });

    const customerCreateCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url, init]: [string, RequestInit]) =>
        String(url).endsWith("/v1/customers") && init?.method === "POST"
    );
    expect(customerCreateCall).toBeDefined();
    const createBody = customerCreateCall![1].body as URLSearchParams;
    expect(createBody.get("email")).toBe("adherent@example.com");
    expect(createBody.get("name")).toBe("Olivier Michalowicz");

    const sessionCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url, init]: [string, RequestInit]) =>
        String(url).endsWith("/v1/checkout/sessions") && init?.method === "POST"
    );
    const sessionBody = sessionCall![1].body as URLSearchParams;
    expect(sessionBody.get("customer")).toBe("cus_new");
    expect(sessionBody.get("customer_email")).toBeNull();
  });

  it("réutilise un client existant et met à jour le nom si besoin", async () => {
    mockCheckoutCustomerFetch({ existingCustomer: { id: "cus_existing", name: null } });

    await createMembershipCheckoutSession({
      registrationId: "reg_2",
      lineItems: [{ name: "Adhésion", amountCents: 26400 }],
      customerEmail: "patrick@example.com",
      customerName: "Patrick Moingeon",
      invoiceDescription: "Adhésion SQY Ping — Patrick Moingeon",
      catalogVersion: "v1",
      quoteHash: "def",
      successUrl: "https://app.example/success",
      cancelUrl: "https://app.example/cancel",
    });

    const updateCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url, init]: [string, RequestInit]) =>
        String(url).includes("/v1/customers/cus_existing") && init?.method === "POST"
    );
    expect(updateCall).toBeDefined();
    const updateBody = updateCall![1].body as URLSearchParams;
    expect(updateBody.get("name")).toBe("Patrick Moingeon");

    const sessionCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url]: [string]) => String(url).endsWith("/v1/checkout/sessions")
    );
    const sessionBody = sessionCall![1].body as URLSearchParams;
    expect(sessionBody.get("customer")).toBe("cus_existing");
  });
});
