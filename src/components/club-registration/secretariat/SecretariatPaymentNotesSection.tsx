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
  BNPL_SECRETARIAT_PAYMENT_TOOLTIP,
  CHECKOUT_LINK_VALIDITY_NOTICE,
  SECRETARIAT_INITIAL_PAYMENT_BUTTON,
  SECRETARIAT_RESEND_PAYMENT_BUTTON,
  SECRETARIAT_RESEND_PAYMENT_TOOLTIP,
  SECRETARIAT_SELF_SERVICE_HINT,
} from "@/lib/club-registration/payment/bnpl-checkout-copy";
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
  saving: boolean;
  requestingPayment: boolean;
  persistingQuote: boolean;
  onSave: () => void | Promise<void>;
  onRequestPayment: () => void | Promise<void>;
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
  saving,
  requestingPayment,
  persistingQuote,
  onSave,
  onRequestPayment,
}: Props) {
  const canSendStripeEmail = paymentMethod === "card";
  const isPaid = registrationStatus === "paid";
  const isPaymentResend = registrationStatus === "payment_requested" && !isPaid;
  const paymentButtonLabel = isPaymentResend
    ? canSendStripeEmail
      ? SECRETARIAT_RESEND_PAYMENT_BUTTON
      : "Renvoyer les instructions de règlement"
    : SECRETARIAT_INITIAL_PAYMENT_BUTTON;
  const paymentTooltip = isPaymentResend
    ? canSendStripeEmail
      ? SECRETARIAT_RESEND_PAYMENT_TOOLTIP
      : "Renvoie l'e-mail d'instructions de règlement au contact du dossier."
    : canSendStripeEmail
      ? BNPL_SECRETARIAT_PAYMENT_TOOLTIP
      : "Enregistre le dossier puis bascule en suivi adapté : pas de lien de paiement automatique pour ce mode de règlement.";
  const requestedAtLabel = formatPaymentRequestedAt(paymentRequestedAt);
  const formattedAmount = formatAmountCents(paymentAmountCents);

  return (
    <>
      <Typography variant="h6" fontWeight={800} sx={{ color: "primary.main" }}>
        Paiement et notes internes
      </Typography>

      {paymentMethod === "card" ? (
        <Alert severity="info" variant="outlined">
          Mode <strong>carte bancaire</strong> : un lien Stripe Checkout sera envoyé par
          e-mail. {BNPL_SECRETARIAT_ALERT} {CHECKOUT_LINK_VALIDITY_NOTICE}{" "}
          {SECRETARIAT_SELF_SERVICE_HINT}
        </Alert>
      ) : null}

      {paymentMethod && paymentMethod !== "card" ? (
        <Alert severity="info" variant="outlined">
          Mode <strong>{PAYMENT_METHOD_LABELS[paymentMethod]}</strong> : aucun lien Stripe
          ne sera envoyé. Utilisez le tableau de suivi pour noter les encaissements reçus.
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
            helperText="Doit correspondre au reste dû après aides (voir tarification). C’est ce montant qui figurera sur la demande de paiement ou sur vos relances."
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

      {isPaymentResend && canSendStripeEmail ? (
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
        {isPaid ? null : (
          <Tooltip
            title={paymentTooltip}
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
                {requestingPayment ? "Envoi..." : paymentButtonLabel}
              </Button>
            </span>
          </Tooltip>
        )}
      </Stack>
    </>
  );
}
