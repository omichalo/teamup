import type { CampRegistration } from "@/lib/camps/types";
import type {
  LedgerCharge,
  LedgerPayment,
  MemberLedgerView,
} from "./types";

export function projectCampPaymentToLedger(
  registration: CampRegistration
): MemberLedgerView {
  const chargeId = `camp-charge-${registration.id}`;
  const paidSum = registration.payment.receivedPayments.reduce(
    (sum, p) => sum + p.amountCents,
    0
  );
  const total = registration.pricingQuote.totalCents;
  const status =
    registration.status === "cancelled"
      ? "voided"
      : paidSum >= total && total > 0
        ? "paid"
        : paidSum > 0
          ? "partially_paid"
          : "open";

  const charges: LedgerCharge[] = [
    {
      id: chargeId,
      kind: "camp",
      label: `Stage — ${registration.siteLabel}`,
      amountCents: total,
      currency: "EUR",
      status,
      occurredAt: registration.submittedAt,
      source: "manual",
      documentNumber: registration.payment.invoiceNumber ?? null,
    },
  ];

  const payments: LedgerPayment[] = registration.payment.receivedPayments.map(
    (p) => ({
      id: p.id,
      label: `Encaissement stage (${p.method})`,
      amountCents: p.amountCents,
      currency: "EUR" as const,
      method: p.method,
      paidAt: p.paidAt,
      reference: p.reference ?? null,
      source: p.stripeCheckoutSessionId ? ("stripe" as const) : ("manual" as const),
      allocatedToChargeIds: [chargeId],
      documentNumber: p.documentNumber ?? null,
    })
  );

  return {
    party: {
      registrationId: registration.clubRegistrationId ?? registration.id,
      seasonLabel: registration.submittedAt.slice(0, 4),
    },
    charges,
    payments,
    totals: {
      invoicedCents: total,
      receivedCents: paidSum,
      balanceCents: Math.max(0, total - paidSum),
    },
  };
}

export function mergeLedgerViews(
  ...views: MemberLedgerView[]
): MemberLedgerView {
  const base = views[0];
  if (!base) {
    return {
      party: { registrationId: "", seasonLabel: "" },
      charges: [],
      payments: [],
      totals: { invoicedCents: 0, receivedCents: 0, balanceCents: 0 },
    };
  }
  const charges = views.flatMap((v) => v.charges);
  const payments = views.flatMap((v) => v.payments);
  const invoicedCents = charges
    .filter((c) => c.status !== "voided")
    .reduce((sum, c) => sum + c.amountCents, 0);
  const receivedCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
  return {
    party: base.party,
    charges,
    payments,
    totals: {
      invoicedCents,
      receivedCents,
      balanceCents: Math.max(0, invoicedCents - receivedCents),
    },
  };
}
