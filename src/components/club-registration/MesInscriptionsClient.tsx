"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { ADHERENT_PAYMENT_EMAIL_LANDING_ALERT, ADHERENT_PAYMENT_PENDING_ALERT } from "@/lib/club-registration/payment/bnpl-checkout-copy";
import { canSelfServiceCheckout } from "@/lib/club-registration/self-service-checkout";
import { MesInscriptionRegistrationCard } from "@/components/club-registration/MesInscriptionRegistrationCard";
import {
  isMesInscriptionPaid,
  type MesInscriptionSummary,
  type MesInscriptionsApiResponse,
} from "@/components/club-registration/mes-inscriptions-shared";

export function MesInscriptionsClient() {
  const params = useSearchParams();
  const createdId = params?.get("created") ?? null;
  const registrationFocusId = params?.get("registration") ?? null;
  const paymentBanner =
    params?.get("payment") === "success"
      ? "success"
      : params?.get("payment") === "cancelled"
        ? "cancelled"
        : null;
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<MesInscriptionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const highlightCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/club/registrations", {
          credentials: "include",
        });
        const json = (await res.json()) as MesInscriptionsApiResponse;
        if (cancelled) return;
        if (!res.ok || "error" in json) {
          setError("error" in json ? json.error : "Impossible de charger vos dossiers.");
          setRegistrations([]);
        } else {
          setRegistrations(json.registrations);
        }
      } catch {
        if (!cancelled) {
          setError("Connexion impossible avec le serveur.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const justCreated = useMemo(
    () => registrations.find((r) => r.id === createdId) ?? null,
    [registrations, createdId]
  );

  const paymentJustCompleted = useMemo(
    () =>
      paymentBanner === "success" && registrationFocusId
        ? registrations.find((r) => r.id === registrationFocusId) ?? null
        : null,
    [registrations, paymentBanner, registrationFocusId]
  );

  const paymentCancelledRegistration = useMemo(
    () =>
      paymentBanner === "cancelled" && registrationFocusId
        ? registrations.find((r) => r.id === registrationFocusId) ?? null
        : null,
    [registrations, paymentBanner, registrationFocusId]
  );

  const paymentLandingRegistration = useMemo(
    () =>
      !paymentBanner && registrationFocusId
        ? registrations.find((r) => r.id === registrationFocusId) ?? null
        : null,
    [registrations, paymentBanner, registrationFocusId]
  );

  const highlightRegistrationId = useMemo(() => {
    if (!registrationFocusId || paymentBanner === "success") {
      return null;
    }
    return registrations.some((r) => r.id === registrationFocusId) ? registrationFocusId : null;
  }, [registrationFocusId, paymentBanner, registrations]);

  useEffect(() => {
    if (!highlightRegistrationId || loading) {
      return;
    }
    highlightCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightRegistrationId, loading]);

  const hasPendingSelfServicePayment = useMemo(
    () => registrations.some((r) => canSelfServiceCheckout(r)),
    [registrations]
  );

  const openInvoice = async (registrationId: string) => {
    setInvoiceLoadingId(registrationId);
    setInvoiceError(null);
    try {
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(registrationId)}/invoice`,
        { credentials: "include" }
      );
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Facture indisponible pour le moment.");
      }
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setInvoiceError(
        err instanceof Error ? err.message : "Impossible d’ouvrir la facture."
      );
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Mon espace"
          title="Mes dossiers"
          subtitle="Retrouvez l’historique de vos demandes au club et leur statut."
          actions={
            <Button
              component={NextLink}
              href="/club/inscription"
              variant="contained"
              color="secondary"
              startIcon={<AddIcon fontSize="small" />}
            >
              Nouvelle adhésion
            </Button>
          }
        />

        {justCreated ? (
          <Alert severity="success">
            Votre demande pour{" "}
            <strong>
              {formatPersonDisplayName(justCreated.firstName, justCreated.lastName)}
            </strong>{" "}
            a bien été envoyée au club. Un e-mail de confirmation vous a été adressé à
            l’adresse de votre compte.
          </Alert>
        ) : null}

        {paymentBanner === "success" && paymentJustCompleted ? (
          <Alert severity="success">
            Paiement enregistré pour{" "}
            <strong>
              {formatPersonDisplayName(
                paymentJustCompleted.firstName,
                paymentJustCompleted.lastName
              )}
            </strong>
            .{" "}
            {paymentJustCompleted.invoiceAvailable ||
            isMesInscriptionPaid(paymentJustCompleted) ? (
              <>
                Votre facture Stripe est disponible ci-dessous (
                <em>Télécharger la facture</em>).
              </>
            ) : (
              <>La facture apparaîtra d’ici quelques instants sur cette page.</>
            )}
          </Alert>
        ) : null}

        {paymentCancelledRegistration ? (
          <Alert severity="info">
            Paiement annulé pour{" "}
            <strong>
              {formatPersonDisplayName(
                paymentCancelledRegistration.firstName,
                paymentCancelledRegistration.lastName
              )}
            </strong>
            . Vous pouvez réessayer avec le bouton <em>Payer en ligne</em> ci-dessous.
          </Alert>
        ) : null}

        {paymentLandingRegistration && canSelfServiceCheckout(paymentLandingRegistration) ? (
          <Alert severity="info">{ADHERENT_PAYMENT_EMAIL_LANDING_ALERT}</Alert>
        ) : null}

        {hasPendingSelfServicePayment && !paymentLandingRegistration ? (
          <Alert severity="warning">{ADHERENT_PAYMENT_PENDING_ALERT}</Alert>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}
        {invoiceError ? (
          <Alert severity="error" onClose={() => setInvoiceError(null)}>
            {invoiceError}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : registrations.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body1" color="text.secondary">
                Vous n’avez pas encore de dossier d’inscription. Cliquez sur{" "}
                <em>Nouvelle adhésion</em> pour préparer un dossier.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {registrations.map((r) => (
              <MesInscriptionRegistrationCard
                key={r.id}
                ref={r.id === highlightRegistrationId ? highlightCardRef : undefined}
                registration={r}
                highlighted={r.id === highlightRegistrationId}
                invoiceLoadingId={invoiceLoadingId}
                onOpenInvoice={openInvoice}
                onPaymentError={setError}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
