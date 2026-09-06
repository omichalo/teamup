"use client";

import { Button, Stack } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import {
  buildAnalyticsExportFilename,
  buildAnalyticsSummaryCsv,
  downloadAnalyticsCsv,
} from "@/lib/club-registration/analytics/export-summary-csv";
import type { RegistrationAnalyticsSummary } from "@/lib/club-registration/analytics/types";

type AnalyticsExportButtonProps = {
  summary: RegistrationAnalyticsSummary;
  sectionLabels: Record<string, string>;
  seasonLabel: string;
  disabled?: boolean;
};

export function AnalyticsExportButton({
  summary,
  sectionLabels,
  seasonLabel,
  disabled = false,
}: AnalyticsExportButtonProps) {
  const handleExport = () => {
    const content = buildAnalyticsSummaryCsv(summary, sectionLabels, seasonLabel);
    downloadAnalyticsCsv(buildAnalyticsExportFilename(seasonLabel), content);
  };

  return (
    <Stack direction="row" justifyContent="flex-end">
      <Button
        variant="outlined"
        size="small"
        startIcon={<DownloadOutlinedIcon />}
        onClick={handleExport}
        disabled={disabled || summary.total === 0}
      >
        Exporter les agrégats (CSV)
      </Button>
    </Stack>
  );
}
