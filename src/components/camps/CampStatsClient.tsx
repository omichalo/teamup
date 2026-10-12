"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { CampStatsSummary } from "@/lib/camps/stats";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        minWidth: 140,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  );
}

export function CampStatsClient() {
  const [summary, setSummary] = useState<CampStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/club/camps/stats", { credentials: "include" });
      const json = (await res.json()) as {
        summary?: CampStatsSummary;
        error?: string;
      };
      if (!res.ok || !json.summary) {
        throw new Error(json.error ?? "Chargement impossible");
      }
      setSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: 2, py: 3 }}>
      <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 1 }}>
        Statistiques stages
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading || !summary ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5} sx={{ mb: 3 }}>
            <Metric label="Inscriptions" value={String(summary.registrationCount)} />
            <Metric label="Payées" value={String(summary.paidCount)} />
            <Metric label="À encaisser" value={String(summary.awaitingPaymentCount)} />
            <Metric label="Adhérents" value={String(summary.memberCount)} />
            <Metric label="Non-adhérents" value={String(summary.nonMemberCount)} />
            <Metric
              label="Facturé"
              value={`${(summary.invoicedCents / 100).toFixed(0)} €`}
            />
            <Metric
              label="Encaissé"
              value={`${(summary.receivedCents / 100).toFixed(0)} €`}
            />
          </Stack>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Remplissage des créneaux
          </Typography>
          <Stack spacing={0.75}>
            {summary.slotFill.slice(0, 80).map((slot) => (
              <Box
                key={slot.slotId}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 2,
                  py: 0.75,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2">
                  {slot.date} · {slot.label}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {slot.enrolled}
                  {slot.capacity != null ? ` / ${slot.capacity}` : ""}
                </Typography>
              </Box>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
