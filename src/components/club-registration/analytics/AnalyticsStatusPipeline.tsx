"use client";

import {
  Box,
  ButtonBase,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { RegistrationStatus } from "@/lib/club-registration/registration-status";
import { buildStatusPipeline } from "@/lib/club-registration/analytics/status-pipeline";
import type { CountBucket } from "@/lib/club-registration/analytics/types";

type AnalyticsStatusPipelineProps = {
  statusBucket: CountBucket;
  activeStatus?: RegistrationStatus | "all";
  onSelectStatus?: (status: RegistrationStatus | "all") => void;
};

export function AnalyticsStatusPipeline({
  statusBucket,
  activeStatus = "all",
  onSelectStatus,
}: AnalyticsStatusPipelineProps) {
  const pipeline = buildStatusPipeline(statusBucket);
  const maxCumulative = Math.max(...pipeline.stages.map((s) => s.cumulativeReached), 1);

  if (pipeline.total === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Parcours des dossiers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aucune donnée pour ce filtre.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle1">Parcours des dossiers</Typography>
            <Typography variant="body2" color="text.secondary">
              Barre = dossiers ayant atteint cette étape ou plus loin · chiffre = stock actuel.
              Cliquez une étape pour filtrer.
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            {pipeline.completionPct} % payés
          </Typography>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(4, minmax(0, 1fr))",
            },
            gap: { xs: 1.5, sm: 1 },
          }}
        >
          {pipeline.stages.map((stage, index) => {
            const selected = activeStatus === stage.id;
            const reachRatio = stage.cumulativeReached / maxCumulative;
            return (
              <ButtonBase
                key={stage.id}
                onClick={() => {
                  if (!onSelectStatus) return;
                  onSelectStatus(selected ? "all" : stage.id);
                }}
                disabled={!onSelectStatus}
                sx={{
                  display: "block",
                  textAlign: "left",
                  borderRadius: 2,
                  border: 1,
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "action.selected" : "background.paper",
                  p: 1.5,
                  position: "relative",
                }}
                aria-pressed={selected}
                aria-label={`Filtrer sur ${stage.label}`}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {index + 1}. {stage.label}
                </Typography>
                <Typography variant="h5" component="p" sx={{ mt: 0.5, lineHeight: 1.2 }}>
                  {stage.stock}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stage.cumulativeReached} ont atteint · {stage.cumulativePct} %
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    stage.cumulativeReached <= 0 ? 0 : Math.max(6, Math.round(reachRatio * 100))
                  }
                  sx={{
                    mt: 1.25,
                    height: 8,
                    borderRadius: 1,
                    bgcolor: "action.hover",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 1,
                      bgcolor: selected ? "primary.main" : "primary.light",
                    },
                  }}
                />
              </ButtonBase>
            );
          })}
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mt: 2 }}
        >
          <Typography variant="body2" color="text.secondary">
            Refusés : <strong>{pipeline.rejected}</strong>
            {pipeline.total > 0 ? ` (${pipeline.rejectedPct} %)` : null}
            {" · "}
            Parcours principal : <strong>{pipeline.mainPathTotal}</strong>
          </Typography>
          {activeStatus !== "all" && onSelectStatus ? (
            <ButtonBase
              onClick={() => onSelectStatus("all")}
              sx={{ color: "primary.main", typography: "body2", fontWeight: 600 }}
            >
              Afficher tout le parcours
            </ButtonBase>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
