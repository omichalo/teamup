"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { TabPanel } from "@/components/ui";
import { SLOT_ENROLLMENTS_CLOSED_LABEL } from "@/lib/club-registration-config/slot-enrollments";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { AttendancePlayerStat } from "@/lib/attendance/types";
import type {
  SlotOccupancyEnrolledPerson,
  SlotOccupancySummary,
} from "@/lib/club-slot-occupancy/types";
import { SlotEnrollmentsToggle } from "./SlotEnrollmentsToggle";
import { SlotOccupancyAttendanceTab } from "./SlotOccupancyAttendanceTab";
import { SlotOccupancyEnrolledTab } from "./SlotOccupancyEnrolledTab";
import { SlotOccupancyEvolutionTab } from "./SlotOccupancyEvolutionTab";
import { useSlotAttendanceAnalytics } from "./useSlotAttendanceAnalytics";

type Props = {
  slot: SlotOccupancySummary | null;
  onClose: () => void;
  canManageEnrollments: boolean;
  enrollmentsBusy: boolean;
  onToggleEnrollments: (slot: SlotOccupancySummary) => void | Promise<void>;
};

const TAB_BASE = "slot-occupancy-detail";

export function SlotOccupancyDetailDrawer({
  slot,
  onClose,
  canManageEnrollments,
  enrollmentsBusy,
  onToggleEnrollments,
}: Props) {
  const [tab, setTab] = useState(0);
  const [enrolled, setEnrolled] = useState<SlotOccupancyEnrolledPerson[]>([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [enrolledError, setEnrolledError] = useState<string | null>(null);

  const slotId = slot?.slotId ?? null;
  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useSlotAttendanceAnalytics(slotId);

  useEffect(() => {
    setTab(0);
  }, [slotId]);

  useEffect(() => {
    if (!slot) {
      setEnrolled([]);
      setEnrolledError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setEnrolledLoading(true);
      setEnrolledError(null);
      try {
        const res = await fetch(`/api/club/slots/occupancy/${encodeURIComponent(slot.slotId)}`);
        const json = await readJsonResponse<{
          enrolled?: SlotOccupancyEnrolledPerson[];
          error?: string;
        }>(res);
        if (!res.ok || !json.enrolled) {
          throw new Error(json.error ?? "Impossible de charger les inscrits");
        }
        if (!cancelled) setEnrolled(json.enrolled);
      } catch (err) {
        if (!cancelled) {
          setEnrolledError(err instanceof Error ? err.message : "Erreur");
          setEnrolled([]);
        }
      } finally {
        if (!cancelled) setEnrolledLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slot]);

  const playersByRegId = useMemo(() => {
    const map = new Map<string, AttendancePlayerStat>();
    for (const player of analytics?.players ?? []) {
      map.set(player.registrationId, player);
    }
    return map;
  }, [analytics]);

  return (
    <Drawer
      anchor="right"
      open={slot != null}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 560, md: 640 } } }}
    >
      {slot ? (
        <Stack spacing={1.5} sx={{ p: 2.5, height: "100%", minHeight: 0 }}>
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
            <IconButton aria-label="Fermer le détail du créneau" onClick={onClose}>
              <Close />
            </IconButton>
          </Stack>

          <Tabs
            value={tab}
            onChange={(_, value: number) => setTab(value)}
            variant="fullWidth"
            aria-label="Détail du créneau"
          >
            <Tab
              label="Inscrits"
              id={`${TAB_BASE}-tab-0`}
              aria-controls={`${TAB_BASE}-tabpanel-0`}
            />
            <Tab
              label="Présences"
              id={`${TAB_BASE}-tab-1`}
              aria-controls={`${TAB_BASE}-tabpanel-1`}
            />
            <Tab
              label="Évolution"
              id={`${TAB_BASE}-tab-2`}
              aria-controls={`${TAB_BASE}-tabpanel-2`}
            />
          </Tabs>

          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <TabPanel value={tab} index={0} baseId={TAB_BASE} contentSx={{ height: "100%" }}>
              <SlotOccupancyEnrolledTab
                enrolled={enrolled}
                playersByRegId={playersByRegId}
                loading={enrolledLoading}
                error={enrolledError}
              />
            </TabPanel>
            <TabPanel value={tab} index={1} baseId={TAB_BASE} contentSx={{ height: "100%" }}>
              <SlotOccupancyAttendanceTab
                analytics={analytics}
                loading={analyticsLoading}
                error={analyticsError}
              />
            </TabPanel>
            <TabPanel value={tab} index={2} baseId={TAB_BASE} contentSx={{ height: "100%" }}>
              <SlotOccupancyEvolutionTab
                analytics={analytics}
                loading={analyticsLoading}
                error={analyticsError}
              />
            </TabPanel>
          </Box>
        </Stack>
      ) : null}
    </Drawer>
  );
}
