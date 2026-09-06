"use client";

import { useState } from "react";
import { Card, CardContent, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
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

type AnalyticsMembersTabProps = {
  summary: RegistrationAnalyticsSummary;
  sectionLabels: Record<string, string>;
};

type CategoryMode = "age" | "fftt";

const reductionLabels = Object.fromEntries(REDUCTION_OPTIONS.map((opt) => [opt.id, opt.label]));

function pct(part: number, total: number): string {
  if (total <= 0) return "0 %";
  return `${Math.round((part / total) * 100)} %`;
}

function ProfileStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" component="p" sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

/** Onglet Adhérents : profil démographique et pratique (sans pipeline). */
export function AnalyticsMembersTab({ summary, sectionLabels }: AnalyticsMembersTabProps) {
  const [categoryMode, setCategoryMode] = useState<CategoryMode>("age");

  const female = summary.sex.female ?? 0;
  const male = summary.sex.male ?? 0;
  const minors = summary.isMinor.minor ?? 0;
  const renewals = summary.wasSqyMemberLastYear.renewal ?? 0;
  const newcomers = summary.wasSqyMemberLastYear.new ?? 0;
  const competitors = summary.competitor.yes ?? 0;

  const sectionData = countBucketToChartData(
    summary.mainSection,
    Object.fromEntries(
      Object.keys(summary.mainSection).map((id) => [id, sectionLabel(id, sectionLabels)])
    )
  );

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
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <ProfileStat
            label="Femmes"
            value={String(female)}
            hint={`${pct(female, summary.total)} · Hommes ${male}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <ProfileStat
            label="Mineurs"
            value={String(minors)}
            hint={`${pct(minors, summary.total)} du total`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <ProfileStat
            label="Renouvellements"
            value={String(renewals)}
            hint={`${newcomers} nouveau(x)`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <ProfileStat
            label="Compétiteurs"
            value={String(competitors)}
            hint={`${pct(competitors, summary.total)} du total`}
          />
        </Grid>
      </Grid>

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
        <Grid size={{ xs: 12, md: 4 }}>
          <AnalyticsPieChart
            title="Sexe"
            data={countBucketToChartData(summary.sex, ANALYTICS_LABELS.sex, [
              "female",
              "male",
              "other",
              "unknown",
            ])}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AnalyticsPieChart
            title="Nouveaux vs renouvellements"
            data={countBucketToChartData(summary.wasSqyMemberLastYear, ANALYTICS_LABELS.renewal, [
              "renewal",
              "new",
              "unknown",
            ])}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AnalyticsPieChart
            title="Handisport"
            data={countBucketToChartData(summary.handisport, ANALYTICS_LABELS.handisport, [
              "leisure",
              "competition",
              "yes",
              "no",
            ])}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart title="Sections principales" data={sectionData} layout="horizontal" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart
            title="Sections additionnelles"
            data={additionalSectionData}
            layout="horizontal"
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
