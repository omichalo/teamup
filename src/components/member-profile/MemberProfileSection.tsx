"use client";

import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

type Props = {
  title: string;
  subtitle?: string;
  icon: SvgIconComponent;
  action?: ReactNode;
  children: ReactNode;
};

/** Coquille de section pour la fiche adhérent. */
export function MemberProfileSection({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: Props) {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.75,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(40, 48, 109, 0.03)",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              flexShrink: 0,
            }}
          >
            <Icon fontSize="small" />
          </Box>
          <Box minWidth={0}>
            <Typography variant="h6" component="h2" sx={{ lineHeight: 1.25 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
      </Stack>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2 }}>{children}</Box>
    </Box>
  );
}
