"use client";

import { useMemo } from "react";
import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CHECK_PAYABLE_TO,
  MAX_PAYMENT_INSTALLMENTS,
  PAYMENT_METHOD_IDS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_NOTE_MAX_LENGTH,
  REMAINING_PAYMENT_METHOD_IDS,
  REMAINING_PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
  type RemainingPaymentMethodId,
} from "@/lib/club-registration/payment-constants";
import { calculatePaymentSummary } from "@/lib/club-registration/payment/calculate-payment-summary";
import { normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import { BNPL_ADHERENT_WIZARD_MESSAGE } from "@/lib/club-registration/payment/bnpl-checkout-copy";
import { formatCentsAsEuros } from "@/lib/pricing";
import type { RegistrationDraft } from "./registration-defaults";
import { usePricingQuote, type PricingBreakdownDraft } from "./PricingBreakdown";
import { VoluntaryDonationFields } from "./VoluntaryDonationFields";
import { EuroMonetaryInputField } from "./EuroMonetaryInputField";
import { resolveDonationPricing } from "@/lib/pricing/donation-discount";

type Props = {
  draft: RegistrationDraft;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

function installmentOptions() {
  return Array.from({ length: MAX_PAYMENT_INSTALLMENTS }, (_, i) => i + 1);
}

export function PaymentStep({ draft, onChange }: Props) {
  const quote = usePricingQuote(draft as PricingBreakdownDraft);

  const totalCents = quote?.totalCents ?? 0;
  const donationPricing = quote
    ? resolveDonationPricing(quote, draft.voluntaryDonationCents ?? 0)
    : null;
  const invoiceTotalCents = donationPricing?.invoiceTotalCents ?? totalCents;

  const summary = useMemo(
    () =>
      calculatePaymentSummary({
        totalAmountCents: invoiceTotalCents,
        aids: normalizePaymentAidList(draft.paymentAids),
        receivedPayments: [],
        currentPaymentStatus: "pending_validation",
      }),
    [invoiceTotalCents, draft.paymentAids]
  );

  const setPaymentMethod = (method: PaymentMethodId) => {
    onChange({
      paymentMethod: method,
      paymentInstallments:
        method === "cheque" ? draft.paymentInstallments || 1 : 1,
    });
  };

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        Indiquez comment vous souhaitez régler votre inscription. Les montants
        d&apos;aides ont été saisis à l&apos;étape dossier administratif ; le
        secrétariat vérifiera votre dossier avant validation définitive.
      </Typography>

      {!quote ? (
        <Alert severity="info" variant="outlined">
          Complétez les étapes précédentes pour voir le montant de votre inscription.
        </Alert>
      ) : (
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            bgcolor: "action.hover",
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="body2">
              Montant catalogue : <strong>{formatCentsAsEuros(totalCents)}</strong>
            </Typography>
            {donationPricing && donationPricing.voluntaryDonationCents > 0 ? (
              <>
                <Typography variant="body2">
                  Don :{" "}
                  <strong>
                    {formatCentsAsEuros(donationPricing.voluntaryDonationCents)}
                  </strong>
                </Typography>
                <Typography variant="body2">
                  Remise don :{" "}
                  <strong>−{formatCentsAsEuros(donationPricing.donationDiscountCents)}</strong>
                </Typography>
              </>
            ) : null}
            <Typography variant="body2">
              Aides déclarées :{" "}
              <strong>{formatCentsAsEuros(summary.assistanceTotalAmountCents)}</strong>
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              Reste à payer : {formatCentsAsEuros(summary.amountToPayCents)}
            </Typography>
          </Stack>
        </Box>
      )}

      {summary.aidsExceedTotal ? (
        <Alert severity="error" variant="outlined">
          Le total des aides dépasse le montant de l&apos;inscription. Ajustez les
          montants à l&apos;étape « Dossier administratif ».
        </Alert>
      ) : null}

      <VoluntaryDonationFields
        quote={quote}
        voluntaryDonationCents={draft.voluntaryDonationCents ?? 0}
        onChange={(voluntaryDonationCents) => onChange({ voluntaryDonationCents })}
      />

      <Stack spacing={1.5}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
          Mode de paiement
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Comment souhaitez-vous régler le reste à payer ?
        </Typography>
        <FormControl component="fieldset" data-field="paymentMethod">
          <RadioGroup
            value={draft.paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodId)}
          >
            {PAYMENT_METHOD_IDS.map((id) => (
              <FormControlLabel
                key={id}
                value={id}
                control={<Radio />}
                label={PAYMENT_METHOD_LABELS[id]}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Stack>

      {draft.paymentMethod === "cheque" && summary.amountToPayCents > 0 ? (
        <FormControl fullWidth data-field="paymentInstallments">
          <InputLabel id="payment-installments-label">
            Paiement en plusieurs fois
          </InputLabel>
          <Select
            labelId="payment-installments-label"
            label="Paiement en plusieurs fois"
            value={draft.paymentInstallments}
            onChange={(e) =>
              onChange({ paymentInstallments: Number(e.target.value) })
            }
          >
            {installmentOptions().map((n) => (
              <MenuItem key={n} value={n}>
                {n} chèque(s)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      {draft.paymentMethod === "card" ? (
        <Alert severity="info" variant="outlined">
          {summary.amountToPayCents <= 0
            ? "Aucun paiement n'est dû à ce stade. Le secrétariat validera votre dossier."
            : BNPL_ADHERENT_WIZARD_MESSAGE}
        </Alert>
      ) : null}

      {draft.paymentMethod === "cheque" ? (
        <Alert severity="info" variant="outlined">
          Merci d&apos;établir le ou les chèques à l&apos;ordre de{" "}
          <strong>{CHECK_PAYABLE_TO}</strong>. Indiquez le nom du joueur au dos de
          chaque chèque. Le secrétariat validera définitivement l&apos;inscription
          après réception du règlement.
        </Alert>
      ) : null}

      {draft.paymentMethod === "holiday_vouchers" ? (
        <Stack spacing={2}>
          <Alert severity="info" variant="outlined">
            Les chèques vacances peuvent couvrir tout ou partie du règlement. En cas
            de complément, le secrétariat vous indiquera la marche à suivre.
          </Alert>
          <EuroMonetaryInputField
            label="Montant prévu en chèques vacances"
            amountCents={draft.holidayVoucherAmountCents ?? 0}
            onCommitCents={(cents) =>
              onChange({ holidayVoucherAmountCents: cents > 0 ? cents : null })
            }
            fullWidth
            dataField="holidayVoucherAmountCents"
            endAdornment="€"
          />
          <FormControl fullWidth>
            <InputLabel id="remaining-payment-method-label">
              Complément prévu (si besoin)
            </InputLabel>
            <Select
              labelId="remaining-payment-method-label"
              label="Complément prévu (si besoin)"
              value={draft.remainingPaymentMethod}
              onChange={(e) =>
                onChange({
                  remainingPaymentMethod: e.target
                    .value as RemainingPaymentMethodId,
                })
              }
            >
              <MenuItem value="">
                <em>Non précisé</em>
              </MenuItem>
              {REMAINING_PAYMENT_METHOD_IDS.map((id) => (
                <MenuItem key={id} value={id}>
                  {REMAINING_PAYMENT_METHOD_LABELS[id]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      ) : null}

      {draft.paymentMethod === "other" ? (
        <TextField
          label="Précisez votre situation"
          value={draft.specialPaymentNote}
          onChange={(e) => onChange({ specialPaymentNote: e.target.value })}
          fullWidth
          required
          multiline
          minRows={3}
          inputProps={{ "data-field": "specialPaymentNote" }}
          helperText="Obligatoire pour un cas particulier."
        />
      ) : null}

      <TextField
        label="Message pour le secrétariat concernant votre paiement"
        value={draft.paymentNote}
        onChange={(e) => onChange({ paymentNote: e.target.value })}
        fullWidth
        multiline
        minRows={2}
        inputProps={{
          "data-field": "paymentNote",
          maxLength: PAYMENT_NOTE_MAX_LENGTH,
        }}
        helperText={`Facultatif — ${PAYMENT_NOTE_MAX_LENGTH} caractères maximum.`}
      />
    </Stack>
  );
}
