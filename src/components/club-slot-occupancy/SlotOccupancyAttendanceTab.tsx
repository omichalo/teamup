"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { AttendancePlayersRateList } from "@/components/attendance/AttendancePlayersRateList";
import type { AttendanceSlotAnalytics } from "@/lib/attendance/types";
import { SlotAttendanceKpis } from "./SlotAttendanceKpis";

type Props = {
  analytics: AttendanceSlotAnalytics | null;
  loading: boolean;
  error: string | null;
};

export function SlotOccupancyAttendanceTab({ analytics, loading, error }: Props) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return <Typography color="error">{error}</Typography>;
  }
  if (!analytics) {
    return null;
  }

  return (
    <Stack spacing={2.5} sx={{ overflow: "auto", pb: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Synthèse saison {analytics.seasonLabel} (jusqu&apos;à aujourd&apos;hui). Dénominateur :
        séances de ce créneau où un pointage a eu lieu (depuis l&apos;inscription du joueur).
      </Typography>
      <SlotAttendanceKpis kpis={analytics.kpis} />
      <AttendancePlayersRateList
        players={analytics.players}
        title="Taux de présence par adhérent"
      />
    </Stack>
  );
}
