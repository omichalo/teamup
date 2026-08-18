"use client";

import {
  Alert,
  Button,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Euro as EuroIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import {
  BNPL_SECRETARIAT_ALERT,
  CHECKOUT_LINK_VALIDITY_NOTICE,
  SECRETARIAT_SELF_SERVICE_HINT,
  SECRETARIAT_SEND_ONLINE_PAYMENT_BUTTON,
  SECRETARIAT_SEND_ONLINE_PAYMENT_TOOLTIP,
} from "@/lib/club-registration/payment/bnpl-checkout-copy";
import { resolveSecretariatPaymentCta } from "@/lib/club-registration/payment/secretariat-payment-action";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
} from "@/lib/club-registration/payment-constants";

type Props = {
  amountEuros: string;
  reviewNotes: string;
  onAmountEurosChange: (value: string) => void;
  onReviewNotesChange: (value: string) => void;
  registrationStatus?: string | null;
  paymentRequestedAt?: string | null;
  paymentAmountCents?: number | null;
  paymentEmailSentTo?: string | null | undefined;
  paymentMethod?: PaymentMethodId | null | undefined;
  remainingAmountCents?: number | null;
  paymentSettled?: boolean;
  saving: boolean;
  requestingPayment: boolean;
  persistingQuote: boolean;
  onSave: () => void | Promise<void>;
  onRequestPayment: () => void | Promise<void>;
  onRequestOnlinePayment?: () => void | Promise<void>;
};

const tooltipEnterProps = { enterDelay: 400, enterNextDelay: 400 } as const;

function formatPaymentRequestedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function formatAmountCents(cents: number | null | undefined): string | null {
  if (typeof cents !== "number") return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function SecretariatPaymentNotesSection({
  amountEuros,
  reviewNotes,
  onAmountEurosChange,
  onReviewNotesChange,
  registrationStatus,
  paymentRequestedAt,
  paymentAmountCents,
  paymentEmailSentTo,
  paymentMethod,
  remainingAmountCents = null,
  paymentSettled = false,
  saving,
  requestingPayment,
  persistingQuote,
  onSave,
  onRequestPayment,
  onRequestOnlinePayment,
}: Props) {
  const remaining = remainingAmountCents ?? null;
  const paymentCta = resolveSecretariatPaymentCta({
    registrationStatus,
    paymentSettled,
    paymentMethod,
  });
  const isPaymentResend = paymentCta.visible && paymentCta.kind === "resend";
  const canOfferOnlineLink =
    paymentCta.visible &&
    paymentCta.kind !== "validate_settled" &&
    Boolean(onRequestOnlinePayment) &&
    paymentMethod !== "card" &&
    (remaining == null || remaining > 0);
  const requestedAtLabel = formatPaymentRequestedAt(paymentRequestedAt);
  const formattedAmount = formatAmountCents(paymentAmountCents);

  return (
    <>
      <Typography variant="h6" fontWeight={800} sx={{ color: "primary.main" }}>
        Paiement et notes internes
      </Typography>

      {paymentMethod === "card" &&
      !(paymentCta.visible && paymentCta.kind === "validate_settled") ? (
        <Alert severity="info" variant="outlined">
          Mode prévu <strong>carte bancaire</strong> : un lien Stripe Checkout sera
          envoyé par e-mail. {BNPL_SECRETARIAT_ALERT} {CHECKOUT_LINK_VALIDITY_NOTICE}{" "}
          {SECRETARIAT_SELF_SERVICE_HINT}
        </Alert>
      ) : null}

      {paymentMethod && paymentMethod !== "card" ? (
        <Alert severity="info" variant="outlined">
          Mode prévu <strong>{PAYMENT_METHOD_LABELS[paymentMethod]}</strong> : les
          instructions de règlement suivent cette intention. Vous pouvez aussi envoyer
          un lien de paiement en ligne si l&apos;adhérent règle finalement par carte.
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Montant total à demander à l’adhérent"
            value={amountEuros}
            onChange={(e) => onAmountEurosChange(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EuroIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            helperText={
              remaining != null && remaining !== paymentAmountCents
                ? `Net après aides. Le solde réellement demandé sera ${formatAmountCents(remaining)}.`
                : "Doit correspondre au net après aides (voir tarification)."
            }
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Notes internes (non visibles par l’adhérent)"
            value={reviewNotes}
            onChange={(e) => onReviewNotesChange(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            helperText="Mémo pour le bureau : arrangement particulier, relance prévue, contact privilégié, etc."
          />
        </Grid>
      </Grid>

      {paymentCta.visible && paymentCta.kind === "validate_settled" ? (
        <Alert severity="success" variant="outlined">
          Le règlement est déjà enregistré. Vous pouvez valider le dossier sans renvoyer de
          lien de paiement.
        </Alert>
      ) : isPaymentResend && paymentMethod === "card" ? (
        <Alert severity="warning" variant="outlined">
          Paiement en attente
          {requestedAtLabel ? ` depuis le ${requestedAtLabel}` : ""}
          {formattedAmount ? ` — montant : ${formattedAmount}` : ""}.
          {paymentEmailSentTo ? (
            <>
              {" "}
              Dernier e-mail envoyé à <strong>{paymentEmailSentTo}</strong>.
            </>
          ) : null}
        </Alert>
      ) : paymentEmailSentTo ? (
        <Alert severity="info">
          Dernière demande de paiement par e-mail envoyée à {paymentEmailSentTo}.
        </Alert>
      ) : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
        <Tooltip
          title="Enregistre le montant et les notes sur le dossier, sans envoyer d’e-mail à l’adhérent."
          slotProps={{ popper: { sx: { maxWidth: 320 } } }}
          {...tooltipEnterProps}
        >
          <span>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => void onSave()}
              disabled={saving || requestingPayment || persistingQuote}
            >
              {saving ? "Enregistrement..." : "Enregistrer le dossier"}
            </Button>
          </span>
        </Tooltip>
        {canOfferOnlineLink ? (
          <Tooltip
            title={SECRETARIAT_SEND_ONLINE_PAYMENT_TOOLTIP}
            slotProps={{ popper: { sx: { maxWidth: 340 } } }}
            {...tooltipEnterProps}
          >
            <span>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<MarkEmailReadIcon />}
                onClick={() => void onRequestOnlinePayment?.()}
                disabled={saving || requestingPayment || persistingQuote}
              >
                {SECRETARIAT_SEND_ONLINE_PAYMENT_BUTTON}
              </Button>
            </span>
          </Tooltip>
        ) : null}
        {paymentCta.visible ? (
          <Tooltip
            title={paymentCta.tooltip}
            slotProps={{ popper: { sx: { maxWidth: 340 } } }}
            {...tooltipEnterProps}
          >
            <span>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<MarkEmailReadIcon />}
                onClick={() => void onRequestPayment()}
                disabled={saving || requestingPayment || persistingQuote}
              >
                {requestingPayment
                  ? paymentCta.kind === "validate_settled"
                    ? "Validation..."
                    : "Envoi..."
                  : paymentCta.label}
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </Stack>
    </>
  );
}
