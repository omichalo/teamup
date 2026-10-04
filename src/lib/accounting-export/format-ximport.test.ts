import { SAGE_ACCOUNTS, SAGE_JOURNALS } from "./chart";
import {
  XIMPORT_RECORD_LENGTH,
  sageLinesToXImportTxt,
} from "./format-ximport";
import type { SageEntryLine } from "./types";

function line(partial: Partial<SageEntryLine> & Pick<SageEntryLine, "piece" | "account">): SageEntryLine {
  return {
    journal: SAGE_JOURNALS.sales,
    date: "15/09/2026",
    sortDate: "20260915",
    auxiliary: "",
    label: "Alice MARTIN — Cotisation 2026-2027",
    debitCents: 0,
    creditCents: 0,
    teamupDocumentNumber: "FAC-2026-2027-00009",
    registrationId: "reg1",
    adherentName: "Alice MARTIN",
    seasonLabel: "2026-2027",
    ...partial,
  };
}

describe("sageLinesToXImportTxt", () => {
  it("produit des lignes de largeur fixe et un mouvement partagé par pièce", () => {
    const rows = sageLinesToXImportTxt([
      line({
        piece: "FAC262700009",
        account: SAGE_ACCOUNTS.client,
        auxiliary: "C078101965",
        debitCents: 29_000,
        creditCents: 0,
      }),
      line({
        piece: "FAC262700009",
        account: SAGE_ACCOUNTS.cotisation,
        creditCents: 29_000,
        label: "Cotisations",
      }),
      line({
        journal: SAGE_JOURNALS.bank,
        piece: "REC262700001",
        account: SAGE_ACCOUNTS.stripeClearing,
        debitCents: 10_000,
        sortDate: "20260920",
        date: "20/09/2026",
        label: "Encaissement CB",
        teamupDocumentNumber: "REC-2026-2027-00001",
      }),
      line({
        journal: SAGE_JOURNALS.bank,
        piece: "REC262700001",
        account: SAGE_ACCOUNTS.client,
        auxiliary: "C078101965",
        creditCents: 10_000,
        sortDate: "20260920",
        date: "20/09/2026",
        label: "Encaissement CB",
        teamupDocumentNumber: "REC-2026-2027-00001",
      }),
    ]).trimEnd().split("\r\n");

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.length === XIMPORT_RECORD_LENGTH)).toBe(true);
    expect(rows[0]?.slice(0, 5)).toBe("    1");
    expect(rows[1]?.slice(0, 5)).toBe("    1");
    expect(rows[2]?.slice(0, 5)).toBe("    2");
    expect(rows[0]?.slice(5, 7)).toBe("VE");
    expect(rows[0]?.slice(7, 15)).toBe("20260915");
    expect(rows[0]?.slice(35, 46)).toBe("C078101965 ");
    expect(rows[0]?.endsWith("E")).toBe(true);
    expect(rows[0]?.slice(84, 85)).toBe("D");
    expect(rows[1]?.slice(84, 85)).toBe("C");
  });

  it("tronque pièce et libellé aux largeurs XImport", () => {
    const row = sageLinesToXImportTxt([
      line({
        piece: "XREC262700013",
        account: SAGE_ACCOUNTS.client,
        auxiliary: "PABC123DEF456",
        debitCents: 1_500,
        label: "Annulation encaissement très long pour Alice MARTIN",
      }),
    ]).trimEnd();

    expect(row.length).toBe(XIMPORT_RECORD_LENGTH);
    expect(row.slice(23, 35)).toBe("XREC26270001");
    expect(row.slice(35, 46)).toBe("PABC123DEF4");
    expect(row.slice(46, 71)).toBe("Annulation encaissement t");
  });
});
