"use client";

import { Box, Stack, Typography } from "@mui/material";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import type { SpreadsheetFormatContext } from "@/lib/club-registration/spreadsheet/format-context";
import { buildSpreadsheetRowPreviewLines } from "@/lib/club-registration/spreadsheet/spreadsheet-row-preview";

type Props = {
  row: RegistrationClientRecord;
  config: RegistrationConfigV1 | null;
  formatContext: SpreadsheetFormatContext;
};

export function SpreadsheetRowPreviewContent({ row, config, formatContext }: Props) {
  const lines = buildSpreadsheetRowPreviewLines(row, config, formatContext);
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || "Dossier";

  return (
    <Box sx={{ p: 0.5, maxWidth: 320 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        {name}
      </Typography>
      <Stack spacing={0.5}>
        {lines.map((line) => (
          <Box key={line.label} sx={{ display: "flex", gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72 }}>
              {line.label}
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {line.value}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
