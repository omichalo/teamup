"use client";

import type { ComponentType } from "react";
import type { RegistrationDraft } from "./registration-defaults";
import { calculatePaymentSummary } from "@/lib/club-registration/payment/calculate-payment-summary";
import { normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import {
  PAYMENT_METHOD_LABELS,
  REMAINING_PAYMENT_METHOD_LABELS,
} from "@/lib/club-registration/payment-constants";
import type { RegistrationStepId } from "@/lib/club-registration/field-to-step";
import { formatCentsAsEuros, type PriceQuote } from "@/lib/pricing";

type Field = { label: string; value: string };

type Props = {
  draft: RegistrationDraft;
  quote: PriceQuote | null;
  onEditStep: (stepId: RegistrationStepId) => void;
  RecapBlock: ComponentType<{
    title: string;
    onEdit: () => void;
    fields: Field[];
  }>;
};

export function buildRecapPaymentFields(
  draft: RegistrationDraft,
  quote: PriceQuote | null
): Field[] {
  const paymentSummary =
    quote != null
      ? calculatePaymentSummary({
          totalAmountCents: quote.totalCents,
          aids: normalizePaymentAidList(draft.paymentAids),
          receivedPayments: [],
        })
      : null;

  return [
    {
      label: "Montant total",
      value: quote ? formatCentsAsEuros(quote.totalCents) : "—",
    },
    {
      label: "Aides déclarées",
      value: paymentSummary
        ? formatCentsAsEuros(paymentSummary.assistanceTotalAmountCents)
        : "—",
    },
    {
      label: "Reste à payer",
      value: paymentSummary
        ? formatCentsAsEuros(paymentSummary.amountToPayCents)
        : "—",
    },
    {
      label: "Mode de paiement",
      value:
        draft.paymentMethod !== ""
          ? PAYMENT_METHOD_LABELS[draft.paymentMethod]
          : "—",
    },
    ...(draft.paymentMethod === "card" || draft.paymentMethod === "cheque"
      ? [{ label: "Nombre de fois", value: String(draft.paymentInstallments) }]
      : []),
    ...(draft.paymentMethod === "holiday_vouchers" && draft.holidayVoucherAmountCents
      ? [
          {
            label: "Chèques vacances (prévu)",
            value: formatCentsAsEuros(draft.holidayVoucherAmountCents),
          },
          ...(draft.remainingPaymentMethod
            ? [
                {
                  label: "Complément prévu",
                  value:
                    REMAINING_PAYMENT_METHOD_LABELS[draft.remainingPaymentMethod],
                },
              ]
            : []),
        ]
      : []),
    ...((draft.paymentNote ?? "").trim()
      ? [{ label: "Message paiement", value: (draft.paymentNote ?? "").trim() }]
      : []),
    ...((draft.specialPaymentNote ?? "").trim()
      ? [{ label: "Cas particulier", value: (draft.specialPaymentNote ?? "").trim() }]
      : []),
  ];
}

export function RecapPaymentBlock({ draft, quote, onEditStep, RecapBlock }: Props) {
  return (
    <RecapBlock
      title="Paiement"
      onEdit={() => onEditStep("payment")}
      fields={buildRecapPaymentFields(draft, quote)}
    />
  );
}
