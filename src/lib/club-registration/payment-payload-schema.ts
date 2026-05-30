import { z } from "zod";
import {
  MAX_PAYMENT_INSTALLMENTS,
  PAYMENT_AID_NOTE_MAX_LENGTH,
  PAYMENT_METHOD_IDS,
  PAYMENT_NOTE_MAX_LENGTH,
  REMAINING_PAYMENT_METHOD_IDS,
} from "./payment-constants";

export const paymentAidPayloadSchema = z.object({
  type: z.string().trim().min(1).max(80),
  label: z.string().trim().max(120),
  amountCents: z.number().int().min(0),
  reference: z.string().trim().max(80).optional(),
  note: z.string().trim().max(PAYMENT_AID_NOTE_MAX_LENGTH).optional(),
});

export const paymentPayloadFieldsSchema = {
  paymentMethod: z.enum(PAYMENT_METHOD_IDS),
  paymentInstallments: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAYMENT_INSTALLMENTS),
  paymentAids: z.array(paymentAidPayloadSchema).default([]),
  holidayVoucherAmountCents: z
    .union([z.number().int().min(0), z.null()])
    .optional(),
  remainingPaymentMethod: z
    .union([z.enum(REMAINING_PAYMENT_METHOD_IDS), z.literal(""), z.null()])
    .optional(),
  paymentNote: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().max(PAYMENT_NOTE_MAX_LENGTH).optional()
  ),
  specialPaymentNote: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().max(PAYMENT_NOTE_MAX_LENGTH).optional()
  ),
};

export function refinePaymentPayload(
  data: {
    paymentMethod: string;
    paymentInstallments: number;
    paymentAids: z.infer<typeof paymentAidPayloadSchema>[];
    specialPaymentNote?: string | undefined;
    reductionTypes: string[];
  },
  ctx: z.RefinementCtx,
  totalAmountCents: number
): void {
  const assistanceTotal = data.paymentAids.reduce(
    (acc, a) => acc + a.amountCents,
    0
  );

  if (assistanceTotal > totalAmountCents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Le total des aides déclarées ne peut pas dépasser le montant de l'inscription.",
      path: ["paymentAids"],
    });
  }

  if (data.paymentMethod === "card" || data.paymentMethod === "cheque") {
    if (
      data.paymentInstallments < 1 ||
      data.paymentInstallments > MAX_PAYMENT_INSTALLMENTS
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Indiquez un nombre de fois entre 1 et ${MAX_PAYMENT_INSTALLMENTS}.`,
        path: ["paymentInstallments"],
      });
    }
  }

  if (data.paymentMethod === "other") {
    if (!data.specialPaymentNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Précisez votre situation pour un cas particulier.",
        path: ["specialPaymentNote"],
      });
    }
  }

  for (const aid of data.paymentAids) {
    if (aid.type === "other" && aid.amountCents > 0 && !aid.note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indiquez un commentaire pour l'autre aide.",
        path: ["paymentAids"],
      });
    }
  }

  for (const reductionId of data.reductionTypes) {
    const entry = data.paymentAids.find((a) => a.type === reductionId);
    if (!entry || entry.amountCents <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Indiquez un montant supérieur à 0 € pour chaque aide sélectionnée.",
        path: ["paymentAids"],
      });
    }
  }
}
