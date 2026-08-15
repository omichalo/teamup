"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  canApplyPpsFollowUpEvent,
  isPpsFollowUpApplicable,
  PPS_FOLLOW_UP_EVENT_LABELS,
  PPS_FOLLOW_UP_NOTE_MAX_LENGTH,
  PPS_FOLLOW_UP_STATUS_LABELS,
  type PpsFollowUpEventType,
  type PpsFollowUpState,
} from "@/lib/club-registration/pps-follow-up";

type Props = {
  registrationId: string;
  medicalCertificateDeclaration: string | null | undefined;
  ppsFollowUp: PpsFollowUpState;
  onUpdated: (next: PpsFollowUpState) => void | Promise<void>;
};

const ACTION_BUTTONS: {
  type: PpsFollowUpEventType;
  label: string;
  variant?: "contained" | "outlined";
  color?: "primary" | "success" | "warning";
}[] = [
  { type: "control_incomplete", label: "Contrôle — non fait", color: "warning" },
  { type: "reminder", label: "Relance", variant: "outlined" },
  { type: "marked_ok", label: "PPS OK", color: "success" },
  { type: "reopened", label: "Réouvrir", variant: "outlined" },
];

function formatEventAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PpsFollowUpPanel({
  registrationId,
  medicalCertificateDeclaration,
  ppsFollowUp,
  onUpdated,
}: Props) {
  const [localOverride, setLocalOverride] = useState<PpsFollowUpState | null>(null);
  const [note, setNote] = useState("");
  const [savingType, setSavingType] = useState<PpsFollowUpEventType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalOverride(null);
    setNote("");
    setError(null);
  }, [registrationId]);

  const state = localOverride ?? ppsFollowUp;

  if (!isPpsFollowUpApplicable(medicalCertificateDeclaration)) {
    return null;
  }

  const handleAction = async (type: PpsFollowUpEventType) => {
    if (!canApplyPpsFollowUpEvent(state.status, type)) {
      return;
    }
    setSavingType(type);
    setError(null);
    try {
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(registrationId)}/pps-follow-up`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            note: note.trim().length > 0 ? note.trim() : undefined,
          }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        ppsFollowUp?: PpsFollowUpState;
      };
      if (!res.ok || !json.ppsFollowUp) {
        throw new Error(json.error || "Enregistrement PPS impossible");
      }
      setNote("");
      setLocalOverride(json.ppsFollowUp);
      await onUpdated(json.ppsFollowUp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSavingType(null);
    }
  };

  return (
    <Stack
      spacing={1.5}
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        useFlexGap
      >
        <Typography variant="subtitle2">Suivi PPS</Typography>
        <Chip
          size="small"
          label={PPS_FOLLOW_UP_STATUS_LABELS[state.status]}
          color={
            state.status === "ok"
              ? "success"
              : state.status === "checked_incomplete"
                ? "warning"
                : "default"
          }
        />
      </Stack>
      <TextField
        label="Note (optionnelle)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        fullWidth
        size="small"
        multiline
        minRows={2}
        inputProps={{ maxLength: PPS_FOLLOW_UP_NOTE_MAX_LENGTH }}
        helperText={`${note.trim().length}/${PPS_FOLLOW_UP_NOTE_MAX_LENGTH}`}
      />
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {ACTION_BUTTONS.map((action) => (
          <Button
            key={action.type}
            size="small"
            variant={action.variant ?? "contained"}
            color={action.color ?? "primary"}
            disabled={
              savingType !== null ||
              !canApplyPpsFollowUpEvent(state.status, action.type)
            }
            onClick={() => void handleAction(action.type)}
          >
            {savingType === action.type ? "…" : action.label}
          </Button>
        ))}
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {state.events.length > 0 ? (
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {state.events.map((event) => (
            <Box component="li" key={event.id} sx={{ mb: 0.75 }}>
              <Typography variant="body2">
                {formatEventAt(event.at)} — {PPS_FOLLOW_UP_EVENT_LABELS[event.type]}
              </Typography>
              {event.note ? (
                <Typography variant="caption" color="text.secondary">
                  {event.note}
                </Typography>
              ) : null}
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Aucun événement pour l’instant.
        </Typography>
      )}
    </Stack>
  );
}
