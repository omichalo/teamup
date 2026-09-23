"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AttendanceAlertChips } from "@/components/attendance/AttendanceAlertChips";
import type { AttendancePlayerStat } from "@/lib/attendance/types";
import type { SlotOccupancyEnrolledPerson } from "@/lib/club-slot-occupancy/types";

type SortMode = "name" | "rateAsc" | "rateDesc";

type Props = {
  enrolled: SlotOccupancyEnrolledPerson[];
  playersByRegId: Map<string, AttendancePlayerStat>;
  loading: boolean;
  error: string | null;
};

function ratePercent(stat: AttendancePlayerStat | undefined): number | null {
  if (!stat || stat.rate == null) return null;
  return Math.round(stat.rate * 100);
}

export function SlotOccupancyEnrolledTab({
  enrolled,
  playersByRegId,
  loading,
  error,
}: Props) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("name");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const filtered = needle
      ? enrolled.filter((person) => person.displayName.toLowerCase().includes(needle))
      : [...enrolled];

    filtered.sort((a, b) => {
      if (sort === "name") {
        return a.displayName.localeCompare(b.displayName, "fr");
      }
      const rateA = playersByRegId.get(a.registrationId)?.rate;
      const rateB = playersByRegId.get(b.registrationId)?.rate;
      const valA = rateA ?? (sort === "rateAsc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
      const valB = rateB ?? (sort === "rateAsc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
      if (valA !== valB) {
        return sort === "rateAsc" ? valA - valB : valB - valA;
      }
      return a.displayName.localeCompare(b.displayName, "fr");
    });
    return filtered;
  }, [enrolled, filter, playersByRegId, sort]);

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

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
        <TextField
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrer la liste…"
          size="small"
          fullWidth
          inputProps={{ "aria-label": "Filtrer les inscrits" }}
        />
        <FormControl size="small" sx={{ minWidth: { sm: 180 } }}>
          <InputLabel id="slot-enrolled-sort-label">Tri</InputLabel>
          <Select
            labelId="slot-enrolled-sort-label"
            label="Tri"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
          >
            <MenuItem value="name">Nom</MenuItem>
            <MenuItem value="rateAsc">Taux croissant</MenuItem>
            <MenuItem value="rateDesc">Taux décroissant</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      {visible.length === 0 ? (
        <Typography color="text.secondary">Aucun inscrit sur ce créneau.</Typography>
      ) : (
        <Stack spacing={1.25} sx={{ overflow: "auto", pb: 1 }}>
          {visible.map((person) => {
            const stat = playersByRegId.get(person.registrationId);
            const percent = ratePercent(stat);
            return (
              <Box
                key={person.personKey}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }}>
                      {person.displayName}
                      {person.age != null ? (
                        <Typography
                          component="span"
                          color="text.secondary"
                          sx={{ ml: 1, fontSize: "0.9rem", fontWeight: 400 }}
                        >
                          {person.age} ans
                        </Typography>
                      ) : null}
                    </Typography>
                    <AttendanceAlertChips alerts={person.alerts} />
                  </Box>
                  <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      {stat
                        ? `${stat.presentCount}/${stat.expectedCount}${
                            percent != null ? ` · ${percent} %` : ""
                          }`
                        : "—"}
                    </Typography>
                    {percent != null && percent < 50 ? (
                      <Chip size="small" color="warning" label="< 50 %" />
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
