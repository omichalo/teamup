"use client";

import { Box, Stack, Typography } from "@mui/material";
import {
  findAidRuleById,
  getAidRuleFixedAmountCents,
  getAidRuleMaxAmountCents,
} from "@/lib/club-registration-config/aid-rules";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { formatCentsAsEuros } from "@/lib/pricing";
import { AidEuroAmountField } from "../AidEuroAmountField";
import {
  findPaymentAid,
  normalizePaymentAidList,
  upsertPaymentAid,
} from "@/lib/club-registration/payment/payment-draft-helpers";
import type { PaymentAid } from "@/lib/club-registration/payment/types";
import { getReductionReferenceCode } from "@/lib/club-registration/reduction-reference-codes";

type Props = {
  config: RegistrationConfigV1;
  reductionTypes: string[];
  reductionReferenceCodes: Record<string, string>;
  paymentAids: PaymentAid[];
  onPaymentAidsChange: (aids: PaymentAid[]) => void;
};

const AID_AMOUNT_FIELD_SX = {
  width: "100%",
  maxWidth: 220,
} as const;

function aidMaxAmountHelperText(ruleMaxCents: number | undefined): string | undefined {
  if (ruleMaxCents === undefined) return undefined;
  return `Montant maximum : ${formatCentsAsEuros(ruleMaxCents)}`;
}

export function SecretariatAidAmountFields({
  config,
  reductionTypes,
  reductionReferenceCodes,
  paymentAids,
  onPaymentAidsChange,
}: Props) {
  const normalizedAids = normalizePaymentAidList(paymentAids);
  const selectedRules = reductionTypes
    .map((id) => findAidRuleById(config, id))
    .filter((rule): rule is NonNullable<typeof rule> => rule !== undefined);

  if (selectedRules.length === 0) {
    return null;
  }

  const labelsByType = Object.fromEntries(config.aidRules.map((rule) => [rule.id, rule.label]));

  const updateAidAmount = (aidId: string, amountCents: number) => {
    const existing = findPaymentAid(normalizedAids, aidId);
    const reference = getReductionReferenceCode(reductionReferenceCodes, aidId);
    onPaymentAidsChange(
      upsertPaymentAid(
        normalizedAids,
        {
          type: aidId,
          label: labelsByType[aidId] ?? aidId,
          amountCents,
          ...(reference ? { reference } : {}),
          ...(existing?.note ? { note: existing.note } : {}),
        },
        { retainZero: true }
      )
    );
  };

  return (
    <Box sx={{ gridColumn: "1 / -1" }}>
      <Stack spacing={2}>
        <Typography variant="subtitle2" fontWeight={600}>
          Montants des aides
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ajustez le montant déclaré pour chaque aide cochée. Ces montants sont déduits du reste
          à payer estimé.
        </Typography>
        <Stack spacing={2}>
          {selectedRules.map((rule) => {
            const aid = findPaymentAid(normalizedAids, rule.id);
            const fixedAmountCents = getAidRuleFixedAmountCents(rule);
            const maxAmountCents = getAidRuleMaxAmountCents(rule);

            if (fixedAmountCents !== undefined) {
              return (
                <Typography
                  key={rule.id}
                  variant="body2"
                  data-field={`paymentAid.${rule.id}`}
                >
                  <strong>{rule.label}</strong> — montant fixe :{" "}
                  {formatCentsAsEuros(fixedAmountCents)}
                </Typography>
              );
            }

            const maxHelperText = aidMaxAmountHelperText(maxAmountCents);
            return (
              <AidEuroAmountField
                key={rule.id}
                label={`Montant (${rule.label})`}
                amountCents={aid?.amountCents ?? 0}
                onCommitCents={(cents) => updateAidAmount(rule.id, cents)}
                required
                sx={AID_AMOUNT_FIELD_SX}
                dataField={`paymentAid.${rule.id}`}
                {...(maxHelperText ? { helperText: maxHelperText } : {})}
              />
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}
