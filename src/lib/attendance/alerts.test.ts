import { attendanceAlertsFromRegistration } from "./alerts";

describe("attendance alerts", () => {
  it("signale paiement et certificat manquant", () => {
    expect(
      attendanceAlertsFromRegistration({
        status: "submitted",
        paymentStatus: "waiting_payment",
        medicalCertificateDeclaration: "adult_certificate_required",
        medicalCertificateStatus: "required_not_received",
        birthDate: "1990-01-01",
      })
    ).toEqual(["unpaid", "certificate"]);
  });

  it("signale unpaid malgré paidAt si un reliquat existe", () => {
    expect(
      attendanceAlertsFromRegistration({
        status: "payment_requested",
        paidAt: "2026-09-01T10:00:00.000Z",
        paymentStatus: "partially_paid",
        payment: {
          totalAmountCents: 25_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 25_000,
          aids: [],
          paymentMethod: "card",
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp1",
              method: "card",
              label: "CB",
              amountCents: 20_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
            },
          ],
          paidAmountCents: 20_000,
          remainingAmountCents: 5_000,
          paymentStatus: "partially_paid",
        },
      })
    ).toEqual(["unpaid"]);
  });

  it("n'alerte pas unpaid si remaining est à 0 même avec paymentStatus nested incohérent", () => {
    expect(
      attendanceAlertsFromRegistration({
        status: "payment_requested",
        paymentStatus: "waiting_payment",
        payment: {
          totalAmountCents: 20_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 20_000,
          aids: [],
          paymentMethod: "card",
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp1",
              method: "card",
              label: "CB",
              amountCents: 20_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
            },
          ],
          paidAmountCents: 20_000,
          remainingAmountCents: 0,
          paymentStatus: "waiting_payment",
        },
        medicalCertificateDeclaration: "under_40_all_no",
        ppsFollowUpStatus: "not_applicable",
        birthDate: "2015-01-01",
      })
    ).toEqual([]);
  });

  it("signale un PPS attendu", () => {
    expect(
      attendanceAlertsFromRegistration({
        status: "paid",
        paymentStatus: "paid",
        payment: {
          totalAmountCents: 20_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 20_000,
          aids: [],
          paymentMethod: "card",
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp1",
              method: "card",
              label: "CB",
              amountCents: 20_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
            },
          ],
          paidAmountCents: 20_000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
        medicalCertificateDeclaration: "adult_pps_declared",
        ppsFollowUpStatus: "expected",
        birthDate: "1990-01-01",
      })
    ).toEqual(["pps"]);
  });

  it("n'alerte pas un dossier soldé sans certificat requis", () => {
    expect(
      attendanceAlertsFromRegistration({
        status: "paid",
        paymentStatus: "paid",
        payment: {
          totalAmountCents: 20_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 20_000,
          aids: [],
          paymentMethod: "card",
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp1",
              method: "card",
              label: "CB",
              amountCents: 20_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
            },
          ],
          paidAmountCents: 20_000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
        medicalCertificateDeclaration: "under_40_all_no",
        ppsFollowUpStatus: "not_applicable",
        birthDate: "2015-01-01",
      })
    ).toEqual([]);
  });
});
