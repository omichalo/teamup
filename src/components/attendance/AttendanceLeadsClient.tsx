"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { PageHeader } from "@/components/ui";
import { readJsonResponse } from "@/lib/http/read-json-response";
import {
  ATTENDANCE_LEAD_STATUSES,
  ATTENDANCE_LEAD_STATUS_LABELS,
  type AttendanceLeadStatus,
} from "@/lib/attendance/constants";
import type { AttendanceLead } from "@/lib/attendance/types";

export function AttendanceLeadsClient() {
  const [leads, setLeads] = useState<AttendanceLead[]>([]);
  const [status, setStatus] = useState<AttendanceLeadStatus | "all">("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/club/attendance/leads?${params.toString()}`);
      const json = await readJsonResponse<{ leads?: AttendanceLead[]; error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "Impossible de charger les essais");
      setLeads(json.leads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchStatus(id: string, next: AttendanceLeadStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/club/attendance/leads/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "Mise à jour impossible");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 3 } }}>
      <PageHeader
        eyebrow="Club"
        title="Essais à relancer"
        subtitle="Personnes pointées comme essai depuis un entraînement, sans dossier d'adhésion."
        marginBottom={3}
      />
      <Stack spacing={2}>
        <TextField
          select
          label="Statut"
          value={status}
          onChange={(e) => setStatus(e.target.value as AttendanceLeadStatus | "all")}
          sx={{ maxWidth: 240 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          {ATTENDANCE_LEAD_STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {ATTENDANCE_LEAD_STATUS_LABELS[value]}
            </MenuItem>
          ))}
        </TextField>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {loading ? <Alert severity="info">Chargement…</Alert> : null}
        {leads.map((lead) => (
          <Stack
            key={lead.id}
            spacing={1}
            sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}
          >
            <Stack direction="row" justifyContent="space-between" gap={1} flexWrap="wrap">
              <Typography variant="h6">
                {lead.firstName} {lead.lastName}
              </Typography>
              <Chip label={ATTENDANCE_LEAD_STATUS_LABELS[lead.status]} />
            </Stack>
            <Typography color="text.secondary">
              {lead.phone}
              {lead.email ? ` · ${lead.email}` : ""}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Séance du {lead.sourceDate} · créneau {lead.sourceSlotId}
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {ATTENDANCE_LEAD_STATUSES.filter((value) => value !== lead.status).map((value) => (
                <Button
                  key={value}
                  size="small"
                  variant="outlined"
                  disabled={busyId === lead.id}
                  onClick={() => void patchStatus(lead.id, value)}
                >
                  {ATTENDANCE_LEAD_STATUS_LABELS[value]}
                </Button>
              ))}
            </Stack>
          </Stack>
        ))}
        {!loading && leads.length === 0 ? (
          <Typography color="text.secondary">Aucun essai dans ce filtre.</Typography>
        ) : null}
      </Stack>
    </Container>
  );
}
