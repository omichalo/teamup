/** @jest-environment node */

import { isRegistrationCertificateAvailable } from "./availability";
import { buildRegistrationCertificateViewModel } from "./build-view-model";
import { buildRegistrationCertificatePdf } from "./build-pdf";
import {
  resolveCertificateCivility,
  resolveCertificateEnrolledParticiple,
} from "./civility";
import {
  resolvePrimaryPaymentMethodLabel,
  selectPrimaryReceivedPayment,
} from "./primary-payment-method";

const paidRegistration = {
  status: "paid",
  paymentStatus: "paid",
  paidAt: "2026-09-15T10:00:00.000Z",
  firstName: "Yannis",
  lastName: "Barget",
  sex: "male" as const,
  seasonLabel: "2026/2027",
  payment: {
    paymentMethod: "card",
    totalAmountCents: 27_400,
    assistanceTotalAmountCents: 0,
    amountToPayCents: 27_400,
    aids: [],
    paymentInstallments: 1,
    expectedPayments: [],
    receivedPayments: [
      {
        id: "p1",
        method: "cheque",
        label: "Chèque",
        amountCents: 7_400,
        receivedAt: "2026-09-10T10:00:00.000Z",
      },
      {
        id: "p2",
        method: "card",
        label: "CB",
        amountCents: 20_000,
        receivedAt: "2026-09-15T10:00:00.000Z",
      },
    ],
    paidAmountCents: 27_400,
    remainingAmountCents: 0,
    paymentStatus: "paid",
  },
};

describe("registration certificate civility", () => {
  it("choisit M. / Mme / M./Mme selon le sexe", () => {
    expect(resolveCertificateCivility("male")).toBe("M.");
    expect(resolveCertificateCivility("female")).toBe("Mme");
    expect(resolveCertificateCivility("other")).toBe("M./Mme");
    expect(resolveCertificateCivility(undefined)).toBe("M./Mme");
  });

  it("accorde le participe inscrit(e)", () => {
    expect(resolveCertificateEnrolledParticiple("female")).toBe("inscrite");
    expect(resolveCertificateEnrolledParticiple("male")).toBe("inscrit");
    expect(resolveCertificateEnrolledParticiple("other")).toBe("inscrit");
  });
});

describe("registration certificate primary payment method", () => {
  it("choisit le moyen au montant le plus élevé", () => {
    const primary = selectPrimaryReceivedPayment(
      paidRegistration.payment.receivedPayments
    );
    expect(primary?.id).toBe("p2");
    expect(resolvePrimaryPaymentMethodLabel(paidRegistration.payment.receivedPayments)).toBe(
      "Carte bancaire"
    );
  });

  it("en cas d'égalité de montant, prend le plus récent", () => {
    const primary = selectPrimaryReceivedPayment([
      {
        id: "a",
        method: "cheque",
        amountCents: 10_000,
        receivedAt: "2026-09-01T10:00:00.000Z",
      },
      {
        id: "b",
        method: "cash",
        amountCents: 10_000,
        receivedAt: "2026-09-20T10:00:00.000Z",
      },
    ]);
    expect(primary?.id).toBe("b");
  });

  it("repli sur le moyen déclaré du dossier s'il n'y a pas d'encaissement", () => {
    expect(
      resolvePrimaryPaymentMethodLabel([], { declaredPaymentMethod: "card" })
    ).toBe("Carte bancaire");
  });
});

describe("registration certificate availability", () => {
  it("est disponible pour un dossier soldé", () => {
    expect(isRegistrationCertificateAvailable(paidRegistration)).toBe(true);
  });

  it("n'est pas disponible si le reste dû est positif", () => {
    expect(
      isRegistrationCertificateAvailable({
        ...paidRegistration,
        paymentStatus: "partially_paid",
        payment: {
          ...paidRegistration.payment,
          paidAmountCents: 10_000,
          remainingAmountCents: 17_400,
          paymentStatus: "partially_paid",
        },
      })
    ).toBe(false);
  });

  it("n'est pas disponible si le dossier n'est pas payé", () => {
    expect(
      isRegistrationCertificateAvailable({
        status: "payment_requested",
        paymentStatus: "waiting_payment",
      })
    ).toBe(false);
  });
});

describe("registration certificate view model & pdf", () => {
  it("construit le view-model avec le moyen dominant et la date d'acquittement", () => {
    const vm = buildRegistrationCertificateViewModel("reg-1", paidRegistration, {
      now: new Date("2026-10-03T12:00:00.000Z"),
    });
    expect(vm).not.toBeNull();
    expect(vm?.adherentName).toContain("Yannis");
    expect(vm?.civilityLabel).toBe("M.");
    expect(vm?.enrolledParticiple).toBe("inscrit");
    expect(vm?.inscriptionAmountCents).toBe(27_400);
    expect(vm?.primaryPaymentMethodLabel).toBe("Carte bancaire");
    expect(vm?.settledAtLabel).toMatch(/2026/);
    expect(vm?.seasonLabel).toBe("2026/2027");
    expect(vm?.signatoryName).toContain("Salomé");
  });

  it("utilise Mme / inscrite pour une adhérente", () => {
    const vm = buildRegistrationCertificateViewModel("reg-f", {
      ...paidRegistration,
      firstName: "Sarah",
      lastName: "Barget",
      sex: "female",
    });
    expect(vm?.civilityLabel).toBe("Mme");
    expect(vm?.enrolledParticiple).toBe("inscrite");
  });

  it("génère un PDF d'une seule page", async () => {
    const vm = buildRegistrationCertificateViewModel("reg-1", paidRegistration, {
      now: new Date("2026-10-03T12:00:00.000Z"),
    });
    expect(vm).not.toBeNull();
    const pdf = await buildRegistrationCertificatePdf(vm!);
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 4).toString("ascii")).toBe("%PDF");
    const pageCount = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? [])
      .length;
    expect(pageCount).toBe(1);
  });
});
