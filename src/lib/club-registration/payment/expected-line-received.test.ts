import { resolveExpectedLineReceivedCents } from "./expected-line-received";

describe("resolveExpectedLineReceivedCents", () => {
  it("retourne le montant encaissé rattaché à une échéance reçue", () => {
    expect(
      resolveExpectedLineReceivedCents(
        { id: "ep_1", status: "received" },
        [
          {
            expectedPaymentId: "ep_1",
            amountCents: 10_000,
          },
        ]
      )
    ).toBe(10_000);
  });

  it("ignore les échéances encore attendues", () => {
    expect(
      resolveExpectedLineReceivedCents(
        { id: "ep_1", status: "expected" },
        [{ expectedPaymentId: "ep_1", amountCents: 10_000 }]
      )
    ).toBeNull();
  });
});
