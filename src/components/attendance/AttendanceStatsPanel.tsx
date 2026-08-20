"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { AttendanceSlotStats } from "@/lib/attendance/types";

type Props = {
  date: string;
  slotId: string | null;
};

export function AttendanceStatsPanel({ date, slotId }: Props) {
  const [stats, setStats] = useState<AttendanceSlotStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slotId) {
      setStats(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ date, slotId });
        const res = await fetch(`/api/club/attendance/stats?${params.toString()}`);
        const json = await readJsonResponse<{ stats?: AttendanceSlotStats; error?: string }>(res);
        if (!res.ok || !json.stats) {
          throw new Error(json.error ?? "Impossible de charger les stats");
        }
        if (!cancelled) setStats(json.stats);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, slotId]);

  if (!slotId) {
    return null;
  }
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (!stats) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Taux de présence (saison)</Typography>
      <Typography color="text.secondary">
        Séance : {stats.presentEnrolled}/{stats.enrolled} inscrits · {stats.walkin} hors
        créneau · {stats.guest} essai{stats.guest > 1 ? "s" : ""}
      </Typography>
      {stats.players.map((player) => {
        const percent = player.rate == null ? 0 : Math.round(player.rate * 100);
        return (
          <Box key={player.registrationId}>
            <Stack direction="row" justifyContent="space-between">
              <Typography>{player.displayName}</Typography>
              <Typography color="text.secondary">
                {player.presentCount}/{player.expectedCount}
                {player.rate != null ? ` · ${percent} %` : ""}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, percent)}
              sx={{ height: 10, borderRadius: 1, mt: 0.5 }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}
