"use client";

import { Alert, Button, Stack } from "@mui/material";
import { AttendanceStatsPanel } from "./AttendanceStatsPanel";

type Props = {
  date: string;
  slotId: string;
  isCampSession: boolean;
};

export function AttendanceSessionStatsTab({ date, slotId, isCampSession }: Props) {
  if (isCampSession) {
    return (
      <Alert severity="info">Les stats d’entraînement ne s’appliquent pas aux stages.</Alert>
    );
  }
  return (
    <Stack spacing={2}>
      <Button
        variant="outlined"
        href={`/api/club/attendance/export?date=${encodeURIComponent(date)}&slotId=${encodeURIComponent(slotId)}`}
        sx={{ alignSelf: "flex-start", minHeight: 48 }}
      >
        Exporter CSV
      </Button>
      <AttendanceStatsPanel date={date} slotId={slotId} />
    </Stack>
  );
}
