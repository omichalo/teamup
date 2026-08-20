"use client";

import { Box, Button, Paper, Stack } from "@mui/material";

type Props = {
  onSearch: () => void;
  onGuest: () => void;
};

/** Hauteur réservée au-dessus du dock (boutons + safe area). */
export const ATTENDANCE_SESSION_DOCK_CLEARANCE =
  "calc(96px + env(safe-area-inset-bottom, 0px))";

export function AttendanceSessionDock({ onSearch, onGuest }: Props) {
  return (
    <Paper
      elevation={8}
      square
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 8,
        px: 2,
        pt: 1.5,
        pb: "calc(12px + env(safe-area-inset-bottom, 0px))",
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ maxWidth: 900, mx: "auto" }}>
        <Button variant="contained" fullWidth onClick={onSearch} sx={{ minHeight: 52 }}>
          Chercher un adhérent
        </Button>
        <Button variant="outlined" fullWidth onClick={onGuest} sx={{ minHeight: 52 }}>
          Ajouter un essai
        </Button>
      </Stack>
    </Paper>
  );
}

export function AttendanceSessionDockSpacer() {
  return <Box aria-hidden sx={{ height: ATTENDANCE_SESSION_DOCK_CLEARANCE, flexShrink: 0 }} />;
}
