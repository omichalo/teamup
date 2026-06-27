import { normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import type { PaymentAid, RegistrationPayment } from "@/lib/club-registration/payment/types";
import {
  resolveRegistrationPaymentAids,
  toEditableRegistration,
} from "./to-editable-registration";
import type { RegistrationDetail } from "./types";

describe("resolveRegistrationPaymentAids", () => {
  it("prefers top-level paymentAids when present", () => {
    const topLevel: PaymentAid[] = [
      { type: "pass_sport", label: "Pass Sport", amountCents: 5000 },
    ];
    const payment = {
      aids: [{ type: "other", label: "Autre", amountCents: 1000 }],
    } as RegistrationPayment;

    expect(
      resolveRegistrationPaymentAids({ paymentAids: topLevel }, payment)
    ).toEqual(normalizePaymentAidList(topLevel));
  });

  it("falls back to payment.aids after submit persist", () => {
    const payment = {
      aids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 5000 }],
    } as RegistrationPayment;

    expect(resolveRegistrationPaymentAids({}, payment)).toEqual(
      normalizePaymentAidList(payment.aids)
    );
  });

  it("returns empty list when no aids are stored", () => {
    expect(resolveRegistrationPaymentAids({}, null)).toEqual([]);
  });
});

describe("toEditableRegistration", () => {
  it("hydrates ffttLicense from lookup when top-level field is missing", () => {
    const registration: RegistrationDetail = {
      id: "r1",
      ffttLicenseLookup: { licence: "12345678", nomClub: "SQY Ping" },
    };

    const form = toEditableRegistration(registration, {
      sections: [],
      sites: [],
      competitions: [],
      competitionBundles: [],
      aidRules: [],
      jersey: { optionalPriceCents: 0 },
      uiCopy: { jerseySizes: ["S"] },
      stripePresentation: { lineItems: [] },
      version: 1,
    } as never,
    null);

    expect(form.ffttLicense).toBe("12345678");
    expect(form.ffttLicenseLookup).toEqual({
      licence: "12345678",
      nomClub: "SQY Ping",
    });
  });
});
