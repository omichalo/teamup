"use client";

import { Box, Typography } from "@mui/material";

type Props = {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
  tone?: "default" | "success" | "warning" | "muted";
};

const TONE_SX = {
  default: {
    valueColor: "text.primary",
    bg: "rgba(40, 48, 109, 0.04)",
    border: "rgba(40, 48, 109, 0.08)",
  },
  success: {
    valueColor: "success.dark",
    bg: "rgba(46, 125, 50, 0.08)",
    border: "rgba(46, 125, 50, 0.18)",
  },
  warning: {
    valueColor: "warning.dark",
    bg: "rgba(237, 108, 2, 0.08)",
    border: "rgba(237, 108, 2, 0.2)",
  },
  muted: {
    valueColor: "text.secondary",
    bg: "rgba(82, 88, 113, 0.06)",
    border: "rgba(82, 88, 113, 0.12)",
  },
} as const;

export function MemberProfileMetric({
  label,
  value,
  hint,
  emphasize = false,
  tone = "default",
}: Props) {
  const palette = TONE_SX[tone];

  return (
    <Box
      sx={{
        flex: "1 1 140px",
        minWidth: 0,
        px: 2,
        py: 1.5,
        borderRadius: 2.5,
        bgcolor: palette.bg,
        border: "1px solid",
        borderColor: palette.border,
      }}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", lineHeight: 1.2 }}
      >
        {label}
      </Typography>
      <Typography
        variant={emphasize ? "h5" : "h6"}
        component="p"
        sx={{
          color: palette.valueColor,
          mt: 0.5,
          mb: 0,
          fontVariantNumeric: "tabular-nums",
          wordBreak: "break-word",
        }}
      >
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}
