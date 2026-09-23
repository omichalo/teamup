"use client";

import { Box, Typography } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { ANALYTICS_CHART_COLORS } from "@/components/club-registration/analytics/chart-colors";
import type { AttendanceSessionPoint } from "@/lib/attendance/types";

type Props = {
  sessions: AttendanceSessionPoint[];
  capacity: number | null;
  height?: number;
};

function shortDateLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function SlotAttendanceTimelineChart({
  sessions,
  capacity,
  height = 280,
}: Props) {
  if (sessions.length === 0) {
    return (
      <Typography color="text.secondary">
        Aucune séance pointée pour afficher l&apos;évolution.
      </Typography>
    );
  }

  const labels = sessions.map((session) => shortDateLabel(session.date));
  const enrolled = sessions.map((session) => session.enrolled);
  const walkin = sessions.map((session) => session.walkin);
  const guest = sessions.map((session) => session.guest);
  const capacitySeries =
    capacity != null ? sessions.map(() => capacity) : null;

  return (
    <Box>
      <Typography variant="subtitle1" component="h3" gutterBottom>
        Présents par séance (pointages)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Effectifs réellement pointés, hors séances annulées. Ce n&apos;est pas
        l&apos;évolution du nombre d&apos;inscrits au catalogue.
      </Typography>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <LineChart
          height={height}
          xAxis={[{ scaleType: "point", data: labels }]}
          series={[
            {
              id: "enrolled",
              label: "Inscrits",
              data: enrolled,
              color: ANALYTICS_CHART_COLORS[0],
              showMark: sessions.length <= 24,
              curve: "monotoneX",
            },
            {
              id: "walkin",
              label: "Hors créneau",
              data: walkin,
              color: ANALYTICS_CHART_COLORS[1],
              showMark: false,
              curve: "monotoneX",
            },
            {
              id: "guest",
              label: "Essais",
              data: guest,
              color: ANALYTICS_CHART_COLORS[2],
              showMark: false,
              curve: "monotoneX",
            },
            ...(capacitySeries
              ? [
                  {
                    id: "capacity",
                    label: "Capacité",
                    data: capacitySeries,
                    color: ANALYTICS_CHART_COLORS[4],
                    showMark: false,
                    curve: "linear" as const,
                  },
                ]
              : []),
          ]}
          margin={{ left: 40, right: 16, top: 16, bottom: 40 }}
        />
      </Box>
    </Box>
  );
}
