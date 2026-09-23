"use client";

import { Box, CircularProgress, Typography } from "@mui/material";
import type { AttendanceSlotAnalytics } from "@/lib/attendance/types";
import { SlotAttendanceTimelineChart } from "./SlotAttendanceTimelineChart";

type Props = {
  analytics: AttendanceSlotAnalytics | null;
  loading: boolean;
  error: string | null;
};

export function SlotOccupancyEvolutionTab({ analytics, loading, error }: Props) {
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
    <SlotAttendanceTimelineChart
      sessions={analytics.sessions}
      capacity={analytics.kpis.capacity}
    />
  );
}
