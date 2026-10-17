"use client";

import { useEffect, useState } from "react";
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";

export type CampExternalMarkPayload = {
  firstName: string;
  lastName: string;
  phone?: string;
  note?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CampExternalMarkPayload) => Promise<void>;
};

export function CampExternalMarkDialog({ open, onClose, onSubmit }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      setPhone("");
      setNote("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function handleSubmit() {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      setError("Nom et prénom requis");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        firstName: trimmedFirst,
        lastName: trimmedLast,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveDialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Ajouter un extérieur</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Non-adhérent non inscrit au stage — hors file des essais.
          </Typography>
          <TextField
            autoFocus
            label="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Téléphone (optionnel)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
          />
          <TextField
            label="Note (optionnel)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
          />
          {error ? (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={busy}
          sx={{ minHeight: 44 }}
        >
          Pointer présent
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
