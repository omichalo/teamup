import {
  applyManagerAidReceiptMetadata,
  getRegistrationPaymentAids,
  hasPendingAidReceipt,
  isAidReceiptPending,
  isCollectableAid,
  isAidReceiptOnlyChange,
  markAidReceived,
  matchesManagedAidReceiptFilter,
  resolveApprovedStatusAfterAidReceipt,
  resolveManagedListAidReceiptFilter,
  resolveZeroDueDossierStatus,
  sanitizePaymentAidsForFamilySubmit,
  ZERO_DUE_APPROVED_MESSAGE,
  ZERO_DUE_PENDING_AID_MESSAGE,
} from "./aid-receipt";
import type { PaymentAid } from "./types";

const passSport = (overrides: Partial<PaymentAid> = {}): PaymentAid => ({
  type: "pass_sport",
  label: "Pass Sport",
  amountCents: 5_000,
  ...overrides,
});

const exceptional = (overrides: Partial<PaymentAid> = {}): PaymentAid => ({
  type: "other",
  label: "Remise exceptionnelle",
  amountCents: 2_000,
  note: "Geste",
  ...overrides,
});

describe("aid-receipt", () => {
  it("ignore la remise exceptionnelle et les montants à 0", () => {
    expect(isCollectableAid(passSport())).toBe(true);
    expect(isCollectableAid(exceptional())).toBe(false);
    expect(isCollectableAid(passSport({ amountCents: 0 }))).toBe(false);
  });

  it("traite received absent comme en attente", () => {
    expect(isAidReceiptPending(passSport())).toBe(true);
    expect(isAidReceiptPending(passSport({ received: false }))).toBe(true);
    expect(isAidReceiptPending(passSport({ received: true }))).toBe(false);
    expect(isAidReceiptPending(exceptional())).toBe(false);
  });

  it("détecte une aide collectable en attente dans une liste", () => {
    expect(hasPendingAidReceipt([passSport(), exceptional()])).toBe(true);
    expect(hasPendingAidReceipt([passSport({ received: true }), exceptional()])).toBe(false);
    expect(hasPendingAidReceipt([exceptional()])).toBe(false);
  });

  it("filtre la liste secrétariat sur les aides en attente", () => {
    expect(resolveManagedListAidReceiptFilter(null)).toBe("all");
    expect(resolveManagedListAidReceiptFilter("pending")).toBe("pending");
    expect(
      matchesManagedAidReceiptFilter(
        { paymentAids: [passSport()] },
        "pending"
      )
    ).toBe(true);
    expect(
      matchesManagedAidReceiptFilter(
        { paymentAids: [passSport({ received: true })] },
        "pending"
      )
    ).toBe(false);
    expect(
      matchesManagedAidReceiptFilter({ paymentAids: [passSport()] }, "all")
    ).toBe(true);
  });

  it("retire received* à la soumission famille", () => {
    const sanitized = sanitizePaymentAidsForFamilySubmit([
      passSport({ received: true, receivedAt: "2026-08-01T00:00:00.000Z", receivedBy: "uid-1" }),
    ]);
    expect(sanitized[0]).toEqual({
      type: "pass_sport",
      label: "Pass Sport",
      amountCents: 5_000,
    });
  });

  it("pose receivedAt/receivedBy côté serveur et les conserve si déjà reçue", () => {
    const previous = [
      markAidReceived(passSport(), { uid: "secretary-1", at: "2026-08-01T10:00:00.000Z" }),
    ];
    const stamped = applyManagerAidReceiptMetadata(
      [passSport({ received: true })],
      previous,
      { uid: "secretary-2", at: "2026-08-17T10:00:00.000Z" }
    );
    expect(stamped[0]).toMatchObject({
      received: true,
      receivedBy: "secretary-1",
      receivedAt: "2026-08-01T10:00:00.000Z",
    });
  });

  it("efface la réception si on décoche", () => {
    const previous = [markAidReceived(passSport(), { uid: "sec", at: "2026-08-01T00:00:00.000Z" })];
    const stamped = applyManagerAidReceiptMetadata(
      [passSport({ received: false })],
      previous,
      { uid: "sec", at: "2026-08-17T00:00:00.000Z" }
    );
    expect(stamped[0]?.received).toBeUndefined();
    expect(stamped[0]?.receivedAt).toBeUndefined();
    expect(stamped[0]?.receivedBy).toBeUndefined();
  });

  it("ne ferme pas un dossier 0 € tant qu'une aide est en attente", () => {
    expect(resolveZeroDueDossierStatus([passSport()])).toEqual({
      status: "in_review",
      message: ZERO_DUE_PENDING_AID_MESSAGE,
    });
    expect(resolveZeroDueDossierStatus([passSport({ received: true })])).toEqual({
      status: "approved",
      message: ZERO_DUE_APPROVED_MESSAGE,
    });
  });

  it("approuve à la dernière réception si reste 0 et statut encore ouvert", () => {
    const received = [passSport({ received: true })];
    expect(
      resolveApprovedStatusAfterAidReceipt({
        currentStatus: "in_review",
        aids: received,
        amountToPayCents: 0,
      })
    ).toBe("approved");
    expect(
      resolveApprovedStatusAfterAidReceipt({
        currentStatus: "submitted",
        aids: received,
        amountToPayCents: 0,
      })
    ).toBe("approved");
    expect(
      resolveApprovedStatusAfterAidReceipt({
        currentStatus: "paid",
        aids: received,
        amountToPayCents: 0,
      })
    ).toBeNull();
    expect(
      resolveApprovedStatusAfterAidReceipt({
        currentStatus: "in_review",
        aids: [passSport()],
        amountToPayCents: 0,
      })
    ).toBeNull();
    expect(
      resolveApprovedStatusAfterAidReceipt({
        currentStatus: "in_review",
        aids: received,
        amountToPayCents: 1_000,
      })
    ).toBeNull();
  });

  it("lit les aides depuis paymentAids ou payment.aids", () => {
    expect(
      getRegistrationPaymentAids({
        paymentAids: [passSport()],
      })
    ).toEqual([passSport()]);
    expect(
      getRegistrationPaymentAids({
        payment: { aids: [passSport({ received: true })] },
      })[0]?.received
    ).toBe(true);
  });

  it("détecte un changement limité à la réception", () => {
    expect(
      isAidReceiptOnlyChange(
        [passSport({ received: true }), { type: "pass_plus", label: "Pass Plus", amountCents: 6_000 }],
        [passSport(), { type: "pass_plus", label: "Pass Plus", amountCents: 6_000 }]
      )
    ).toBe(true);
    expect(
      isAidReceiptOnlyChange(
        [passSport({ amountCents: 4_000, received: true })],
        [passSport()]
      )
    ).toBe(false);
  });
});
