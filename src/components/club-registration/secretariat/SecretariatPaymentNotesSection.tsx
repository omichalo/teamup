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
  SECRETARIAT_SEND_FULL_REMAINING_ONLINE_BUTTON,
  SECRETARIAT_SEND_FULL_REMAINING_ONLINE_TOOLTIP,
} from "@/lib/club-registration/payment/bnpl-checkout-copy";
import { resolveSecretariatPaymentCta } from "@/lib/club-registration/payment/secretariat-payment-action";
import { centsToEurosInput } from "@/lib/club-registration/payment/payment-draft-helpers";
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
  onlinePayableCents?: number | null;
  paymentSettled?: boolean;
  paidAmountCents?: number | null;
  saving: boolean;
  requestingPayment: boolean;
  persistingQuote: boolean;
  onSave: () => void | Promise<void>;
  onRequestPayment: () => void | Promise<void>;
  onRequestOnlinePayment?: () => void | Promise<void>;
  onRequestFullRemainingOnline?: () => void | Promise<void>;
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

function withRemainingAmount(label: string, remainingCents: number | null): string {
  const formatted = formatAmountCents(remainingCents);
  return formatted ? `${label} (${formatted})` : label;
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
  onlinePayableCents = null,
  paidAmountCents = null,
  paymentSettled = false,
  saving,
  requestingPayment,
  persistingQuote,
  onSave,
  onRequestPayment,
  onRequestOnlinePayment,
  onRequestFullRemainingOnline,
}: Props) {
  const remaining = remainingAmountCents ?? null;
  const onlinePayable = onlinePayableCents ?? remaining;
  const alreadyPaidCents =
    paidAmountCents ??
    (remaining != null && paymentAmountCents != null && remaining < paymentAmountCents
      ? paymentAmountCents - remaining
      : null);
  const paymentCta = resolveSecretariatPaymentCta({
    registrationStatus,
    paymentSettled,
    paymentMethod,
    remainingAmountCents: remaining,
    paidAmountCents: alreadyPaidCents,
  });
  const isPaymentResend =
    paymentCta.visible &&
    (paymentCta.kind === "resend" || paymentCta.kind === "supplement");
  const canOfferOnlineLink =
    paymentCta.visible &&
    paymentCta.kind !== "validate_settled" &&
    Boolean(onRequestOnlinePayment) &&
    paymentMethod !== "card" &&
    (onlinePayable == null || onlinePayable > 0);
  const canOfferFullRemainingLink =
    paymentCta.visible &&
    paymentCta.kind !== "validate_settled" &&
    Boolean(onRequestFullRemainingOnline) &&
    remaining != null &&
    remaining > 0 &&
    onlinePayable != null &&
    remaining > onlinePayable;
  const requestedAtLabel = formatPaymentRequestedAt(paymentRequestedAt);
  const remainingLabel = formatAmountCents(remaining);
  const onlineLabel = formatAmountCents(onlinePayable);
  const netLabel = formatAmountCents(paymentAmountCents);
  const hasPartialReceipt = alreadyPaidCents != null && alreadyPaidCents > 0;
  const hasOfflineRemainder =
    remaining != null && onlinePayable != null && onlinePayable > 0 && onlinePayable < remaining;
  const chargeButtonLabel =
    remaining != null && remaining > 0 ? remaining : null;
  const onlineChargeLabel =
    onlinePayable != null && onlinePayable > 0 ? onlinePayable : null;

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
            label="Montant net après aides"
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
            helperText="Total de l’adhésion (hors déjà encaissé). Doit correspondre au devis."
          />
        </Grid>
        {remaining != null ? (
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Solde encore dû"
              value={centsToEurosInput(remaining)}
              fullWidth
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <EuroIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              helperText={
                hasOfflineRemainder
                  ? `Dont ${onlineLabel} en ligne ; le reste est prévu hors carte (chèques vacances).`
                  : hasPartialReceipt && onlinePayable === remaining
                    ? `${formatAmountCents(alreadyPaidCents)} déjà encaissé. C’est ce solde que le lien Stripe demandera.`
                    : hasPartialReceipt
                      ? `${formatAmountCents(alreadyPaidCents)} déjà encaissé. Le reste est prévu hors carte.`
                      : "Montant du lien de paiement et des instructions."
              }
            />
          </Grid>
        ) : null}
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
          {remainingLabel ? ` — solde demandé : ${remainingLabel}` : ""}.
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

      {hasOfflineRemainder && onlineLabel ? (
        <Alert severity="warning" variant="outlined">
          Le lien de paiement en ligne demandera <strong>{onlineLabel}</strong> par
          défaut, pas {remainingLabel}. Si l&apos;adhérent ne remet pas les chèques
          vacances, vous pouvez demander tout le solde en ligne.
        </Alert>
      ) : remaining != null && remaining > 0 && onlinePayable === 0 && remainingLabel ? (
        <Alert severity="warning" variant="outlined">
          Le complément carte est déjà encaissé. Le solde {remainingLabel} est prévu
          en chèques vacances ; vous pouvez quand même demander tout ce solde en
          ligne si l&apos;adhérent change d&apos;avis.
        </Alert>
      ) : hasPartialReceipt && remainingLabel && netLabel && paymentCta.visible ? (
        <Alert severity="warning" variant="outlined">
          {paymentCta.kind === "supplement" ? (
            <>
              Un complément est dû après modification du dossier ({remainingLabel}
              {onlineLabel ? `, dont ${onlineLabel} par carte` : ""}).
            </>
          ) : (
            <>
              Un encaissement est déjà enregistré.{" "}
              {onlineChargeLabel && onlineLabel
                ? `Le lien de paiement demandera ${onlineLabel}, pas ${netLabel}.`
                : `Solde restant ${remainingLabel} (hors carte).`}
            </>
          )}
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
            title={
              onlineLabel
                ? `Envoie un e-mail invitant l'adhérent à régler ${onlineLabel} par carte (Stripe).`
                : SECRETARIAT_SEND_ONLINE_PAYMENT_TOOLTIP
            }
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
                {withRemainingAmount(
                  SECRETARIAT_SEND_ONLINE_PAYMENT_BUTTON,
                  onlineChargeLabel
                )}
              </Button>
            </span>
          </Tooltip>
        ) : null}
        {canOfferFullRemainingLink ? (
          <Tooltip
            title={SECRETARIAT_SEND_FULL_REMAINING_ONLINE_TOOLTIP}
            slotProps={{ popper: { sx: { maxWidth: 340 } } }}
            {...tooltipEnterProps}
          >
            <span>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<MarkEmailReadIcon />}
                onClick={() => void onRequestFullRemainingOnline?.()}
                disabled={saving || requestingPayment || persistingQuote}
              >
                {withRemainingAmount(
                  SECRETARIAT_SEND_FULL_REMAINING_ONLINE_BUTTON,
                  remaining
                )}
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
                  : paymentCta.kind === "validate_settled"
                    ? paymentCta.label
                    : withRemainingAmount(paymentCta.label, chargeButtonLabel)}
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </Stack>
    </>
  );
}
