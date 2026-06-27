"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { getEnabledSections } from "@/lib/club-registration-config/helpers";
import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import {
  MEDICAL_CERTIFICATE_STATUS_LABELS,
  type MedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";

type RegistrationSummary = {
  id: string;
  adherentRole?: "self" | "minor_dependent" | "other_adult";
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  isMinor?: boolean;
  mainSectionId?: string;
  medicalCertificateStatus?: MedicalCertificateStatus;
  status?: string;
  paymentAmountCents?: number;
  paymentStatus?: string;
  invoiceAvailable?: boolean;
  submittedAt?: string | null;
  updatedAt?: string | null;
  paidAt?: string | null;
};

type ApiResponse =
  | { registrations: RegistrationSummary[] }
  | { error: string };

const ROLE_LABEL: Record<NonNullable<RegistrationSummary["adherentRole"]>, string> = {
  self: "Inscription pour moi",
  minor_dependent: "Mineur dont je suis le représentant légal",
  other_adult: "Autre adulte",
};

const STATUS_COLOR: Record<string, "default" | "warning" | "success" | "error"> = {
  submitted: "warning",
  in_review: "warning",
  payment_requested: "warning",
  paid: "success",
  approved: "success",
  rejected: "error",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "En cours d’examen",
  in_review: "En cours de relecture",
  payment_requested: "Paiement demandé",
  paid: "Paiement reçu",
  approved: "Approuvé",
  rejected: "Refusé",
};

const MEDICAL_CERTIFICATE_STATUS_COLOR: Record<
  MedicalCertificateStatus,
  "default" | "warning" | "success"
> = {
  not_required: "default",
  required_not_received: "warning",
  received: "warning",
  validated: "success",
};

function formatAmount(cents: number | undefined): string | null {
  if (typeof cents !== "number") return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function findSectionLabel(id: string | undefined): string {
  if (!id) return "";
  const found = getEnabledSections(getDefaultRegistrationConfig()).find((s) => s.id === id);
  return found?.label ?? id;
}

function isRegistrationPaid(r: RegistrationSummary): boolean {
  return (
    r.status === "paid" ||
    r.paymentStatus === "paid" ||
    r.paymentStatus === "complete"
  );
}

export function MesInscriptionsClient() {
  const params = useSearchParams();
  const createdId = params?.get("created") ?? null;
  const paymentSuccessId = params?.get("registration") ?? null;
  const paymentBanner =
    params?.get("payment") === "success" ? "success" : null;
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<RegistrationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/club/registrations", {
          credentials: "include",
        });
        const json = (await res.json()) as ApiResponse;
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
    () => registrations.find((r) => r.id === paymentSuccessId) ?? null,
    [registrations, paymentSuccessId]
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
            </strong>
            {" "}a bien été envoyée au club. Un e-mail de confirmation vous a été adressé à
            l’adresse de votre compte.
          </Alert>
        ) : null}

        {paymentBanner && paymentJustCompleted ? (
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
            isRegistrationPaid(paymentJustCompleted) ? (
              <>
                Votre facture Stripe est disponible ci-dessous (
                <em>Télécharger la facture</em>).
              </>
            ) : (
              <>La facture apparaîtra d’ici quelques instants sur cette page.</>
            )}
          </Alert>
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
              <Card key={r.id}>
                <CardContent sx={{ pb: 1.5 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "stretch", sm: "flex-start" }}
                    justifyContent="space-between"
                    spacing={{ xs: 1.5, sm: 2 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: "primary.main",
                          wordBreak: "break-word",
                          lineHeight: 1.3,
                        }}
                      >
                        {formatPersonDisplayName(r.firstName, r.lastName) || "—"}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ wordBreak: "break-word" }}
                      >
                        {r.adherentRole ? ROLE_LABEL[r.adherentRole] : ""}
                        {r.mainSectionId ? ` • ${findSectionLabel(r.mainSectionId)}` : ""}
                      </Typography>
                    </Box>
                    <Stack
                      direction={{ xs: "row", sm: "column" }}
                      alignItems={{ xs: "center", sm: "flex-end" }}
                      justifyContent={{ xs: "space-between", sm: "flex-start" }}
                      spacing={{ xs: 1, sm: 0.5 }}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        size="small"
                        label={STATUS_LABEL[r.status ?? ""] ?? r.status ?? "—"}
                        color={STATUS_COLOR[r.status ?? ""] ?? "default"}
                        sx={{ flexShrink: 0 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Envoyé le {formatDate(r.submittedAt)}
                      </Typography>
                      {r.status === "payment_requested" ? (
                        <Typography variant="caption" color="secondary.main" fontWeight={700}>
                          Paiement attendu{formatAmount(r.paymentAmountCents) ? ` : ${formatAmount(r.paymentAmountCents)}` : ""}
                        </Typography>
                      ) : null}
                      {r.medicalCertificateStatus &&
                      r.medicalCertificateStatus !== "not_required" ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`Certificat : ${
                            MEDICAL_CERTIFICATE_STATUS_LABELS[
                              r.medicalCertificateStatus
                            ]
                          }`}
                          color={
                            MEDICAL_CERTIFICATE_STATUS_COLOR[
                              r.medicalCertificateStatus
                            ]
                          }
                          sx={{ flexShrink: 0 }}
                        />
                      ) : null}
                    </Stack>
                  </Stack>
                </CardContent>
                <CardActions
                  sx={{
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "space-between",
                    gap: 1,
                    pt: 0,
                    px: { xs: 2, sm: 3 },
                    pb: 2,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ wordBreak: "break-all" }}
                  >
                    Référence&nbsp;: {r.id}
                  </Typography>
                  {isRegistrationPaid(r) && r.invoiceAvailable ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      startIcon={
                        invoiceLoadingId === r.id ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <DownloadIcon fontSize="small" />
                        )
                      }
                      disabled={invoiceLoadingId === r.id}
                      onClick={() => openInvoice(r.id)}
                      sx={{ alignSelf: { xs: "stretch", sm: "auto" }, flexShrink: 0 }}
                    >
                      Télécharger la facture
                    </Button>
                  ) : isRegistrationPaid(r) ? (
                    <Typography variant="caption" color="text.secondary">
                      Facture en cours de publication…
                    </Typography>
                  ) : null}
                </CardActions>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
