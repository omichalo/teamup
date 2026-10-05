"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { ATTENDANCE_COACH_MESSAGE_MAX_LENGTH } from "@/lib/attendance/constants";
import { readJsonResponse } from "@/lib/http/read-json-response";

export type CoachMessageScope = "slot" | "day" | "week";

type Props = {
  date: string;
  slotId: string;
  coachMessage: string | null;
  canManage: boolean;
  weekLabel?: string | undefined;
  onChanged: () => Promise<void>;
};

type PendingAction = {
  mode: "save" | "clear";
  scope: CoachMessageScope;
};

function scopeConfirmLabel(
  scope: CoachMessageScope,
  date: string,
  weekLabel: string | undefined
): string {
  if (scope === "week") {
    return `toute la semaine (${weekLabel ?? date})`;
  }
  if (scope === "day") {
    return `tous les créneaux du ${date}`;
  }
  return "ce créneau uniquement";
}

export function AttendanceSessionCoachMessage({
  date,
  slotId,
  coachMessage,
  canManage,
  weekLabel,
  onChanged,
}: Props) {
  const [draft, setDraft] = useState(coachMessage ?? "");
  const [scope, setScope] = useState<CoachMessageScope>("slot");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  /** Réduit par défaut : un admin-coach voit surtout le pointage. */
  const [editorExpanded, setEditorExpanded] = useState(false);

  useEffect(() => {
    setDraft(coachMessage ?? "");
  }, [coachMessage]);

  async function runAction(action: PendingAction) {
    setBusy(true);
    setError(null);
    try {
      const base =
        action.scope === "slot"
          ? { date, slotId, scope: "slot" as const }
          : { date, scope: action.scope };
      const payload =
        action.mode === "clear" ? base : { ...base, body: draft.trim() };

      const res = await fetch("/api/club/attendance/notes", {
        method: action.mode === "clear" ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await readJsonResponse<{ error?: string; updatedCount?: number }>(res);
      if (!res.ok) {
        throw new Error(json.error ?? "Impossible d'enregistrer le message");
      }
      setPending(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  function requestSave() {
    setError(null);
    if (scope === "slot") {
      void runAction({ mode: "save", scope });
      return;
    }
    setPending({ mode: "save", scope });
  }

  function requestClear() {
    setError(null);
    if (scope === "slot") {
      void runAction({ mode: "clear", scope });
      return;
    }
    setPending({ mode: "clear", scope });
  }

  if (!canManage && !coachMessage) {
    return null;
  }

  const trimmedDraft = draft.trim();
  const unchanged = trimmedDraft === (coachMessage ?? "").trim();
  /** Autoriser un fan-out jour/semaine même si le texte du créneau courant est inchangé. */
  const canSave = trimmedDraft.length > 0 && (!unchanged || scope !== "slot");
  const canClear =
    scope !== "slot" || Boolean(coachMessage) || trimmedDraft.length > 0;

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {coachMessage ? (
        <Alert severity="info" sx={{ whiteSpace: "pre-wrap" }}>
          <Typography variant="subtitle2" component="div" sx={{ mb: 0.5 }}>
            Message du bureau
          </Typography>
          {coachMessage}
        </Alert>
      ) : null}

      {canManage ? (
        <Accordion
          disableGutters
          elevation={0}
          expanded={editorExpanded}
          onChange={(_event, expanded) => setEditorExpanded(expanded)}
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="coach-message-editor-content"
            id="coach-message-editor-header"
            sx={{ minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}
          >
            <Typography variant="subtitle2">
              {coachMessage
                ? "Modifier le message aux entraîneurs"
                : "Écrire un message aux entraîneurs"}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <TextField
                label="Message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                multiline
                minRows={2}
                maxRows={6}
                fullWidth
                disabled={busy}
                inputProps={{ maxLength: ATTENDANCE_COACH_MESSAGE_MAX_LENGTH }}
                helperText={`${trimmedDraft.length}/${ATTENDANCE_COACH_MESSAGE_MAX_LENGTH}`}
              />
              <FormControl fullWidth size="small" disabled={busy}>
                <InputLabel id="coach-message-scope-label">Portée</InputLabel>
                <Select
                  labelId="coach-message-scope-label"
                  label="Portée"
                  value={scope}
                  onChange={(event) =>
                    setScope(event.target.value as CoachMessageScope)
                  }
                >
                  <MenuItem value="slot">Ce créneau uniquement</MenuItem>
                  <MenuItem value="day">Tous les créneaux du jour</MenuItem>
                  <MenuItem value="week">
                    Toute la semaine{weekLabel ? ` (${weekLabel})` : ""}
                  </MenuItem>
                </Select>
              </FormControl>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Button
                  variant="contained"
                  onClick={requestSave}
                  disabled={busy || !canSave}
                  sx={{ minHeight: 44 }}
                >
                  {busy && pending?.mode === "save" ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={requestClear}
                  disabled={busy || !canClear}
                  sx={{ minHeight: 44 }}
                >
                  Effacer
                </Button>
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>
      ) : null}

      <Dialog open={pending !== null} onClose={() => (busy ? undefined : setPending(null))}>
        <DialogTitle>
          {pending?.mode === "clear" ? "Effacer le message ?" : "Appliquer le message ?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pending
              ? `${pending.mode === "clear" ? "Effacer" : "Enregistrer"} pour ${scopeConfirmLabel(
                  pending.scope,
                  date,
                  weekLabel
                )}.`
              : null}
          </DialogContentText>
          {error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)} disabled={busy}>
            Annuler
          </Button>
          <Button
            variant="contained"
            color={pending?.mode === "clear" ? "error" : "primary"}
            disabled={busy || !pending}
            onClick={() => {
              if (pending) {
                void runAction(pending);
              }
            }}
          >
            {busy ? <CircularProgress size={22} color="inherit" /> : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
