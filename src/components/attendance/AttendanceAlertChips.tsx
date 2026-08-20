"use client";

import { Chip, Stack } from "@mui/material";
import { ATTENDANCE_ALERT_LABELS, type AttendanceAlert } from "@/lib/attendance/constants";

export function AttendanceAlertChips({ alerts }: { alerts: AttendanceAlert[] }) {
  if (alerts.length === 0) {
    return null;
  }
  return (
    <Stack direction="row" gap={0.75} flexWrap="wrap">
      {alerts.map((alert) => (
        <Chip key={alert} size="small" color="warning" label={ATTENDANCE_ALERT_LABELS[alert]} />
      ))}
    </Stack>
  );
}
