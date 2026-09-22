"use client";

import { useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { AttendanceLeadSearchHit } from "@/lib/attendance/types";
import { AttendanceGuestLeadPickList } from "./AttendanceGuestLeadPickList";

type Props = {
  open: boolean;
  date: string;
  slotId: string;
  onClose: () => void;
  onCreate: (payload: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  }) => Promise<void>;
  onReuse: (lead: AttendanceLeadSearchHit) => Promise<void>;
};

export function AttendanceGuestDialog({
  open,
  date,
  slotId,
  onClose,
  onCreate,
  onReuse,
}: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<AttendanceLeadSearchHit[]>([]);
  const [hits, setHits] = useState<AttendanceLeadSearchHit[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
  }

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      setRecents([]);
      setListError(null);
      resetForm();
      return;
    }

    let cancelled = false;
    setLoadingRecents(true);
    setListError(null);
    void (async () => {
      try {
        const params = new URLSearchParams({ date, slotId });
        const res = await fetch(`/api/club/attendance/leads/search?${params}`);
        const json = await readJsonResponse<{
          leads?: AttendanceLeadSearchHit[];
          error?: string;
        }>(res);
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? "Chargement impossible");
        setRecents(json.leads ?? []);
      } catch (err) {
        if (cancelled) return;
        setRecents([]);
        setListError(err instanceof Error ? err.message : "Erreur");
      } finally {
        if (!cancelled) setLoadingRecents(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, date, slotId]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setHits([]);
      setLoadingSearch(false);
      return;
    }
    setLoadingSearch(true);
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({
            date,
            slotId,
            q: query.trim(),
          });
          const res = await fetch(`/api/club/attendance/leads/search?${params}`);
          const json = await readJsonResponse<{
            leads?: AttendanceLeadSearchHit[];
            error?: string;
          }>(res);
          if (cancelled) return;
          if (!res.ok) throw new Error(json.error ?? "Recherche impossible");
          setHits(json.leads ?? []);
          setListError(null);
        } catch (err) {
          if (cancelled) return;
          setHits([]);
          setListError(err instanceof Error ? err.message : "Erreur");
        } finally {
          if (!cancelled) setLoadingSearch(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, date, slotId]);

  async function handleReuse(lead: AttendanceLeadSearchHit) {
    if (lead.alreadyPresent) return;
    setBusyId(lead.leadId);
    try {
      await onReuse(lead);
      onClose();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmit() {
    setCreating(true);
    try {
      await onCreate({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      resetForm();
      onClose();
    } finally {
      setCreating(false);
    }
  }

  const canSubmit = firstName.trim() && lastName.trim() && phone.trim().length >= 8;
  const searching = query.trim().length >= 2;

  return (
    <ResponsiveDialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Ajouter un essai</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Déjà venus sur ce créneau
            </Typography>
            {loadingRecents ? <CircularProgress size={22} /> : null}
            {!loadingRecents ? (
              <AttendanceGuestLeadPickList
                leads={recents}
                busyId={busyId}
                emptyLabel="Aucun essai précédent sur ce créneau."
                onPick={(lead) => void handleReuse(lead)}
              />
            ) : null}
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Rechercher un essai
            </Typography>
            <TextField
              label="Nom ou téléphone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
            />
            {loadingSearch ? <CircularProgress size={22} /> : null}
            {listError ? (
              <Typography color="error" variant="body2">
                {listError}
              </Typography>
            ) : null}
            {searching && !loadingSearch ? (
              <AttendanceGuestLeadPickList
                leads={hits}
                busyId={busyId}
                emptyLabel="Aucun essai trouvé."
                onPick={(lead) => void handleReuse(lead)}
              />
            ) : null}
          </Stack>

          <Divider />

          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Nouvel essai
            </Typography>
            <TextField
              label="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Email (optionnel)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          disabled={!canSubmit || creating}
          onClick={() => void handleSubmit()}
          sx={{ minHeight: 48 }}
        >
          Pointer présent
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
