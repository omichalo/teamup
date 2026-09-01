"use client";

import { Box, Card, CardContent, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { ANALYTICS_CHART_COLORS } from "./chart-colors";

type ChartDatum = { id: string; label: string; value: number };

type AnalyticsBarChartProps = {
  title: string;
  data: ChartDatum[];
  layout?: "vertical" | "horizontal";
  height?: number;
};

export function AnalyticsBarChart({
  title,
  data,
  layout = "vertical",
  height = 280,
}: AnalyticsBarChartProps) {
  if (data.length === 0) {
    return (
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aucune donnée pour ce filtre.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const horizontal = layout === "horizontal";
  const labels = data.map((item) => item.label);
  const values = data.map((item) => item.value);

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          {horizontal ? (
            <BarChart
              height={height}
              layout="horizontal"
              xAxis={[{ scaleType: "linear" }]}
              yAxis={[{ scaleType: "band", data: labels }]}
              series={[{ data: values, color: ANALYTICS_CHART_COLORS[0] }]}
              margin={{ left: 120, right: 16, top: 16, bottom: 40 }}
            />
          ) : (
            <BarChart
              height={height}
              xAxis={[{ scaleType: "band", data: labels }]}
              series={[{ data: values, color: ANALYTICS_CHART_COLORS[0] }]}
              margin={{ left: 40, right: 16, top: 16, bottom: 40 }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
