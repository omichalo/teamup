"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  }) => Promise<void>;
};

export function AttendanceGuestDialog({ open, onClose, onSubmit }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
  }

  async function handleSubmit() {
    setBusy(true);
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      reset();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = firstName.trim() && lastName.trim() && phone.trim().length >= 8;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Ajouter un essai</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          disabled={!canSubmit || busy}
          onClick={() => void handleSubmit()}
          sx={{ minHeight: 48 }}
        >
          Pointer présent
        </Button>
      </DialogActions>
    </Dialog>
  );
}
