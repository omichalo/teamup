"use client";

import { Box, Card, CardContent, Typography } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import type { RegistrationTimeline } from "@/lib/club-registration/analytics/registration-timeline";
import { ANALYTICS_CHART_COLORS } from "./chart-colors";

type AnalyticsRegistrationTimelineChartProps = {
  timeline: RegistrationTimeline;
  height?: number;
};

export function AnalyticsRegistrationTimelineChart({
  timeline,
  height = 320,
}: AnalyticsRegistrationTimelineChartProps) {
  const { points, totalUnknownDate } = timeline;

  if (points.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Évolution des inscriptions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aucune date d&apos;inscription disponible pour ce filtre.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const labels = points.map((point) => point.label);
  const cumulative = points.map((point) => point.cumulativeCount);
  const daily = points.map((point) => point.dailyCount);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Évolution des inscriptions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Courbe cumulée et inscriptions par jour selon la date de soumission du dossier.
          {totalUnknownDate > 0
            ? ` ${totalUnknownDate} dossier(s) sans date exclu(s) du graphique.`
            : null}
        </Typography>
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <LineChart
            height={height}
            xAxis={[{ scaleType: "point", data: labels }]}
            series={[
              {
                id: "cumulative",
                label: "Cumul",
                data: cumulative,
                color: ANALYTICS_CHART_COLORS[0],
                showMark: points.length <= 31,
                curve: "monotoneX",
              },
              {
                id: "daily",
                label: "Par jour",
                data: daily,
                color: ANALYTICS_CHART_COLORS[1],
                showMark: false,
                curve: "monotoneX",
              },
            ]}
            margin={{ left: 48, right: 24, top: 16, bottom: 48 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
