"use client";

import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { minutesToTimeInput, timeInputToMinutes } from "@/lib/camps/time";
import type { CampSessionTemplate } from "@/lib/camps/types";

type Props = {
  title: string;
  sessions: CampSessionTemplate[];
  disabled?: boolean | undefined;
  onChange: (sessions: CampSessionTemplate[]) => void;
};

export function CampSiteScheduleEditor({
  title,
  sessions,
  disabled = false,
  onChange,
}: Props) {
  function updateRow(
    index: number,
    patch: Partial<{ label: string; start: string; end: string }>
  ) {
    onChange(
      sessions.map((session, i) => {
        if (i !== index) return session;
        let start = session.startMinutes;
        let end = session.endMinutes;
        if (patch.start !== undefined) {
          start = timeInputToMinutes(patch.start) ?? start;
          if (end <= start) end = start + 60;
        }
        if (patch.end !== undefined) {
          end = timeInputToMinutes(patch.end) ?? end;
        }
        return {
          label: patch.label !== undefined ? patch.label : session.label,
          startMinutes: start,
          endMinutes: end,
        };
      })
    );
  }

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Horaires — {title || "Formule"}
      </Typography>
      {sessions.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Aucun horaire. Ajoutez les créneaux types pour cette formule.
        </Typography>
      ) : null}
      <Stack spacing={1}>
        {sessions.map((session, index) => (
          <Stack
            key={`session-${index}`}
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ sm: "center" }}
          >
            <TextField
              label="Libellé"
              size="small"
              value={session.label}
              onChange={(e) => updateRow(index, { label: e.target.value })}
              disabled={disabled}
              sx={{ flex: 1.2 }}
            />
            <TextField
              label="Début"
              type="time"
              size="small"
              value={
                session.endMinutes > session.startMinutes
                  ? minutesToTimeInput(session.startMinutes)
                  : ""
              }
              onChange={(e) => updateRow(index, { start: e.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={disabled}
              sx={{ width: { sm: 130 } }}
            />
            <TextField
              label="Fin"
              type="time"
              size="small"
              value={
                session.endMinutes > session.startMinutes
                  ? minutesToTimeInput(session.endMinutes)
                  : ""
              }
              onChange={(e) => updateRow(index, { end: e.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={disabled}
              sx={{ width: { sm: 130 } }}
            />
            <IconButton
              aria-label="Retirer ce créneau type"
              size="small"
              color="error"
              disabled={disabled}
              onClick={() => onChange(sessions.filter((_, i) => i !== index))}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button
        size="small"
        startIcon={<AddIcon />}
        sx={{ mt: 1 }}
        disabled={disabled || sessions.length >= 12}
        onClick={() =>
          onChange([...sessions, { label: "", startMinutes: 0, endMinutes: 0 }])
        }
      >
        Ajouter un horaire
      </Button>
    </Box>
  );
}
