"use client";

import { Box, Stack, Typography } from "@mui/material";
import type { AttendanceSlotAnalyticsKpis } from "@/lib/attendance/types";

type Props = {
  kpis: AttendanceSlotAnalyticsKpis;
};

function formatRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)} %`;
}

function formatAvg(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function formatPeakDate(ymd: string | null): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

type KpiItem = { label: string; value: string; hint?: string };

export function SlotAttendanceKpis({ kpis }: Props) {
  const items: KpiItem[] = [
    {
      label: "Séances pointées",
      value: String(kpis.pointedSessionCount),
      ...(kpis.cancelledSessionCount > 0
        ? {
            hint: `${kpis.cancelledSessionCount} annulée${
              kpis.cancelledSessionCount > 1 ? "s" : ""
            }`,
          }
        : {}),
    },
    {
      label: "Moy. présents (inscrits)",
      value: formatAvg(kpis.avgPresentEnrolled),
    },
    {
      label: "Moy. présents (total)",
      value: formatAvg(kpis.avgPresentTotal),
      hint: "Inscrits + hors créneau + essais",
    },
    {
      label: "Pic de fréquentation",
      value:
        kpis.peakTotal != null
          ? `${kpis.peakTotal}${kpis.peakDate ? ` · ${formatPeakDate(kpis.peakDate)}` : ""}`
          : "—",
    },
    {
      label: "Assiduité moyenne",
      value: formatRate(kpis.avgPlayerRate),
    },
    {
      label: "Hors créneau / essais",
      value: `${kpis.seasonWalkinTotal} / ${kpis.seasonGuestTotal}`,
      hint: "Totaux saison",
    },
  ];

  if (kpis.capacity != null) {
    items.push({
      label: "Occupation vs capacité",
      value: formatRate(kpis.avgOccupancyVsCapacity),
      hint: `Capacité ${kpis.capacity}`,
    });
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" },
        gap: 1.25,
      }}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            p: 1.25,
          }}
        >
          <Stack spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {item.value}
            </Typography>
            {item.hint ? (
              <Typography variant="caption" color="text.secondary">
                {item.hint}
              </Typography>
            ) : null}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
