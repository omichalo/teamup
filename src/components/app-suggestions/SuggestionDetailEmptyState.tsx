"use client";

import { Box, Stack, Typography } from "@mui/material";
import { TipsAndUpdates as TipsAndUpdatesIcon } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";

export function SuggestionDetailEmptyState() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: { xs: 240, md: 420 },
        px: 3,
        py: 6,
      }}
    >
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 400, textAlign: "center" }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            color: "primary.main",
            border: "1px solid",
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.12),
          }}
        >
          <TipsAndUpdatesIcon sx={{ fontSize: 38 }} />
        </Box>
        <Stack spacing={0.75}>
          <Typography variant="h6" component="p" fontWeight={700}>
            Sélectionnez une idée
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            Parcourez les propositions à gauche pour consulter le détail, suivre
            l&apos;avancement et échanger avec l&apos;équipe.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
