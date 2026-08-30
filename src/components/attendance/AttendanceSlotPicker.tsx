"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Undo from "@mui/icons-material/Undo";
import type { AttendanceSlotOption } from "@/lib/attendance/types";
import { formatMinutesAsLabel } from "@/lib/club-registration-config/slot-schedule";
import { SLOT_ENROLLMENTS_CLOSED_LABEL } from "@/lib/club-registration-config/slot-enrollments";

type Props = {
  slots: AttendanceSlotOption[];
  loading: boolean;
  error: string | null;
  selectedSlotId: string | null;
  canManageCancellations: boolean;
  onSelect: (slotId: string) => void;
  onCancelSlot?: ((slot: AttendanceSlotOption) => void) | undefined;
  onRestoreSlot?: ((slot: AttendanceSlotOption) => void) | undefined;
};

export function AttendanceSlotPicker({
  slots,
  loading,
  error,
  selectedSlotId,
  canManageCancellations,
  onSelect,
  onCancelSlot,
  onRestoreSlot,
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
    return <Alert severity="info">Aucun créneau prévu pour ce jour.</Alert>;
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
              const cancelled = slot.cancelled === true;
              return (
                <Stack
                  key={slot.slotId}
                  direction="row"
                  alignItems="stretch"
                  sx={{
                    border: 1,
                    borderColor: cancelled
                      ? "divider"
                      : slot.highlighted
                        ? "secondary.main"
                        : "divider",
                    borderWidth: slot.highlighted && !cancelled ? 2 : 1,
                    borderRadius: 1,
                    opacity: cancelled ? 0.72 : 1,
                    bgcolor: cancelled ? "action.hover" : "transparent",
                  }}
                >
                  <Button
                    variant={selected ? "contained" : "text"}
                    color={slot.highlighted && !cancelled ? "secondary" : "primary"}
                    disabled={cancelled}
                    onClick={() => onSelect(slot.slotId)}
                    sx={{
                      minHeight: 64,
                      px: 2,
                      justifyContent: "flex-start",
                      textAlign: "left",
                      borderRadius: 0,
                      flex: 1,
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
                      {cancelled ? <Chip size="small" label="Annulé" color="default" /> : null}
                      {!cancelled && slot.highlighted ? (
                        <Chip size="small" label="Proche de maintenant" />
                      ) : null}
                      {slot.enrollmentsClosed ? (
                        <Chip
                          size="small"
                          color="warning"
                          label={SLOT_ENROLLMENTS_CLOSED_LABEL}
                        />
                      ) : null}
                    </Stack>
                  </Button>
                  {canManageCancellations ? (
                    cancelled ? (
                      <IconButton
                        aria-label={`Restaurer ${slot.label}`}
                        onClick={() => onRestoreSlot?.(slot)}
                        sx={{ borderRadius: 0, px: 1.25 }}
                      >
                        <Undo fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton
                        aria-label={`Supprimer ${slot.label}`}
                        color="error"
                        onClick={() => onCancelSlot?.(slot)}
                        sx={{ borderRadius: 0, px: 1.25 }}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    )
                  ) : null}
                </Stack>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
