"use client";

import { Paper, Stack, Typography } from "@mui/material";
import type { RecruitmentCityInsight } from "@/lib/club-registration/analytics/campaign-insights";

type AnalyticsRecruitmentInsightsProps = {
  insights: RecruitmentCityInsight[];
};

export function AnalyticsRecruitmentInsights({ insights }: AnalyticsRecruitmentInsightsProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Top villes de recrutement
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Nouveaux adhérents (hors renouvellements), par commune de résidence.
      </Typography>
      <Stack component="ol" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
        {insights.map((insight, index) => (
          <Typography key={insight.city} component="li" variant="body2">
            <strong>
              {index + 1}. {insight.city}
            </strong>
            {" — "}
            {insight.count} nouveau{insight.count > 1 ? "x" : ""}
          </Typography>
        ))}
      </Stack>
    </Paper>
  );
}
