"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { AttendanceAlertChips } from "@/components/attendance/AttendanceAlertChips";
import { SLOT_ENROLLMENTS_CLOSED_LABEL } from "@/lib/club-registration-config/slot-enrollments";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type {
  SlotOccupancyEnrolledPerson,
  SlotOccupancySummary,
} from "@/lib/club-slot-occupancy/types";
import { SlotEnrollmentsToggle } from "./SlotEnrollmentsToggle";

type Props = {
  slot: SlotOccupancySummary | null;
  onClose: () => void;
  canManageEnrollments: boolean;
  enrollmentsBusy: boolean;
  onToggleEnrollments: (slot: SlotOccupancySummary) => void | Promise<void>;
};

type DetailPayload = {
  enrolled?: SlotOccupancyEnrolledPerson[];
  error?: string;
};

export function SlotOccupancyEnrolledDrawer({
  slot,
  onClose,
  canManageEnrollments,
  enrollmentsBusy,
  onToggleEnrollments,
}: Props) {
  const [enrolled, setEnrolled] = useState<SlotOccupancyEnrolledPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!slot) {
      setEnrolled([]);
      setError(null);
      setFilter("");
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/club/slots/occupancy/${encodeURIComponent(slot.slotId)}`);
        const json = await readJsonResponse<DetailPayload>(res);
        if (!res.ok || !json.enrolled) {
          throw new Error(json.error ?? "Impossible de charger les inscrits");
        }
        if (!cancelled) setEnrolled(json.enrolled);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur");
          setEnrolled([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slot]);

  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? enrolled.filter((person) => person.displayName.toLowerCase().includes(needle))
    : enrolled;

  return (
    <Drawer
      anchor="right"
      open={slot != null}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
    >
      {slot ? (
        <Stack spacing={2} sx={{ p: 2.5, height: "100%" }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography variant="h6" component="h2">
                {slot.label}
              </Typography>
              {slot.scheduleLabel ? (
                <Typography variant="body2" color="text.secondary">
                  {slot.scheduleLabel}
                </Typography>
              ) : null}
              <Typography variant="body2" color="text.secondary">
                {slot.capacity != null
                  ? `${slot.enrolledCount} / ${slot.capacity} inscrits`
                  : `${slot.enrolledCount} inscrit${slot.enrolledCount > 1 ? "s" : ""}`}
              </Typography>
              {slot.enrollmentsClosed ? (
                <Chip
                  size="small"
                  color="warning"
                  label={SLOT_ENROLLMENTS_CLOSED_LABEL}
                  sx={{ alignSelf: "flex-start", mt: 0.5 }}
                />
              ) : null}
              {canManageEnrollments ? (
                <Box sx={{ pt: 0.5 }}>
                  <SlotEnrollmentsToggle
                    closed={slot.enrollmentsClosed}
                    busy={enrollmentsBusy}
                    slotLabel={slot.label}
                    onToggle={() => onToggleEnrollments(slot)}
                  />
                </Box>
              ) : null}
            </Stack>
            <IconButton aria-label="Fermer la liste des inscrits" onClick={onClose}>
              <Close />
            </IconButton>
          </Stack>
          <TextField
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer la liste…"
            size="small"
            fullWidth
            inputProps={{ "aria-label": "Filtrer les inscrits" }}
          />
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : visible.length === 0 ? (
            <Typography color="text.secondary">Aucun inscrit sur ce créneau.</Typography>
          ) : (
            <Stack spacing={1.25} sx={{ overflow: "auto", pb: 2 }}>
              {visible.map((person) => (
                <Box
                  key={person.personKey}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 1.5,
                  }}
                >
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
              ))}
            </Stack>
          )}
        </Stack>
      ) : null}
    </Drawer>
  );
}
