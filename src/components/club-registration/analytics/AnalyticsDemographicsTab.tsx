"use client";

import { useState } from "react";
import { Grid, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { REDUCTION_OPTIONS } from "@/lib/club-registration/constants";
import {
  ANALYTICS_LABELS,
  ageBracketChartLabels,
  ageBracketChartOrder,
  countBucketToChartData,
  paymentAidLabel,
  sectionLabel,
} from "@/lib/club-registration/analytics/aggregate";
import type { RegistrationAnalyticsSummary } from "@/lib/club-registration/analytics/types";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { AnalyticsPieChart } from "./AnalyticsPieChart";

type AnalyticsDemographicsTabProps = {
  summary: RegistrationAnalyticsSummary;
  sectionLabels: Record<string, string>;
};

type CategoryMode = "age" | "fftt";

const reductionLabels = Object.fromEntries(REDUCTION_OPTIONS.map((opt) => [opt.id, opt.label]));

export function AnalyticsDemographicsTab({
  summary,
  sectionLabels,
}: AnalyticsDemographicsTabProps) {
  const [categoryMode, setCategoryMode] = useState<CategoryMode>("age");

  const additionalSectionData = countBucketToChartData(
    summary.additionalSections,
    Object.fromEntries(
      Object.keys(summary.additionalSections).map((id) => [id, sectionLabel(id, sectionLabels)])
    )
  );

  const categoryData =
    categoryMode === "age"
      ? countBucketToChartData(
          summary.ageBrackets,
          ageBracketChartLabels(),
          ageBracketChartOrder()
        )
      : countBucketToChartData(summary.ffttCategory, { unknown: "Sans licence FFTT" });

  return (
    <Stack spacing={3}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={categoryMode}
        onChange={(_, value: CategoryMode | null) => {
          if (value) setCategoryMode(value);
        }}
        aria-label="Mode catégorie"
      >
        <ToggleButton value="age">Tranches d&apos;âge</ToggleButton>
        <ToggleButton value="fftt">Catégorie FFTT</ToggleButton>
      </ToggleButtonGroup>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <AnalyticsBarChart
            title={categoryMode === "age" ? "Tranches d'âge" : "Catégories FFTT"}
            data={categoryData}
            height={320}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <AnalyticsPieChart
            title="Mineurs / majeurs"
            data={countBucketToChartData(summary.isMinor, ANALYTICS_LABELS.minor, [
              "minor",
              "adult",
              "unknown",
            ])}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsPieChart
            title="Handisport"
            data={countBucketToChartData(summary.handisport, ANALYTICS_LABELS.yesNo, ["yes", "no"])}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsPieChart
            title="Compétiteurs"
            data={countBucketToChartData(summary.competitor, ANALYTICS_LABELS.yesNo, ["yes", "no"])}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart
            title="Sections additionnelles"
            data={additionalSectionData}
            layout="horizontal"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart
            title="Aides au paiement"
            data={countBucketToChartData(summary.paymentAids, {
              ...reductionLabels,
              none: paymentAidLabel("none"),
            })}
            layout="horizontal"
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
