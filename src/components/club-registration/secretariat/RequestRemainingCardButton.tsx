"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { formatCentsAsEuros } from "@/lib/pricing";

type Props = {
  registrationId: string;
  remainingAmountCents: number;
  paidAmountCents: number;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
};

export function canShowRequestRemainingCardButton(params: {
  remainingAmountCents: number;
  paidAmountCents: number;
  paymentStatus: string;
}): boolean {
  return (
    params.paymentStatus !== "paid" &&
    params.paidAmountCents > 0 &&
    params.remainingAmountCents > 0
  );
}

export function RequestRemainingCardButton({
  registrationId,
  remainingAmountCents,
  paidAmountCents,
  onRefresh,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);

  const sendRequest = async () => {
    setLoading(true);
    setSuccessUrl(null);
    onError("");
    try {
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(registrationId)}/payment/request-remaining-card`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        checkoutUrl?: string;
      };
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible d’envoyer le lien CB");
      }
      if (typeof json.checkoutUrl === "string" && json.checkoutUrl) {
        setSuccessUrl(json.checkoutUrl);
      }
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Stack spacing={1} sx={{ minWidth: { sm: 260 } }}>
      <Tooltip
        title="Crée un lien Stripe uniquement pour le reste dû (après les encaissements déjà notés) et l’envoie par e-mail à l’adhérent. Les échéances chèque encore « attendues » sont annulées."
        slotProps={{ popper: { sx: { maxWidth: 340 } } }}
        enterDelay={400}
      >
        <span>
          <Button
            variant="contained"
            color="primary"
            disabled={loading}
            onClick={() => setConfirmOpen(true)}
          >
            {loading
              ? "Envoi…"
              : `Envoyer un lien CB pour le reste (${formatCentsAsEuros(remainingAmountCents)})`}
          </Button>
        </span>
      </Tooltip>
      {successUrl ? (
        <Alert severity="success" variant="outlined" onClose={() => setSuccessUrl(null)}>
          <Typography variant="body2">
            Lien envoyé. Déjà reçu&nbsp;: {formatCentsAsEuros(paidAmountCents)}. Solde&nbsp;:{" "}
            {formatCentsAsEuros(remainingAmountCents)}.
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: "break-all", mt: 0.5 }}>
            {successUrl}
          </Typography>
        </Alert>
      ) : null}

      <Dialog
        open={confirmOpen}
        onClose={() => (loading ? undefined : setConfirmOpen(false))}
        aria-labelledby="request-remaining-card-title"
      >
        <DialogTitle id="request-remaining-card-title">
          Envoyer un lien CB pour le solde ?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Un e-mail avec un lien Stripe de{" "}
            <strong>{formatCentsAsEuros(remainingAmountCents)}</strong> sera envoyé à
            l’adhérent. Les échéances encore « attendues » (ex. chèques) seront annulées.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={() => void sendRequest()}
            disabled={loading}
            autoFocus
          >
            {loading ? "Envoi…" : "Confirmer l’envoi"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
