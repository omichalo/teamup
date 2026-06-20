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
  PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
} from "@/lib/club-registration/payment-constants";

type Props = {
  amountEuros: string;
  reviewNotes: string;
  onAmountEurosChange: (value: string) => void;
  onReviewNotesChange: (value: string) => void;
  paymentEmailSentTo?: string | null | undefined;
  paymentMethod?: PaymentMethodId | null | undefined;
  paymentInstallments?: number | null | undefined;
  saving: boolean;
  requestingPayment: boolean;
  persistingQuote: boolean;
  onSave: () => void | Promise<void>;
  onRequestPayment: () => void | Promise<void>;
};

const tooltipEnterProps = { enterDelay: 400, enterNextDelay: 400 } as const;

export function SecretariatPaymentNotesSection({
  amountEuros,
  reviewNotes,
  onAmountEurosChange,
  onReviewNotesChange,
  paymentEmailSentTo,
  paymentMethod,
  paymentInstallments,
  saving,
  requestingPayment,
  persistingQuote,
  onSave,
  onRequestPayment,
}: Props) {
  const installments = paymentInstallments ?? 1;
  const isMultiCard = paymentMethod === "card" && installments > 1;
  const canSendStripeEmail = paymentMethod === "card" && installments === 1;

  return (
    <>
      <Typography variant="h6" fontWeight={800} sx={{ color: "primary.main" }}>
        Paiement et notes internes
      </Typography>

      {isMultiCard ? (
        <Alert severity="info" variant="outlined">
          Mode <strong>carte en {installments} fois</strong> : l’application envoie d’abord un
          e-mail d’instructions avec l’échéancier. Ensuite, créez et transmettez{" "}
          <strong>manuellement un lien Stripe</strong> (Dashboard ou lien de paiement) pour
          chaque échéance, puis marquez-la reçue dans le tableau « Paiements attendus » lorsque
          le webhook confirme le paiement.
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

      {paymentEmailSentTo ? (
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
        <Tooltip
          title={
            canSendStripeEmail
              ? "Enregistre le dossier puis envoie un e-mail au contact avec un lien sécurisé Stripe (carte bancaire en une seule fois uniquement)."
              : "Enregistre le dossier puis bascule en suivi adapté : pas de lien de paiement automatique pour ce mode de règlement."
          }
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
              {requestingPayment ? "Envoi..." : "Valider et demander le paiement"}
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </>
  );
}
