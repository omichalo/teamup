"use client";

import { Button, Paper, Stack, Typography } from "@mui/material";

type CompositionSelectionBarProps = {
  playerLabel: string | null;
  onCancel: () => void;
};

export function CompositionSelectionBar({
  playerLabel,
  onCancel,
}: CompositionSelectionBarProps) {
  if (!playerLabel) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        position: "sticky",
        bottom: { xs: 8, md: 16 },
        zIndex: 6,
        px: 2,
        py: 1.25,
        border: 1,
        borderColor: "primary.main",
        bgcolor: "background.paper",
      }}
      role="status"
      aria-live="polite"
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Typography variant="body2">
          <Typography component="span" fontWeight={700}>
            {playerLabel}
          </Typography>
          {" — tapez une équipe pour l’assigner"}
        </Typography>
        <Button size="small" variant="outlined" onClick={onCancel}>
          Annuler
        </Button>
      </Stack>
    </Paper>
  );
}

export function formatPlayerSelectionLabel(
  players: Array<{ id: string; firstName: string; name: string }>,
  selectedPlayerId: string | null
): string | null {
  if (!selectedPlayerId) return null;
  const player = players.find((item) => item.id === selectedPlayerId);
  return player ? `${player.firstName} ${player.name}` : null;
}
