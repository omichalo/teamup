"use client";

import { useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { AttendanceMemberSearchHit } from "@/lib/attendance/types";
import { AttendanceAlertChips } from "./AttendanceAlertChips";

type Props = {
  open: boolean;
  slotId: string;
  onClose: () => void;
  onPick: (member: AttendanceMemberSearchHit, addSlot: boolean) => Promise<void>;
};

export function AttendanceSearchDialog({ open, slotId, onClose, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<AttendanceMemberSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ q: query.trim(), slotId });
          const res = await fetch(`/api/club/attendance/members?${params.toString()}`);
          const json = await readJsonResponse<{
            members?: AttendanceMemberSearchHit[];
            error?: string;
          }>(res);
          if (cancelled) return;
          if (!res.ok) throw new Error(json.error ?? "Recherche impossible");
          setHits(json.members ?? []);
        } catch (err) {
          if (cancelled) return;
          setHits([]);
          setError(err instanceof Error ? err.message : "Erreur");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, slotId]);

  async function pick(member: AttendanceMemberSearchHit, addSlot: boolean) {
    setBusyId(member.registrationId);
    try {
      await onPick(member, addSlot);
      onClose();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Chercher un adhérent</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label="Nom ou prénom"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
          />
          {loading ? <CircularProgress size={24} /> : null}
          {error ? <Typography color="error">{error}</Typography> : null}
          {hits.map((hit) => (
            <Stack
              key={hit.registrationId}
              spacing={1}
              sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 2 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {hit.displayName}
              </Typography>
              <AttendanceAlertChips alerts={hit.alerts} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="contained"
                  disabled={busyId === hit.registrationId}
                  onClick={() => void pick(hit, false)}
                  sx={{ minHeight: 48 }}
                >
                  Présent ce soir
                </Button>
                <Button
                  variant="outlined"
                  disabled={busyId === hit.registrationId}
                  onClick={() => void pick(hit, true)}
                  sx={{ minHeight: 48 }}
                >
                  Présent + ajouter le créneau
                </Button>
              </Stack>
            </Stack>
          ))}
          {!loading && query.trim().length >= 2 && hits.length === 0 ? (
            <Typography color="text.secondary">Aucun adhérent hors créneau.</Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
