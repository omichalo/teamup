"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { AttendanceSlotOption } from "@/lib/attendance/types";
import { formatMinutesAsLabel } from "@/lib/club-registration-config/slot-schedule";
import { SLOT_ENROLLMENTS_CLOSED_LABEL } from "@/lib/club-registration-config/slot-enrollments";

type Props = {
  slots: AttendanceSlotOption[];
  loading: boolean;
  error: string | null;
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
};

export function AttendanceSlotPicker({
  slots,
  loading,
  error,
  selectedSlotId,
  onSelect,
}: Props) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (slots.length === 0) {
    return (
      <Alert severity="info">Aucun créneau prévu pour ce jour.</Alert>
    );
  }

  const bySite = new Map<string, AttendanceSlotOption[]>();
  for (const slot of slots) {
    const list = bySite.get(slot.siteLabel) ?? [];
    list.push(slot);
    bySite.set(slot.siteLabel, list);
  }

  return (
    <Stack spacing={2}>
      {[...bySite.entries()].map(([siteLabel, siteSlots]) => (
        <Box key={siteLabel}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {siteLabel}
            {siteSlots[0]?.gymnasiumName ? ` · ${siteSlots[0].gymnasiumName}` : ""}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            {siteSlots.map((slot) => {
              const selected = slot.slotId === selectedSlotId;
              return (
                <Button
                  key={slot.slotId}
                  variant={selected ? "contained" : "outlined"}
                  color={slot.highlighted ? "secondary" : "primary"}
                  onClick={() => onSelect(slot.slotId)}
                  sx={{
                    minHeight: 64,
                    px: 2,
                    justifyContent: "flex-start",
                    textAlign: "left",
                    borderWidth: slot.highlighted ? 2 : 1,
                  }}
                >
                  <Stack spacing={0.25} alignItems="flex-start">
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {formatMinutesAsLabel(slot.startMinutes)} –{" "}
                      {formatMinutesAsLabel(slot.endMinutes)}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      {slot.label}
                    </Typography>
                    {slot.highlighted ? (
                      <Chip size="small" label="Proche de maintenant" />
                    ) : null}
                    {slot.enrollmentsClosed ? (
                      <Chip size="small" color="warning" label={SLOT_ENROLLMENTS_CLOSED_LABEL} />
                    ) : null}
                  </Stack>
                </Button>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
