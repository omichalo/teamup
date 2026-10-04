import { SAGE_ACCOUNTS, SAGE_JOURNALS, SAGE_PIECE_MAX } from "./chart";
import { buildSageExportForRegistration } from "./build-sage-entries";
import { compactPieceNumber } from "./format-sage";
import { summarizeSageLines } from "./serialize";

function quoteLines() {
  return {
    catalogVersion: "test",
    segmentLabel: "Adulte",
    lines: [
      {
        id: "membership",
        kind: "membership",
        label: "Adhésion club",
        amountCents: 17_500,
        source: "catalog",
      },
      {
        id: "fftt_license",
        kind: "fftt_license",
        label: "Licence",
        amountCents: 4_500,
        source: "catalog",
      },
      {
        id: "family",
        kind: "discount_family",
        label: "Réduction — 2e adhérent",
        amountCents: -2_000,
        source: "catalog",
      },
      {
        id: "jersey",
        kind: "addon",
        label: "Maillot",
        amountCents: 1_500,
        source: "catalog",
      },
    ],
    subtotalCents: 23_500,
    totalCents: 21_500,
  };
}

function baseRegistration(): Record<string, unknown> {
  return {
    firstName: "Alice",
    lastName: "Martin",
    seasonLabel: "2026-2027",
    ffttLicense: "078101965",
    addressLine1: "1 rue du Ping",
    postalCode: "78180",
    city: "Montigny-le-Bretonneux",
    pricingQuote: quoteLines(),
    voluntaryDonationCents: 10_000,
    teamupInvoiceNumber: "FAC-2026-2027-00009",
    accountingInvoices: [
      {
        id: "inv1",
        kind: "invoice",
        documentNumber: "FAC-2026-2027-00009",
        label: "Facture d'adhésion",
        lines: [
          { label: "Adhésion club", amountCents: 17_500 },
          { label: "Licence", amountCents: 4_500 },
        ],
        totalCents: 29_000,
        issuedAt: "2026-09-15T08:00:00.000Z",
        quoteTotalAfterCents: 29_000,
      },
    ],
    payment: {
      paymentMethod: "card",
      totalAmountCents: 21_500,
      aids: [
        {
          type: "pass_sport",
          label: "Pass Sport",
          amountCents: 5_000,
          received: true,
          receivedAt: "2026-10-01T10:00:00.000Z",
          documentNumber: "AID-2026-2027-00003",
        },
      ],
      receivedPayments: [
        {
          id: "pay1",
          method: "card",
          label: "CB",
          amountCents: 17_500,
          receivedAt: "2026-09-20T08:00:00.000Z",
          documentNumber: "REC-2026-2027-00012",
        },
        {
          id: "pay2",
          method: "cheque",
          label: "Chèque",
          amountCents: 2_000,
          receivedAt: "2026-09-21T08:00:00.000Z",
          documentNumber: "REC-2026-2027-00013",
          reversedAt: "2026-09-22T08:00:00.000Z",
        },
      ],
      paymentStatus: "partially_paid",
    },
  };
}

function linesFor(result: ReturnType<typeof buildSageExportForRegistration>, piece: string) {
  return result.lines.filter((line) => line.piece === piece);
}

describe("export Sage", () => {
  it("compacte le numéro de pièce sous la limite Sage", () => {
    expect(compactPieceNumber("FAC-2026-2027-00009")).toBe("FAC262700009");
    expect(compactPieceNumber("FAC-2026-2027-00009").length).toBeLessThanOrEqual(SAGE_PIECE_MAX);
  });

  it("ventile cotisation, licence et don, et utilise le code auxiliaire figé", () => {
    const data = baseRegistration();
    data.sageAuxiliaryCode = "A000042";
    const result = buildSageExportForRegistration("reg-alice", data);
    expect(result.thirdParty?.code).toBe("A000042");
    expect(result.thirdParty?.licenseMissing).toBe(false);
    expect(result.thirdParty?.license).toBe("078101965");

    const invoice = linesFor(result, "FAC262700009");
    const byAccount = (account: string) =>
      invoice.filter((line) => line.account === account);

    expect(byAccount(SAGE_ACCOUNTS.client)[0]).toMatchObject({
      journal: SAGE_JOURNALS.sales,
      auxiliary: "A000042",
      debitCents: 29_000,
      creditCents: 0,
      date: "15/09/2026",
    });
    // 17500 - 2000 + 1500 - 2500 de remise don
    expect(byAccount(SAGE_ACCOUNTS.cotisation)[0]?.creditCents).toBe(14_500);
    expect(byAccount(SAGE_ACCOUNTS.ffttPayable)[0]?.creditCents).toBe(4_500);
    expect(byAccount(SAGE_ACCOUNTS.donation)[0]?.creditCents).toBe(10_000);
  });

  it("passe la carte au compte d'attente Stripe et le chèque aux chèques à encaisser", () => {
    const result = buildSageExportForRegistration("reg-alice", baseRegistration());
    const card = linesFor(result, "REC262700012");
    expect(card.find((line) => line.account === SAGE_ACCOUNTS.stripeClearing)).toMatchObject({
      journal: SAGE_JOURNALS.bank,
      debitCents: 17_500,
    });
    expect(card.find((line) => line.account === SAGE_ACCOUNTS.client)?.creditCents).toBe(17_500);

    const cheque = linesFor(result, "REC262700013");
    expect(cheque.find((line) => line.account === SAGE_ACCOUNTS.chequesToDeposit)?.debitCents).toBe(
      2_000
    );
    const reversal = linesFor(result, "XREC262700013");
    expect(reversal.find((line) => line.account === SAGE_ACCOUNTS.client)?.debitCents).toBe(2_000);
    expect(
      reversal.find((line) => line.account === SAGE_ACCOUNTS.chequesToDeposit)?.creditCents
    ).toBe(2_000);
  });

  it("comptabilise le Pass Sport reçu en 467, hors produit", () => {
    const result = buildSageExportForRegistration("reg-alice", baseRegistration());
    const aid = linesFor(result, "AID262700003");
    expect(aid.find((line) => line.account === SAGE_ACCOUNTS.aidPassSport)).toMatchObject({
      journal: SAGE_JOURNALS.general,
      debitCents: 5_000,
    });
    expect(aid.find((line) => line.account === SAGE_ACCOUNTS.client)?.creditCents).toBe(5_000);
    expect(aid.some((line) => line.account === SAGE_ACCOUNTS.cotisation)).toBe(false);
  });

  it("signale une remise exceptionnelle sans avoir comptable", () => {
    const data = baseRegistration();
    const payment = data.payment as { aids: unknown[] };
    payment.aids.push({
      type: "other",
      label: "Remise exceptionnelle",
      amountCents: 1_000,
    });
    const result = buildSageExportForRegistration("reg-alice", data);
    expect(result.anomalies.some((item) => item.code === "remise_exceptionnelle")).toBe(true);
    expect(
      result.lines.some(
        (line) => line.debitCents === 1_000 && line.account === SAGE_ACCOUNTS.cotisation
      )
    ).toBe(false);
  });

  it("ignore un encaissement annulé jamais numéroté", () => {
    const data = baseRegistration();
    const payment = data.payment as {
      receivedPayments: Array<Record<string, unknown>>;
    };
    payment.receivedPayments.push({
      id: "rev-legacy",
      method: "cheque",
      label: "Chèque",
      amountCents: 5_000,
      receivedAt: "2026-09-01T08:00:00.000Z",
      reversedAt: "2026-09-02T08:00:00.000Z",
    });
    const result = buildSageExportForRegistration("reg-alice", data);
    expect(result.anomalies.some((item) => item.code === "piece_manquante")).toBe(false);
    expect(
      result.lines.some(
        (line) =>
          line.account === SAGE_ACCOUNTS.chequesToDeposit && line.debitCents === 5_000
      )
    ).toBe(false);
  });

  it("reclasse SumUp et virement depuis un moyen other", () => {
    const data = baseRegistration();
    const payment = data.payment as {
      receivedPayments: Array<Record<string, unknown>>;
    };
    payment.receivedPayments = [
      {
        id: "sumup1",
        method: "other",
        label: "SUM UP",
        amountCents: 10_000,
        receivedAt: "2026-09-20T08:00:00.000Z",
        documentNumber: "REC-2026-2027-00090",
      },
      {
        id: "vir1",
        method: "other",
        label: "Virement",
        amountCents: 5_000,
        receivedAt: "2026-09-21T08:00:00.000Z",
        documentNumber: "REC-2026-2027-00091",
      },
    ];
    const result = buildSageExportForRegistration("reg-alice", data);
    expect(
      result.lines.find((line) => line.account === SAGE_ACCOUNTS.sumupClearing)?.debitCents
    ).toBe(10_000);
    expect(
      result.lines.find((line) => line.account === SAGE_ACCOUNTS.bankTransfer)?.debitCents
    ).toBe(5_000);
    expect(result.anomalies.filter((item) => item.code === "moyen_reclasse")).toHaveLength(2);
  });

  it("signale licence absente sans changer le code figé", () => {
    const data = baseRegistration();
    delete data.ffttLicense;
    data.sageAuxiliaryCode = "A000099";
    const result = buildSageExportForRegistration("abc123def456zzz", data);
    expect(result.thirdParty?.code).toBe("A000099");
    expect(result.thirdParty?.licenseMissing).toBe(true);
    expect(result.anomalies.some((item) => item.code === "licence_absente")).toBe(true);
    expect(result.anomalies.some((item) => item.code === "tiers_provisoire")).toBe(false);
  });

  it("repli legacy si le code n'est pas encore figé", () => {
    const data = baseRegistration();
    const result = buildSageExportForRegistration("reg-alice", data);
    expect(result.thirdParty?.code).toBe("C078101965");
    expect(result.anomalies.some((item) => item.code === "tiers_code_non_fige")).toBe(true);
  });

  it("contrepassse un avoir au 756", () => {
    const data = baseRegistration();
    const invoices = data.accountingInvoices as unknown[];
    invoices.push({
      id: "avo1",
      kind: "credit_note",
      documentNumber: "AVO-2026-2027-00002",
      label: "Avoir",
      lines: [{ label: "Avoir — ajustement tarifaire", amountCents: 1_000 }],
      totalCents: -1_000,
      issuedAt: "2026-09-25T08:00:00.000Z",
      quoteTotalAfterCents: 28_000,
    });
    const result = buildSageExportForRegistration("reg-alice", data);
    const credit = linesFor(result, "AVO262700002");
    expect(credit.find((line) => line.account === SAGE_ACCOUNTS.client)?.creditCents).toBe(1_000);
    expect(credit.find((line) => line.account === SAGE_ACCOUNTS.cotisation)?.debitCents).toBe(1_000);
  });

  it("équilibre chaque pièce", () => {
    const summary = summarizeSageLines(
      buildSageExportForRegistration("reg-alice", baseRegistration()).lines
    );
    expect(summary.balanced).toBe(true);
    expect(summary.debitCents).toBe(summary.creditCents);
  });
});
