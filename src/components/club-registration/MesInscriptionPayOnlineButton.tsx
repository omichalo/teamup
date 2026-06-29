"use client";

import { useState } from "react";
import { Button, CircularProgress, Typography } from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import {
  ADHERENT_NON_CARD_PAYMENT_HINT,
  ADHERENT_PAY_ONLINE_BUTTON_LABEL,
  ADHERENT_PAY_ONLINE_HELPER,
} from "@/lib/club-registration/payment/bnpl-checkout-copy";
import {
  canSelfServiceCheckout,
  isAwaitingNonCardPayment,
  type SelfServiceCheckoutRecord,
} from "@/lib/club-registration/self-service-checkout";

type Props = {
  registration: SelfServiceCheckoutRecord & { id: string };
  onError: (message: string | null) => void;
};

export function MesInscriptionPayOnlineButton({ registration, onError }: Props) {
  const [loading, setLoading] = useState(false);

  if (canSelfServiceCheckout(registration)) {
    const handlePay = async () => {
      setLoading(true);
      onError(null);
      try {
        const res = await fetch(
          `/api/club/registration/${encodeURIComponent(registration.id)}/checkout`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const json = (await res.json().catch(() => ({}))) as {
          checkoutUrl?: string;
          error?: string;
        };
        if (!res.ok || !json.checkoutUrl) {
          throw new Error(json.error || "Impossible d'ouvrir la page de paiement.");
        }
        window.location.assign(json.checkoutUrl);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Impossible d'ouvrir la page de paiement.");
        setLoading(false);
      }
    };

    return (
      <>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : <PaymentIcon fontSize="small" />
          }
          disabled={loading}
          onClick={() => void handlePay()}
          sx={{ alignSelf: { xs: "stretch", sm: "auto" }, flexShrink: 0 }}
        >
          {loading ? "Redirection…" : ADHERENT_PAY_ONLINE_BUTTON_LABEL}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
          {ADHERENT_PAY_ONLINE_HELPER}
        </Typography>
      </>
    );
  }

  if (isAwaitingNonCardPayment(registration)) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
        {ADHERENT_NON_CARD_PAYMENT_HINT}
      </Typography>
    );
  }

  return null;
}
