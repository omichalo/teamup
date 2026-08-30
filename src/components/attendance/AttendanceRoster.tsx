"use client";

import { Stack, TextField, Typography } from "@mui/material";
import type { AttendanceRosterPerson } from "@/lib/attendance/types";
import { AttendancePlayerCard } from "./AttendancePlayerCard";

type Props = {
  title: string;
  people: AttendanceRosterPerson[];
  filter: string;
  onFilterChange?: (value: string) => void;
  busyKey: string | null;
  disabled?: boolean;
  onToggle: (person: AttendanceRosterPerson) => void;
  emptyLabel: string;
};

export function AttendanceRoster({
  title,
  people,
  filter,
  onFilterChange,
  busyKey,
  disabled = false,
  onToggle,
  emptyLabel,
}: Props) {
  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? people.filter((person) => person.displayName.toLowerCase().includes(needle))
    : people;

  return (
    <Stack spacing={1.25}>
      <Typography variant="h6">{title}</Typography>
      {onFilterChange ? (
        <TextField
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filtrer la liste…"
          size="medium"
          fullWidth
          disabled={disabled}
          inputProps={{ "aria-label": "Filtrer les inscrits" }}
        />
      ) : null}
      {visible.length === 0 ? (
        <Typography color="text.secondary">{emptyLabel}</Typography>
      ) : (
        visible.map((person) => (
          <AttendancePlayerCard
            key={person.personKey}
            person={person}
            busy={disabled || busyKey === person.personKey}
            onToggle={() => onToggle(person)}
          />
        ))
      )}
    </Stack>
  );
}
