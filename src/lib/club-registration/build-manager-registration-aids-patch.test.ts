import { buildManagerRegistrationAidsPatch } from "./build-manager-registration-aids-patch";
import type { RegistrationPayment } from "./payment/types";

describe("buildManagerRegistrationAidsPatch", () => {
  const config = {
    aidRules: [
      { id: "pass_sport", label: "Pass Sport", effect: { type: "admin_review" as const } },
    ],
  } as const;

  it("persiste paymentAids et recalcule payment.aids", () => {
    const currentPayment: RegistrationPayment = {
      totalAmountCents: 10_000,
      assistanceTotalAmountCents: 2_000,
      amountToPayCents: 8_000,
      aids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 2_000 }],
      paymentMethod: "card",
      paymentInstallments: 1,
      expectedPayments: [],
      receivedPayments: [],
      paidAmountCents: 0,
      remainingAmountCents: 8_000,
      paymentStatus: "pending_validation",
    };

    const patch = buildManagerRegistrationAidsPatch(
      {
        reductionTypes: ["pass_sport"],
        reductionReferenceCodes: { pass_sport: "ABC1234567" },
        paymentAids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 3_000 }],
      },
      { payment: currentPayment },
      config as never,
      [{ type: "pass_sport", label: "Pass Sport", amountCents: 3_000 }]
    );

    expect(patch.paymentAids).toEqual([
      { type: "pass_sport", label: "Pass Sport", amountCents: 3_000 },
    ]);
    expect(patch.payment).toMatchObject({
      assistanceTotalAmountCents: 3_000,
      amountToPayCents: 7_000,
      remainingAmountCents: 7_000,
      aids: [
        {
          type: "pass_sport",
          label: "Pass Sport",
          amountCents: 3_000,
          reference: "ABC1234567",
        },
      ],
    });
  });
});
