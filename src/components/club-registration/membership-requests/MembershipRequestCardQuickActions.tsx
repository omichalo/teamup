"use client";

import { useState } from "react";
import { Button, CircularProgress, Stack, Typography } from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import VerifiedIcon from "@mui/icons-material/Verified";
import {
  canMarkCertificateReceived,
  canMarkCertificateValidated,
  canQuickRequestPayment,
  canQuickResendPaymentLink,
  resolveQuickPaymentAmountCents,
} from "@/lib/club-registration/membership-requests/registration-card-quick-actions";
import { SECRETARIAT_QUICK_RESEND_PAYMENT_LABEL } from "@/lib/club-registration/payment/bnpl-checkout-copy";
import type { MembershipListReloadFn, RegistrationSummary } from "./types";

type BusyAction = "certificate" | "validate" | "payment" | "resend";

type Props = {
  registration: RegistrationSummary;
  onListReload?: MembershipListReloadFn | undefined;
  onActionComplete?: (() => void) | undefined;
};

async function patchCertificateStatus(
  registrationId: string,
  medicalCertificateStatus: "received" | "validated"
): Promise<void> {
  const res = await fetch(`/api/club/registration?id=${encodeURIComponent(registrationId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ medicalCertificateStatus }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(json.error || "Impossible de mettre à jour le certificat.");
  }
}

export function MembershipRequestCardQuickActions({
  registration,
  onListReload,
  onActionComplete,
}: Props) {
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showReceivedAction = canMarkCertificateReceived(registration);
  const showValidatedAction = canMarkCertificateValidated(registration);
  const showPaymentAction = canQuickRequestPayment(registration);
  const showResendPaymentAction = canQuickResendPaymentLink(registration);

  if (!showReceivedAction && !showValidatedAction && !showPaymentAction && !showResendPaymentAction) {
    return null;
  }

  const runCertificateAction = async (
    action: BusyAction,
    status: "received" | "validated"
  ) => {
    setBusyAction(action);
    setError(null);
    try {
      await patchCertificateStatus(registration.id, status);
      await onListReload?.({ advance: "never" });
      onActionComplete?.();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Action impossible pour le moment."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const requestPayment = async (busy: BusyAction) => {
    const amountCents = resolveQuickPaymentAmountCents(registration);
    if (!amountCents || amountCents <= 0) {
      return;
    }

    setBusyAction(busy);
    setError(null);
    try {
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(registration.id)}/request-payment`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible d'envoyer la demande de paiement.");
      }
      await onListReload?.({ advance: "always" });
      onActionComplete?.();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Action impossible pour le moment."
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Stack spacing={0.75} onClick={(event) => event.stopPropagation()}>
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {showReceivedAction ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={
              busyAction === "certificate" ? <CircularProgress size={14} /> : <VerifiedIcon />
            }
            disabled={busyAction !== null}
            onClick={() => void runCertificateAction("certificate", "received")}
          >
            Certificat reçu
          </Button>
        ) : null}
        {showValidatedAction ? (
          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={
              busyAction === "validate" ? <CircularProgress size={14} /> : <TaskAltIcon />
            }
            disabled={busyAction !== null}
            onClick={() => void runCertificateAction("validate", "validated")}
          >
            Marquer contrôlé
          </Button>
        ) : null}
        {showPaymentAction ? (
          <Button
            size="small"
            variant="contained"
            color="secondary"
            startIcon={
              busyAction === "payment" ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <MarkEmailReadIcon />
              )
            }
            disabled={busyAction !== null}
            onClick={() => void requestPayment("payment")}
          >
            Demander paiement
          </Button>
        ) : null}
        {showResendPaymentAction ? (
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={
              busyAction === "resend" ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <MarkEmailReadIcon />
              )
            }
            disabled={busyAction !== null}
            onClick={() => void requestPayment("resend")}
          >
            {SECRETARIAT_QUICK_RESEND_PAYMENT_LABEL}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
