"use client";

import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import type { AttendancePlayerStat } from "@/lib/attendance/types";

type Props = {
  players: AttendancePlayerStat[];
  title?: string;
  emptyMessage?: string;
};

export function AttendancePlayersRateList({
  players,
  title,
  emptyMessage = "Aucun inscrit sur ce créneau.",
}: Props) {
  return (
    <Stack spacing={2}>
      {title ? (
        <Typography variant="subtitle1" component="h3">
          {title}
        </Typography>
      ) : null}
      {players.length === 0 ? (
        <Typography color="text.secondary">{emptyMessage}</Typography>
      ) : (
        players.map((player) => {
          const percent = player.rate == null ? 0 : Math.round(player.rate * 100);
          return (
            <Box key={player.registrationId}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography sx={{ minWidth: 0 }}>{player.displayName}</Typography>
                <Typography color="text.secondary" sx={{ flexShrink: 0 }}>
                  {player.presentCount}/{player.expectedCount}
                  {player.rate != null ? ` · ${percent} %` : ""}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, percent)}
                sx={{ height: 10, borderRadius: 1, mt: 0.5 }}
                aria-label={`Taux de présence ${player.displayName}`}
              />
            </Box>
          );
        })
      )}
    </Stack>
  );
}
