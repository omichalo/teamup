import {
  createAccountingInvoiceId,
  parseAccountingInvoices,
  sumAccountingInvoicesNetCents,
} from "./accounting-invoice-parse";
import { ACCOUNTING_INVOICES_FIELD } from "./accounting-invoice-types";

describe("accounting invoice parse", () => {
  it("ignore les entrées invalides", () => {
    expect(
      parseAccountingInvoices({
        [ACCOUNTING_INVOICES_FIELD]: [
          null,
          { id: "x" },
          {
            id: "inv-1",
            kind: "invoice",
            documentNumber: "FAC-2026-2027-00001",
            label: "Facture",
            lines: [{ label: "Cotisation", amountCents: 20000 }],
            totalCents: 20000,
            issuedAt: "2026-09-01T10:00:00.000Z",
            quoteTotalAfterCents: 20000,
          },
        ],
      })
    ).toHaveLength(1);
  });

  it("somme nette FAC + complément − avoir", () => {
    const docs = parseAccountingInvoices({
      [ACCOUNTING_INVOICES_FIELD]: [
        {
          id: createAccountingInvoiceId(),
          kind: "invoice",
          documentNumber: "FAC-1",
          label: "Facture",
          lines: [],
          totalCents: 25000,
          issuedAt: "2026-09-01T10:00:00.000Z",
          quoteTotalAfterCents: 25000,
        },
        {
          id: createAccountingInvoiceId(),
          kind: "supplement",
          documentNumber: "FAC-2",
          label: "Complément",
          lines: [],
          totalCents: 5000,
          issuedAt: "2026-09-02T10:00:00.000Z",
          quoteTotalAfterCents: 30000,
        },
        {
          id: createAccountingInvoiceId(),
          kind: "credit_note",
          documentNumber: "AVO-1",
          label: "Avoir",
          lines: [],
          totalCents: -3000,
          issuedAt: "2026-09-03T10:00:00.000Z",
          quoteTotalAfterCents: 27000,
        },
      ],
    });
    expect(sumAccountingInvoicesNetCents(docs)).toBe(27000);
  });
});
