import { buildManagerRegistrationAidsPatch, resolveManagerPaymentAidsUpdate } from "./build-manager-registration-aids-patch";
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

  it("régénère le chèque attendu après une remise exceptionnelle", () => {
    const currentPayment: RegistrationPayment = {
      totalAmountCents: 11_500,
      assistanceTotalAmountCents: 0,
      amountToPayCents: 11_500,
      aids: [],
      paymentMethod: "cheque",
      paymentInstallments: 1,
      expectedPayments: [
        {
          id: "ep_old",
          method: "cheque",
          label: "Chèque 1/1",
          expectedAmountCents: 11_500,
          status: "expected",
        },
      ],
      receivedPayments: [],
      paidAmountCents: 0,
      remainingAmountCents: 11_500,
      paymentStatus: "pending_validation",
    };

    const patch = buildManagerRegistrationAidsPatch(
      {
        reductionTypes: [],
        reductionReferenceCodes: {},
        paymentAids: [
          {
            type: "other",
            label: "Remise exceptionnelle",
            amountCents: 4_000,
            note: "Bonne raison",
          },
        ],
      },
      { payment: currentPayment },
      config as never,
      [
        {
          type: "other",
          label: "Remise exceptionnelle",
          amountCents: 4_000,
          note: "Bonne raison",
        },
      ]
    );

    const payment = patch.payment as RegistrationPayment;
    expect(payment.amountToPayCents).toBe(7_500);
    expect(payment.assistanceTotalAmountCents).toBe(4_000);
    expect(payment.expectedPayments).toHaveLength(1);
    expect(payment.expectedPayments[0]?.expectedAmountCents).toBe(7_500);
    expect(payment.expectedPayments[0]?.status).toBe("expected");
    expect(payment.expectedPayments[0]?.id).not.toBe("ep_old");
  });

  it("ne régénère pas les échéances déjà encaissées", () => {
    const currentPayment: RegistrationPayment = {
      totalAmountCents: 11_500,
      assistanceTotalAmountCents: 0,
      amountToPayCents: 11_500,
      aids: [],
      paymentMethod: "cheque",
      paymentInstallments: 1,
      expectedPayments: [
        {
          id: "ep_received",
          method: "cheque",
          label: "Chèque 1/1",
          expectedAmountCents: 11_500,
          status: "received",
        },
      ],
      receivedPayments: [
        {
          id: "rp_1",
          method: "cheque",
          label: "Chèque 1/1",
          amountCents: 11_500,
          receivedAt: "2026-07-01T00:00:00.000Z",
          expectedPaymentId: "ep_received",
        },
      ],
      paidAmountCents: 11_500,
      remainingAmountCents: 0,
      paymentStatus: "paid",
    };

    const patch = buildManagerRegistrationAidsPatch(
      {
        reductionTypes: [],
        reductionReferenceCodes: {},
        paymentAids: [
          {
            type: "other",
            label: "Remise exceptionnelle",
            amountCents: 4_000,
            note: "Trop tard",
          },
        ],
      },
      { payment: currentPayment },
      config as never,
      [
        {
          type: "other",
          label: "Remise exceptionnelle",
          amountCents: 4_000,
          note: "Trop tard",
        },
      ]
    );

    const payment = patch.payment as RegistrationPayment;
    expect(payment.expectedPayments[0]?.id).toBe("ep_received");
    expect(payment.expectedPayments[0]?.expectedAmountCents).toBe(11_500);
  });

  it("conserve la réception d'aide et approuve un dossier 0 € encore ouvert", () => {
    const currentPayment: RegistrationPayment = {
      totalAmountCents: 5_000,
      assistanceTotalAmountCents: 5_000,
      amountToPayCents: 0,
      aids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 5_000 }],
      paymentMethod: "card",
      paymentInstallments: 1,
      expectedPayments: [],
      receivedPayments: [],
      paidAmountCents: 0,
      remainingAmountCents: 0,
      paymentStatus: "paid",
    };

    const patch = buildManagerRegistrationAidsPatch(
      {
        reductionTypes: ["pass_sport"],
        reductionReferenceCodes: {},
        status: "in_review",
      },
      { payment: currentPayment, status: "in_review" },
      config as never,
      [
        {
          type: "pass_sport",
          label: "Pass Sport",
          amountCents: 5_000,
          received: true,
          receivedAt: "2026-08-17T10:00:00.000Z",
          receivedBy: "uid-sec",
        },
      ]
    );

    expect(patch.status).toBe("approved");
    expect(patch.paymentAids).toEqual([
      {
        type: "pass_sport",
        label: "Pass Sport",
        amountCents: 5_000,
        received: true,
        receivedAt: "2026-08-17T10:00:00.000Z",
        receivedBy: "uid-sec",
      },
    ]);
    expect(patch.payment).toMatchObject({
      aids: [
        {
          type: "pass_sport",
          amountCents: 5_000,
          received: true,
          receivedBy: "uid-sec",
        },
      ],
    });
  });

  it("ne change pas le statut d'un dossier déjà payé", () => {
    const currentPayment: RegistrationPayment = {
      totalAmountCents: 10_000,
      assistanceTotalAmountCents: 5_000,
      amountToPayCents: 5_000,
      aids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 5_000 }],
      paymentMethod: "card",
      paymentInstallments: 1,
      expectedPayments: [],
      receivedPayments: [
        {
          id: "rp_1",
          method: "card",
          label: "Carte",
          amountCents: 5_000,
          receivedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      paidAmountCents: 5_000,
      remainingAmountCents: 0,
      paymentStatus: "paid",
    };

    const patch = buildManagerRegistrationAidsPatch(
      {
        reductionTypes: ["pass_sport"],
        reductionReferenceCodes: {},
      },
      { payment: currentPayment, status: "paid" },
      config as never,
      [
        {
          type: "pass_sport",
          label: "Pass Sport",
          amountCents: 5_000,
          received: true,
          receivedAt: "2026-08-17T10:00:00.000Z",
          receivedBy: "uid-sec",
        },
      ]
    );

    expect(patch.status).toBeUndefined();
  });
});

describe("resolveManagerPaymentAidsUpdate", () => {
  const config = {
    aidRules: [
      { id: "pass_sport", label: "Pass Sport", effect: { type: "admin_review" as const } },
    ],
  } as const;

  it("pose receivedBy depuis l'acteur serveur, pas depuis le client", () => {
    const result = resolveManagerPaymentAidsUpdate(
      { reductionTypes: ["pass_sport"] },
      {
        reductionTypes: ["pass_sport"],
        paymentAids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 5_000 }],
      },
      [
        {
          type: "pass_sport",
          label: "Pass Sport",
          amountCents: 5_000,
          received: true,
        },
      ],
      config as never,
      { uid: "uid-server", at: "2026-08-17T12:00:00.000Z" }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patch.paymentAids).toEqual([
      {
        type: "pass_sport",
        label: "Pass Sport",
        amountCents: 5_000,
        received: true,
        receivedAt: "2026-08-17T12:00:00.000Z",
        receivedBy: "uid-server",
      },
    ]);
  });

  it("autorise la réception même si un montant déjà enregistré dépasse le plafond actuel", () => {
    const configWithMax = {
      aidRules: [
        { id: "pass_sport", label: "Pass Sport", effect: { type: "admin_review" as const } },
        {
          id: "pass_plus",
          label: "Pass Plus",
          effect: { type: "admin_review" as const },
          maxAmountCents: 5_000,
        },
      ],
    } as const;

    const result = resolveManagerPaymentAidsUpdate(
      { reductionTypes: ["pass_sport", "pass_plus"] },
      {
        reductionTypes: ["pass_sport", "pass_plus"],
        payment: {
          totalAmountCents: 20_000,
          assistanceTotalAmountCents: 11_000,
          amountToPayCents: 9_000,
          aids: [
            { type: "pass_sport", label: "Pass Sport", amountCents: 5_000 },
            { type: "pass_plus", label: "Pass Plus", amountCents: 6_000 },
          ],
          paymentMethod: "card",
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [],
          paidAmountCents: 0,
          remainingAmountCents: 9_000,
          paymentStatus: "pending_validation",
        },
      },
      [
        { type: "pass_sport", label: "Pass Sport", amountCents: 5_000, received: true },
        { type: "pass_plus", label: "Pass Plus", amountCents: 6_000, received: false },
      ],
      configWithMax as never,
      { uid: "uid-server", at: "2026-08-17T12:00:00.000Z" }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const patchedAids = result.patch.paymentAids as Array<{
      type: string;
      amountCents: number;
      received?: boolean;
      receivedBy?: string;
    }>;
    expect(patchedAids.find((aid) => aid.type === "pass_sport")).toMatchObject({
      received: true,
      receivedBy: "uid-server",
    });
    expect(patchedAids.find((aid) => aid.type === "pass_plus")).toMatchObject({
      amountCents: 6_000,
    });
    expect(patchedAids.find((aid) => aid.type === "pass_plus")?.received).toBeUndefined();
  });
});
