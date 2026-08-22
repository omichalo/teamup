"use client";

import { Chip, Stack, TextField, Tooltip } from "@mui/material";
import { FilterCard } from "@/components/ui";
import {
  OCCUPANCY_STATUS_FILTER_OPTIONS,
  type OccupancyStatusFilter,
} from "@/lib/club-slot-occupancy/filter-groups";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  status: OccupancyStatusFilter;
  onStatusChange: (value: OccupancyStatusFilter) => void;
};

export function SlotOccupancyFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
}: Props) {
  return (
    <FilterCard marginBottom={0}>
      <Stack spacing={1.5}>
        <TextField
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Lieu, jour ou créneau…"
          size="small"
          fullWidth
          inputProps={{ "aria-label": "Filtrer les créneaux" }}
        />
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {OCCUPANCY_STATUS_FILTER_OPTIONS.map((option) => {
            const selected = status === option.value;
            return (
              <Tooltip key={option.value} title={option.help} enterDelay={300}>
                <Chip
                  label={option.label}
                  size="small"
                  clickable
                  color={selected ? "primary" : "default"}
                  variant={selected ? "filled" : "outlined"}
                  onClick={() => onStatusChange(option.value)}
                  aria-pressed={selected}
                  aria-label={`${option.label}. ${option.help}`}
                />
              </Tooltip>
            );
          })}
        </Stack>
      </Stack>
    </FilterCard>
  );
}
