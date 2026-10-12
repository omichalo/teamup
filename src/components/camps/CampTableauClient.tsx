"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CampRegistration } from "@/lib/camps/types";

export function CampTableauClient() {
  const [registrations, setRegistrations] = useState<CampRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/club/camps/registrations?scope=all", {
        credentials: "include",
      });
      const json = (await res.json()) as {
        registrations?: CampRegistration[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Chargement impossible");
      setRegistrations(json.registrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${r.firstName} ${r.lastName} ${r.email} ${r.siteLabel}`.toLowerCase();
      return hay.includes(q);
    });
  }, [registrations, statusFilter, query]);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, py: 3 }}>
      <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 1 }}>
        Tableau des stages
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Recherche"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          select
          label="Statut"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="awaiting_payment">En attente</MenuItem>
          <MenuItem value="partially_paid">Partiel</MenuItem>
          <MenuItem value="paid">Payé</MenuItem>
          <MenuItem value="cancelled">Annulé</MenuItem>
        </TextField>
      </Stack>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} inscription(s)
          </Typography>
          {filtered.map((reg) => (
            <Box
              key={reg.id}
              sx={{
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                display: "grid",
                gap: 1,
                gridTemplateColumns: { xs: "1fr", md: "2fr 1.5fr 1fr 1fr" },
                alignItems: "center",
              }}
            >
              <Typography fontWeight={600}>
                {reg.lastName.toUpperCase()} {reg.firstName}
              </Typography>
              <Typography variant="body2">
                {reg.formulaLabel || reg.formulaId} · {reg.slotIds.length} créneaux
              </Typography>
              <Typography variant="body2">
                {(reg.pricingQuote.totalCents / 100).toFixed(2)} €
              </Typography>
              <Chip size="small" label={reg.status} sx={{ justifySelf: "start" }} />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
