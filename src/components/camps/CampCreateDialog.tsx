"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { seasonLabelFromYmd } from "@/lib/camps/season";
import { ZERO_PRICING_CENTS } from "./camp-pricing-draft";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (campId: string) => void;
};

export function CampCreateDialog({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setStartDate("");
    setEndDate("");
    setError(null);
    setSubmitting(false);
  }, [open]);

  const inferredSeason = startDate ? seasonLabelFromYmd(startDate) : null;

  async function handleSubmit() {
    setError(null);
    if (!title.trim() || !startDate || !endDate) {
      setError("Renseignez le titre et les dates.");
      return;
    }
    if (endDate < startDate) {
      setError("La date de fin doit être postérieure ou égale au début.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/club/camps", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: "",
          status: "draft",
          startDate,
          endDate,
          sites: [],
          pricing: ZERO_PRICING_CENTS,
        }),
      });
      const json = (await res.json()) as { camp?: { id: string }; error?: string };
      if (!res.ok || !json.camp) {
        throw new Error(json.error ?? "Création impossible");
      }
      onCreated(json.camp.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nouveau stage</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Typography variant="body2" color="text.secondary">
            Créez un brouillon : sites, tarifs et créneaux se configurent ensuite
            sur la fiche. La saison sportive est déduite de la date de début.
          </Typography>
          <TextField
            label="Titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            autoFocus
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Début"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="Fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </Stack>
          {inferredSeason ? (
            <Typography variant="body2" color="text.secondary">
              Saison : <strong>{inferredSeason}</strong> (sept. → août)
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={submitting}
        >
          Créer le brouillon
        </Button>
      </DialogActions>
    </Dialog>
  );
}
