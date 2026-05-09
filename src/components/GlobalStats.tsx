"use client";

import { useState } from "react";
import { Download as DownloadIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { AlertsCard } from "@/components/global-stats/AlertsCard";
import { BreakdownTableCard } from "@/components/global-stats/BreakdownTableCard";
import { DistributionCard } from "@/components/global-stats/DistributionCard";
import { OverviewCards } from "@/components/global-stats/OverviewCards";
import { PerformanceCard } from "@/components/global-stats/PerformanceCard";
import type { GlobalStatsData } from "@/components/global-stats/types";

interface GlobalStatsProps {
  stats: GlobalStatsData;
  onRefresh: () => Promise<void>;
  onExport: (format: "csv" | "pdf" | "excel") => Promise<void>;
  loading?: boolean;
}

export function GlobalStats({
  stats,
  onRefresh,
  onExport,
  loading = false,
}: GlobalStatsProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async (format: "csv" | "pdf" | "excel") => {
    try {
      setExporting(format);
      await onExport(format);
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Statistiques globales</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Actualisation..." : "Actualiser"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport("csv")}
            disabled={exporting === "csv"}
          >
            {exporting === "csv" ? "Export..." : "CSV"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport("pdf")}
            disabled={exporting === "pdf"}
          >
            {exporting === "pdf" ? "Export..." : "PDF"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport("excel")}
            disabled={exporting === "excel"}
          >
            {exporting === "excel" ? "Export..." : "Excel"}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        <OverviewCards stats={stats} />

        <Box sx={{ width: { xs: "100%", md: "50%" } }}>
          <PerformanceCard performance={stats.performance} />
        </Box>

        <Box sx={{ width: { xs: "100%", md: "50%" } }}>
          <DistributionCard
            distribution={stats.distribution}
            totalPlayers={stats.overview.totalPlayers}
          />
        </Box>

        <Box sx={{ width: { xs: "100%", md: "50%" } }}>
          <BreakdownTableCard
            title="Équipes par division"
            label="Division"
            rows={stats.distribution.teamsByDivision}
            total={stats.overview.totalTeams}
          />
        </Box>

        <Box sx={{ width: { xs: "100%", md: "50%" } }}>
          <BreakdownTableCard
            title="Matchs par mois"
            label="Mois"
            rows={stats.distribution.matchesByMonth}
            total={stats.overview.totalMatches}
          />
        </Box>

        <Box sx={{ width: "100%" }}>
          <AlertsCard alerts={stats.alerts} />
        </Box>
      </Box>
    </Box>
  );
}
