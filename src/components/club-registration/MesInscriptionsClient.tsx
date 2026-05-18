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
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { SECTION_PRINCIPALE_OPTIONS } from "@/lib/club-registration/constants";
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
  submittedAt?: string | null;
  updatedAt?: string | null;
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
  const found = SECTION_PRINCIPALE_OPTIONS.find((s) => s.id === id);
  return found?.label ?? id;
}

export function MesInscriptionsClient() {
  const params = useSearchParams();
  const createdId = params?.get("created") ?? null;
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<RegistrationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Mon espace"
          title="Mes inscriptions"
          subtitle="Retrouvez l’historique de vos demandes au club et leur statut."
          actions={
            <Button
              component={NextLink}
              href="/club/inscription"
              variant="contained"
              color="secondary"
              startIcon={<AddIcon fontSize="small" />}
            >
              Nouvelle inscription
            </Button>
          }
        />

        {justCreated ? (
          <Alert severity="success">
            Votre demande pour <strong>{justCreated.firstName} {justCreated.lastName}</strong>
            {" "}a bien été envoyée au club. Vous recevrez un retour sur l’adresse e-mail de
            votre compte.
          </Alert>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : registrations.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body1" color="text.secondary">
                Vous n’avez pas encore de dossier d’inscription. Cliquez sur{" "}
                <em>Nouvelle inscription</em> pour préparer un dossier.
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
                        {r.firstName ?? "—"} {r.lastName ?? ""}
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
                    justifyContent: { xs: "flex-start", sm: "flex-end" },
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
                </CardActions>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
