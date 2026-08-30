"use client";

import { Button, Stack } from "@mui/material";
import type { AttendanceWeekSummary } from "@/lib/attendance/types";

type Props = {
  week: AttendanceWeekSummary | null;
  dayActiveCount: number;
  dayCancelledCount: number;
  weekLabel: string;
  disabled?: boolean;
  onCancelDay: () => void;
  onCancelWeek: () => void;
  onRestoreDay: () => void;
  onRestoreWeek: () => void;
};

export function AttendanceCancellationToolbar({
  week,
  dayActiveCount,
  dayCancelledCount,
  weekLabel,
  disabled = false,
  onCancelDay,
  onCancelWeek,
  onRestoreDay,
  onRestoreWeek,
}: Props) {
  const weekActive = week?.weekActiveCount ?? 0;
  const weekCancelled = week?.weekCancelledCount ?? 0;

  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      <Button
        variant="outlined"
        color="error"
        disabled={disabled || dayActiveCount === 0}
        onClick={onCancelDay}
        sx={{ minHeight: 44 }}
      >
        Supprimer les créneaux du jour
      </Button>
      <Button
        variant="outlined"
        color="error"
        disabled={disabled || weekActive === 0}
        onClick={onCancelWeek}
        sx={{ minHeight: 44 }}
      >
        Vider toute la semaine ({weekLabel})
      </Button>
      {dayCancelledCount > 0 ? (
        <Button
          variant="outlined"
          disabled={disabled}
          onClick={onRestoreDay}
          sx={{ minHeight: 44 }}
        >
          Restaurer le jour
        </Button>
      ) : null}
      {weekCancelled > 0 ? (
        <Button
          variant="outlined"
          disabled={disabled}
          onClick={onRestoreWeek}
          sx={{ minHeight: 44 }}
        >
          Restaurer la semaine
        </Button>
      ) : null}
    </Stack>
  );
}
