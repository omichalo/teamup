"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  IconButton,
  Popover,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import { CalendarMonth as CalendarIcon } from "@mui/icons-material";
import type { PoolScheduleMatch } from "@/lib/shared/pool-schedule-utils";
import { groupPoolScheduleByJournee } from "@/lib/shared/pool-schedule-utils";

interface PoolSchedulePopoverProps {
  teamId: string;
  teamName: string;
  phase?: "aller" | "retour" | null;
  iconSize?: "small" | "medium" | "large";
  iconColor?: "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default";
}

function formatMatchDate(iso: string | null): string {
  if (!iso) return "Date à confirmer";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function MatchLine({ match }: { match: PoolScheduleMatch }) {
  return (
    <Box
      sx={{
        py: 0.75,
        px: 1,
        borderRadius: 1,
        bgcolor: match.involvesSqyPing ? "action.selected" : "transparent",
        borderLeft: match.involvesSqyPing ? 3 : 0,
        borderColor: "primary.main",
      }}
    >
      <Typography variant="body2" fontWeight={match.involvesSqyPing ? 600 : 400}>
        {match.nomEquipeA} — {match.nomEquipeB}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {formatMatchDate(match.date)}
      </Typography>
    </Box>
  );
}

export function PoolSchedulePopover({
  teamId,
  teamName,
  phase,
  iconSize = "small",
  iconColor = "default",
}: PoolSchedulePopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [schedule, setSchedule] = useState<PoolScheduleMatch[] | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ teamId });
      if (phase === "aller" || phase === "retour") {
        params.set("phase", phase);
      }
      const res = await fetch(`/api/fftt/pool-schedule?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setSchedule(data.schedule ?? []);
      setDivision(data.division ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le calendrier");
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, phase]);

  useEffect(() => {
    setSchedule(null);
    setDivision(null);
    setError(null);
  }, [teamId, phase]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTooltipOpen(false);
    setAnchorEl(event.currentTarget);
    if (schedule === null && !loading) {
      void fetchSchedule();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const byJournee = useMemo(() => {
    if (!schedule) return [];
    const grouped = groupPoolScheduleByJournee(schedule);
    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [schedule]);

  return (
    <>
      <Tooltip
        title="Calendrier de la poule (journées à venir)"
        open={open ? false : tooltipOpen}
        onOpen={() => {
          if (!open) setTooltipOpen(true);
        }}
        onClose={() => setTooltipOpen(false)}
      >
        <span>
          <IconButton
            size={iconSize}
            onClick={handleOpen}
            aria-label="Calendrier de la poule"
            color={iconColor}
            sx={{ ml: 0.25 }}
          >
            <CalendarIcon fontSize={iconSize} />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 360,
            width: "max-content",
            maxWidth: "min(95vw, 520px)",
            maxHeight: "min(75vh, 620px)",
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", maxHeight: "min(75vh, 620px)" }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "success.main", color: "success.contrastText" }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Calendrier — {teamName}
            </Typography>
            {division && (
              <Typography variant="caption" sx={{ opacity: 0.9, display: "block", mt: 0.25 }}>
                {division} · journées à venir
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            )}
            {error && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
            {!loading && !error && schedule && schedule.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                Aucune journée à venir dans cette poule.
              </Typography>
            )}
            {!loading && !error && byJournee.length > 0 && (
              <Stack spacing={2} divider={<Divider flexItem />}>
                {byJournee.map(([journee, matches]) => (
                  <Box key={journee}>
                    <Chip label={`Journée ${journee}`} size="small" color="success" sx={{ mb: 1 }} />
                    <Stack spacing={0.5}>
                      {matches.map((m, idx) => (
                        <MatchLine key={`${journee}-${idx}-${m.nomEquipeA}`} match={m} />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  );
}
