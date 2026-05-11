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
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { SECTION_PRINCIPALE_OPTIONS } from "@/lib/club-registration/constants";

type RegistrationSummary = {
  id: string;
  adherentRole?: "self" | "minor_dependent" | "other_adult";
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  isMinor?: boolean;
  mainSectionId?: string;
  status?: string;
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
  approved: "success",
  rejected: "error",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "En cours d’examen",
  approved: "Approuvé",
  rejected: "Refusé",
};

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
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Typography variant="h4" component="h1">
            Mes inscriptions
          </Typography>
          <NextLink href="/club/inscription" passHref legacyBehavior>
            <Button variant="contained">Nouvelle inscription</Button>
          </NextLink>
        </Stack>

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
              <Card key={r.id} variant="outlined">
                <CardContent>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box>
                      <Typography variant="h6">
                        {r.firstName ?? "—"} {r.lastName ?? ""}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {r.adherentRole ? ROLE_LABEL[r.adherentRole] : ""}
                        {r.mainSectionId ? ` • ${findSectionLabel(r.mainSectionId)}` : ""}
                      </Typography>
                    </Box>
                    <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={0.5}>
                      <Chip
                        size="small"
                        label={STATUS_LABEL[r.status ?? ""] ?? r.status ?? "—"}
                        color={STATUS_COLOR[r.status ?? ""] ?? "default"}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Envoyé le {formatDate(r.submittedAt)}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    Référence : {r.id}
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
