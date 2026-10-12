import type { CampRegistration, CampSlot } from "./types";

export type CampStatsSummary = {
  registrationCount: number;
  paidCount: number;
  awaitingPaymentCount: number;
  cancelledCount: number;
  memberCount: number;
  nonMemberCount: number;
  invoicedCents: number;
  receivedCents: number;
  slotFill: Array<{
    slotId: string;
    label: string;
    date: string;
    enrolled: number;
    capacity: number | null;
  }>;
};

export function buildCampStatsSummary(params: {
  registrations: readonly CampRegistration[];
  slots: readonly CampSlot[];
}): CampStatsSummary {
  const active = params.registrations.filter((r) => r.status !== "cancelled");
  let receivedCents = 0;
  let invoicedCents = 0;
  for (const reg of active) {
    invoicedCents += reg.pricingQuote.totalCents;
    receivedCents += reg.payment.receivedPayments.reduce(
      (sum, p) => sum + p.amountCents,
      0
    );
  }

  const slotFill = params.slots
    .filter((s) => !s.cancelled)
    .map((slot) => ({
      slotId: slot.id,
      label: slot.label,
      date: slot.date,
      enrolled: active.filter((r) => r.slotIds.includes(slot.id)).length,
      capacity: slot.capacity,
    }))
    .sort((a, b) =>
      a.date === b.date ? a.label.localeCompare(b.label, "fr") : a.date.localeCompare(b.date)
    );

  return {
    registrationCount: active.length,
    paidCount: active.filter((r) => r.status === "paid").length,
    awaitingPaymentCount: active.filter(
      (r) => r.status === "awaiting_payment" || r.status === "partially_paid"
    ).length,
    cancelledCount: params.registrations.filter((r) => r.status === "cancelled").length,
    memberCount: active.filter((r) => r.isClubMember).length,
    nonMemberCount: active.filter((r) => !r.isClubMember).length,
    invoicedCents,
    receivedCents,
    slotFill,
  };
}
