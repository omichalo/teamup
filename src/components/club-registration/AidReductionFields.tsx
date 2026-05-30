"use client";

import {
  Box,
  Checkbox,
  Collapse,
  FormControlLabel,
  FormGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  getCheckboxAidRules,
  getToggleAidRules,
  isToggleAidWithReferenceCode,
} from "@/lib/club-registration-config/aid-rules";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { AidEuroAmountField } from "./AidEuroAmountField";
import {
  findPaymentAid,
  normalizePaymentAidList,
  removePaymentAid,
  upsertPaymentAid,
} from "@/lib/club-registration/payment/payment-draft-helpers";
import {
  getReductionReferenceCode,
  reductionReferenceCodeFieldKey,
  setReductionReferenceCode,
} from "@/lib/club-registration/reduction-reference-codes";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  config: RegistrationConfigV1;
  draft: Pick<
    RegistrationDraft,
    "reductionTypes" | "reductionReferenceCodes" | "paymentAids"
  >;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

function aidLabelsByType(config: RegistrationConfigV1): Record<string, string> {
  return Object.fromEntries(config.aidRules.map((r) => [r.id, r.label]));
}

/** Largeur raisonnable pour un montant en € ; label toujours rétracté si valeur vide (0 €). */
const AID_AMOUNT_FIELD_SX = {
  width: "100%",
  maxWidth: 220,
} as const;

export function AidReductionFields({ config, draft, onChange }: Props) {
  const toggleAidRules = getToggleAidRules(config);
  const checkboxAidRules = getCheckboxAidRules(config);
  const labelsByType = aidLabelsByType(config);
  const paymentAids = normalizePaymentAidList(draft.paymentAids);

  const toggleReduction = (id: string, next: boolean) => {
    const set = new Set(draft.reductionTypes);
    if (next) {
      set.add(id);
      const reference = getReductionReferenceCode(draft.reductionReferenceCodes, id);
      onChange({
        reductionTypes: Array.from(set),
        paymentAids: upsertPaymentAid(
          paymentAids,
          {
            type: id,
            label: labelsByType[id] ?? id,
            amountCents: findPaymentAid(paymentAids, id)?.amountCents ?? 0,
            ...(reference ? { reference } : {}),
          },
          { retainZero: true }
        ),
      });
      return;
    }
    set.delete(id);
    onChange({
      reductionTypes: Array.from(set),
      reductionReferenceCodes: setReductionReferenceCode(
        draft.reductionReferenceCodes,
        id,
        ""
      ),
      paymentAids: removePaymentAid(paymentAids, id),
    });
  };

  const toggleReductionCheckbox = (id: string) => {
    const set = new Set(draft.reductionTypes);
    if (set.has(id)) {
      set.delete(id);
      onChange({
        reductionTypes: Array.from(set),
        paymentAids: removePaymentAid(paymentAids, id),
      });
      return;
    }
    set.add(id);
    onChange({
      reductionTypes: Array.from(set),
      paymentAids: upsertPaymentAid(
        paymentAids,
        {
          type: id,
          label: labelsByType[id] ?? id,
          amountCents: 0,
        },
        { retainZero: true }
      ),
    });
  };

  const updateReferenceCode = (aidId: string, value: string) => {
    const codes = setReductionReferenceCode(
      draft.reductionReferenceCodes,
      aidId,
      value
    );
    const trimmed = value.trim();
    const existing = findPaymentAid(paymentAids, aidId);
    onChange({
      reductionReferenceCodes: codes,
      paymentAids: upsertPaymentAid(
        paymentAids,
        {
          type: aidId,
          label: labelsByType[aidId] ?? aidId,
          amountCents: existing?.amountCents ?? 0,
          ...(trimmed ? { reference: trimmed } : {}),
          ...(existing?.note ? { note: existing.note } : {}),
        },
        { retainZero: true }
      ),
    });
  };

  const updateAidAmount = (aidId: string, amountCents: number) => {
    const existing = findPaymentAid(paymentAids, aidId);
    const reference = getReductionReferenceCode(draft.reductionReferenceCodes, aidId);
    onChange({
      paymentAids: upsertPaymentAid(
        paymentAids,
        {
          type: aidId,
          label: labelsByType[aidId] ?? aidId,
          amountCents,
          ...(reference ? { reference } : {}),
          ...(existing?.note ? { note: existing.note } : {}),
        },
        { retainZero: true }
      ),
    });
  };

  return (
    <>
      <Typography variant="body2" color="text.secondary">
        Cochez les aides dont vous bénéficiez et indiquez le montant pour chacune.
        Ces montants seront déduits du reste à payer à l&apos;étape suivante.
      </Typography>

      {toggleAidRules.map((rule) => {
        if (!isToggleAidWithReferenceCode(rule)) return null;
        const selected = draft.reductionTypes.includes(rule.id);
        const aid = findPaymentAid(paymentAids, rule.id);
        return (
          <Stack key={rule.id} spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={selected}
                  onChange={(e) => toggleReduction(rule.id, e.target.checked)}
                />
              }
              label={rule.form.toggleLabel}
            />
            <Collapse in={selected} timeout={{ enter: 300, exit: 200 }}>
              <Stack spacing={1.5} alignItems="flex-start">
                <TextField
                  label={rule.form.referenceCode.label}
                  value={getReductionReferenceCode(draft.reductionReferenceCodes, rule.id)}
                  onChange={(e) => updateReferenceCode(rule.id, e.target.value)}
                  fullWidth
                  inputProps={{
                    "data-field": reductionReferenceCodeFieldKey(rule.id),
                    maxLength: rule.form.referenceCode.maxLength ?? 80,
                  }}
                  helperText={rule.form.referenceCode.helperText}
                />
                <AidEuroAmountField
                  label={`Montant (${rule.label})`}
                  amountCents={aid?.amountCents ?? 0}
                  onCommitCents={(cents) => updateAidAmount(rule.id, cents)}
                  required
                  sx={AID_AMOUNT_FIELD_SX}
                  dataField={`paymentAid.${rule.id}`}
                />
              </Stack>
            </Collapse>
          </Stack>
        );
      })}

      {checkboxAidRules.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2" data-field="reductionTypes" tabIndex={-1}>
            {toggleAidRules.length > 0 ? "Autres aides et réductions" : "Aides et réductions"}
          </Typography>
          <FormGroup>
            {checkboxAidRules.map((rule) => {
              const selected = draft.reductionTypes.includes(rule.id);
              const aid = findPaymentAid(paymentAids, rule.id);
              return (
                <Stack key={rule.id} spacing={1} sx={{ mb: selected ? 1.5 : 0 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selected}
                        onChange={() => toggleReductionCheckbox(rule.id)}
                      />
                    }
                    label={rule.label}
                  />
                  {selected ? (
                    <Box sx={{ pl: 4 }}>
                      <AidEuroAmountField
                        label={`Montant (${rule.label})`}
                        amountCents={aid?.amountCents ?? 0}
                        onCommitCents={(cents) => updateAidAmount(rule.id, cents)}
                        required
                        sx={AID_AMOUNT_FIELD_SX}
                        dataField={`paymentAid.${rule.id}`}
                      />
                    </Box>
                  ) : null}
                </Stack>
              );
            })}
          </FormGroup>
        </Stack>
      ) : null}
    </>
  );
}
