"use client";

import { Box, Card, CardContent, Typography } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { ANALYTICS_CHART_COLORS } from "./chart-colors";

type ChartDatum = { id: string; label: string; value: number };

type AnalyticsPieChartProps = {
  title: string;
  data: ChartDatum[];
  height?: number;
};

export function AnalyticsPieChart({ title, data, height = 280 }: AnalyticsPieChartProps) {
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

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <PieChart
            height={height}
            series={[
              {
                data: data.map((item, index) => ({
                  id: item.id,
                  label: item.label,
                  value: item.value,
                  color: ANALYTICS_CHART_COLORS[index % ANALYTICS_CHART_COLORS.length],
                })),
                innerRadius: 40,
                paddingAngle: 2,
                cornerRadius: 4,
              },
            ]}
            margin={{ top: 8, bottom: 8, left: 8, right: 120 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
