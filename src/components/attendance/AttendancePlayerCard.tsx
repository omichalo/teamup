"use client";

import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import PersonRemoveOutlined from "@mui/icons-material/PersonRemoveOutlined";
import type { AttendanceRosterPerson } from "@/lib/attendance/types";
import { AttendanceAlertChips } from "./AttendanceAlertChips";

type Props = {
  person: AttendanceRosterPerson;
  busy: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onRemoveFromSlot?: (() => void) | undefined;
};

export function AttendancePlayerCard({
  person,
  busy,
  disabled = false,
  onToggle,
  onRemoveFromSlot,
}: Props) {
  const canRemove =
    person.kind === "enrolled" && Boolean(person.registrationId) && onRemoveFromSlot;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        border: 1,
        borderColor: person.present ? "success.main" : "divider",
        bgcolor: person.present ? "success.light" : "background.paper",
        borderRadius: 2,
        minHeight: 72,
      }}
    >
      <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" component="p" sx={{ fontSize: "1.15rem", lineHeight: 1.2 }}>
          {person.displayName}
          {person.age != null ? (
            <Typography component="span" color="text.secondary" sx={{ ml: 1, fontSize: "0.95rem" }}>
              {person.age} ans
            </Typography>
          ) : null}
        </Typography>
        <AttendanceAlertChips
          alerts={person.alerts}
          {...(person.registrationId
            ? { registrationId: person.registrationId }
            : {})}
        />
      </Stack>
      {canRemove ? (
        <IconButton
          aria-label={`Retirer ${person.displayName} du créneau`}
          onClick={onRemoveFromSlot}
          disabled={busy || disabled}
          color="default"
          sx={{ minWidth: 48, minHeight: 48 }}
        >
          <PersonRemoveOutlined />
        </IconButton>
      ) : null}
      <Button
        variant={person.present ? "contained" : "outlined"}
        color={person.present ? "success" : "primary"}
        onClick={onToggle}
        disabled={busy || disabled}
        sx={{ minHeight: 56, minWidth: 120, fontWeight: 700 }}
      >
        {person.present ? "Présent" : "Pointer"}
      </Button>
    </Box>
  );
}
