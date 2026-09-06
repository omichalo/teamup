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

/** Largeur y-axis horizontale : assez pour les libellés longs (villes, sections). */
function horizontalYAxisWidth(labels: string[]): number {
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
  return Math.min(240, Math.max(112, Math.ceil(longest * 7.2) + 12));
}

function horizontalChartHeight(rowCount: number, minHeight: number): number {
  return Math.max(minHeight, rowCount * 36 + 56);
}

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
  const chartHeight = horizontal ? horizontalChartHeight(data.length, height) : height;
  const yAxisWidth = horizontalYAxisWidth(labels);

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          {horizontal ? (
            <BarChart
              height={chartHeight}
              layout="horizontal"
              xAxis={[{ scaleType: "linear" }]}
              yAxis={[
                {
                  scaleType: "band",
                  data: labels,
                  width: yAxisWidth,
                  tickLabelStyle: { fontSize: 12 },
                },
              ]}
              series={[{ data: values, color: ANALYTICS_CHART_COLORS[0] }]}
              margin={{ left: 8, right: 16, top: 16, bottom: 40 }}
            />
          ) : (
            <BarChart
              height={chartHeight}
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
