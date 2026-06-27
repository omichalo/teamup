import { describe, expect, it } from "@jest/globals";
import { collectSpreadsheetUserUids } from "./user-labels";

describe("collectSpreadsheetUserUids", () => {
  it("collecte les UID des champs utilisateur et du suivi paiement", () => {
    const uids = collectSpreadsheetUserUids([
      {
        id: "reg_1",
        paymentRequestedBy: "uid-a",
        payment: {
          receivedPayments: [
            {
              id: "p1",
              method: "cash",
              label: "Espèces",
              amountCents: 1000,
              receivedAt: "2026-01-01T00:00:00.000Z",
              recordedBy: "uid-b",
            },
          ],
        },
      },
    ]);

    expect(uids).toEqual(expect.arrayContaining(["uid-a", "uid-b"]));
  });
});
