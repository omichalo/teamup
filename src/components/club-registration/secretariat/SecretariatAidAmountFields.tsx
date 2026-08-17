"use client";

import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
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
import { isCollectableAid, pickAidReceiptFields } from "@/lib/club-registration/payment/aid-receipt";
import type { PaymentAid } from "@/lib/club-registration/payment/types";
import { getReductionReferenceCode } from "@/lib/club-registration/reduction-reference-codes";
import { SecretariatExceptionalDiscountFields } from "./SecretariatExceptionalDiscountFields";

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

function AidReceiptStatusChip({ aid }: { aid: PaymentAid | undefined }) {
  if (!aid || !isCollectableAid(aid)) {
    return null;
  }
  const received = aid.received === true;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={received ? "success" : "warning"}
      label={received ? "Reçue" : "En attente de réception"}
    />
  );
}

function FixedAidAmountRow({
  ruleLabel,
  ruleId,
  fixedAmountCents,
  dossierAmountCents,
  onApplyFixedAmount,
}: {
  ruleLabel: string;
  ruleId: string;
  fixedAmountCents: number;
  dossierAmountCents: number;
  onApplyFixedAmount: () => void;
}) {
  const hasMismatch = dossierAmountCents !== fixedAmountCents;

  return (
    <Stack spacing={1} data-field={`paymentAid.${ruleId}`}>
      <Typography variant="body2">
        <strong>{ruleLabel}</strong> — montant fixe paramétré :{" "}
        {formatCentsAsEuros(fixedAmountCents)}
      </Typography>
      {hasMismatch ? (
        <Alert
          severity="warning"
          variant="outlined"
          action={
            <Button color="inherit" size="small" onClick={onApplyFixedAmount}>
              Appliquer le montant fixe
            </Button>
          }
        >
          Le dossier indique {formatCentsAsEuros(dossierAmountCents)} pour cette aide, alors que
          le paramétrage impose {formatCentsAsEuros(fixedAmountCents)}. L&apos;enregistrement
          sera refusé tant que les montants ne correspondent pas.
        </Alert>
      ) : null}
    </Stack>
  );
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
          ...(existing ? pickAidReceiptFields(existing) : {}),
        },
        { retainZero: true }
      )
    );
  };

  return (
    <Box sx={{ gridColumn: "1 / -1" }}>
      <Stack spacing={3}>
        {selectedRules.length > 0 ? (
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={600}>
              Montants des aides
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ajustez le montant déclaré pour chaque aide cochée. Ces montants sont déduits du
              reste à payer estimé. Pour cocher qu&apos;une aide a bien été reçue, utilisez le
              suivi du paiement plus bas (enregistrement immédiat).
            </Typography>
            <Stack spacing={2}>
              {selectedRules.map((rule) => {
                const aid = findPaymentAid(normalizedAids, rule.id);
                const fixedAmountCents = getAidRuleFixedAmountCents(rule);
                const maxAmountCents = getAidRuleMaxAmountCents(rule);

                if (fixedAmountCents !== undefined) {
                  return (
                    <Stack key={rule.id} spacing={0.75}>
                      <FixedAidAmountRow
                        ruleId={rule.id}
                        ruleLabel={rule.label}
                        fixedAmountCents={fixedAmountCents}
                        dossierAmountCents={aid?.amountCents ?? 0}
                        onApplyFixedAmount={() => updateAidAmount(rule.id, fixedAmountCents)}
                      />
                      <AidReceiptStatusChip aid={aid} />
                    </Stack>
                  );
                }

                const maxHelperText = aidMaxAmountHelperText(maxAmountCents);
                return (
                  <Stack key={rule.id} spacing={0.75}>
                    <AidEuroAmountField
                      label={`Montant (${rule.label})`}
                      amountCents={aid?.amountCents ?? 0}
                      onCommitCents={(cents) => updateAidAmount(rule.id, cents)}
                      required
                      sx={AID_AMOUNT_FIELD_SX}
                      dataField={`paymentAid.${rule.id}`}
                      {...(maxHelperText ? { helperText: maxHelperText } : {})}
                    />
                    <AidReceiptStatusChip aid={aid} />
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        ) : null}

        <SecretariatExceptionalDiscountFields
          paymentAids={paymentAids}
          onPaymentAidsChange={onPaymentAidsChange}
        />
      </Stack>
    </Box>
  );
}
