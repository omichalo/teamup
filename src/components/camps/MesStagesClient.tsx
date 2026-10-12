"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { CampListItem, CampRegistration } from "@/lib/camps/types";
import { CAMP_PAYMENT_METHOD_LABELS } from "@/lib/camps/constants";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Soumis",
  awaiting_payment: "En attente de paiement",
  partially_paid: "Partiellement payé",
  paid: "Payé",
  cancelled: "Annulé",
};

function formatCampDates(camp: CampListItem): string {
  if (camp.startDate === camp.endDate) return camp.startDate;
  return `${camp.startDate} → ${camp.endDate}`;
}

export function MesStagesClient() {
  const [registrations, setRegistrations] = useState<CampRegistration[]>([]);
  const [openCamps, setOpenCamps] = useState<CampListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [regsRes, campsRes] = await Promise.all([
        fetch("/api/club/camps/registrations?scope=mine", {
          credentials: "include",
        }),
        fetch("/api/club/camps", { credentials: "include" }),
      ]);
      const regsJson = (await regsRes.json()) as {
        registrations?: CampRegistration[];
        error?: string;
      };
      const campsJson = (await campsRes.json()) as {
        camps?: CampListItem[];
        error?: string;
      };
      if (!regsRes.ok) {
        throw new Error(regsJson.error ?? "Inscriptions impossibles");
      }
      if (!campsRes.ok) {
        throw new Error(campsJson.error ?? "Stages ouverts impossibles");
      }
      setRegistrations(regsJson.registrations ?? []);
      setOpenCamps(
        (campsJson.camps ?? []).filter((camp) => camp.status === "open")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startCheckout(registrationId: string) {
    setBusyId(registrationId);
    setError(null);
    try {
      const res = await fetch(
        `/api/club/camps/registrations/${registrationId}/checkout`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const json = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !json.checkoutUrl) {
        throw new Error(json.error ?? "Paiement en ligne indisponible");
      }
      window.location.href = json.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusyId(null);
    }
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 3 }}>
      <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 1 }}>
        Mes stages
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Inscrivez-vous aux stages ouverts, puis suivez vos paiements.
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={4}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Stages ouverts
            </Typography>
            {openCamps.length === 0 ? (
              <Alert severity="info">
                Aucun stage n’accepte d’inscription pour le moment.
              </Alert>
            ) : (
              <Stack spacing={1.5}>
                {openCamps.map((camp) => (
                  <Stack
                    key={camp.id}
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ sm: "center" }}
                    spacing={1}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box>
                      <Typography fontWeight={700}>{camp.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCampDates(camp)}
                        {camp.seasonLabel ? ` · ${camp.seasonLabel}` : ""}
                      </Typography>
                    </Box>
                    <Button
                      component={Link}
                      href={`/club/stages/${camp.id}/inscription`}
                      variant="contained"
                      size="small"
                    >
                      S’inscrire
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Mes inscriptions
            </Typography>
            {registrations.length === 0 ? (
              <Alert severity="info">
                Vous n’avez pas encore d’inscription stage.
              </Alert>
            ) : (
              <Stack spacing={1.5}>
                {registrations.map((reg) => (
                  <Box
                    key={reg.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography fontWeight={700}>
                          {reg.firstName} {reg.lastName} ·{" "}
                          {reg.formulaLabel || reg.formulaId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {reg.siteLabel} · {reg.slotIds.length} créneau(x) ·{" "}
                          {(reg.pricingQuote.totalCents / 100).toFixed(2)} € ·{" "}
                          {reg.payment.chosenMethod
                            ? CAMP_PAYMENT_METHOD_LABELS[reg.payment.chosenMethod]
                            : "—"}
                        </Typography>
                        {reg.payment.invoiceNumber ? (
                          <Typography variant="body2" color="text.secondary">
                            Facture {reg.payment.invoiceNumber}
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          label={STATUS_LABEL[reg.status] ?? reg.status}
                          color={reg.status === "paid" ? "success" : "default"}
                        />
                        {reg.status !== "paid" &&
                        reg.status !== "cancelled" &&
                        reg.payment.chosenMethod === "card" ? (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={busyId === reg.id}
                            onClick={() => void startCheckout(reg.id)}
                          >
                            Payer en ligne
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      )}
    </Box>
  );
}
