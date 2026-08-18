"use client";

import { useState } from "react";
import { Button, CircularProgress, Typography } from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import {
  ADHERENT_NON_CARD_PAYMENT_HINT,
  ADHERENT_PAY_ONLINE_BUTTON_LABEL,
  ADHERENT_PAY_ONLINE_HELPER,
  ADHERENT_PAY_REMAINING_BUTTON_LABEL,
  ADHERENT_PAY_REMAINING_HELPER,
} from "@/lib/club-registration/payment/bnpl-checkout-copy";
import {
  canSelfServiceOnlineCheckout,
  canSelfServiceRemainingOverride,
  isAwaitingNonCardPayment,
  type SelfServiceCheckoutRecord,
} from "@/lib/club-registration/self-service-checkout";

type ChargeMode = "online" | "remaining";

type Props = {
  registration: SelfServiceCheckoutRecord & { id: string };
  onError: (message: string | null) => void;
};

export function MesInscriptionPayOnlineButton({ registration, onError }: Props) {
  const [loadingCharge, setLoadingCharge] = useState<ChargeMode | null>(null);
  const canPayOnline = canSelfServiceOnlineCheckout(registration);
  const canPayRemaining = canSelfServiceRemainingOverride(registration);

  if (!canPayOnline && !canPayRemaining) {
    if (isAwaitingNonCardPayment(registration)) {
      return (
        <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
          {ADHERENT_NON_CARD_PAYMENT_HINT}
        </Typography>
      );
    }
    return null;
  }

  const handlePay = async (charge: ChargeMode) => {
    setLoadingCharge(charge);
    onError(null);
    try {
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(registration.id)}/checkout`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(charge === "remaining" ? { charge: "remaining" } : {}),
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
      setLoadingCharge(null);
    }
  };

  const loading = loadingCharge != null;

  return (
    <>
      {canPayOnline ? (
        <Button
          size="small"
          variant="contained"
          color="secondary"
          startIcon={
            loadingCharge === "online" ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <PaymentIcon fontSize="small" />
            )
          }
          disabled={loading}
          onClick={() => void handlePay("online")}
          sx={{ alignSelf: { xs: "stretch", sm: "auto" }, flexShrink: 0 }}
        >
          {loadingCharge === "online" ? "Redirection…" : ADHERENT_PAY_ONLINE_BUTTON_LABEL}
        </Button>
      ) : null}
      {canPayRemaining ? (
        <Button
          size="small"
          variant={canPayOnline ? "outlined" : "contained"}
          color="secondary"
          startIcon={
            loadingCharge === "remaining" ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <PaymentIcon fontSize="small" />
            )
          }
          disabled={loading}
          onClick={() => void handlePay("remaining")}
          sx={{ alignSelf: { xs: "stretch", sm: "auto" }, flexShrink: 0 }}
        >
          {loadingCharge === "remaining"
            ? "Redirection…"
            : ADHERENT_PAY_REMAINING_BUTTON_LABEL}
        </Button>
      ) : null}
      <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
        {canPayRemaining ? ADHERENT_PAY_REMAINING_HELPER : ADHERENT_PAY_ONLINE_HELPER}
      </Typography>
    </>
  );
}
