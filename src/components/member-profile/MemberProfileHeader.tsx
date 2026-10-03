"use client";

import { Avatar, Box, Chip, Stack, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import BadgeIcon from "@mui/icons-material/Badge";
import TagIcon from "@mui/icons-material/Tag";
import type { MemberProfileResponse } from "@/lib/member-profile/types";
import {
  MES_INSCRIPTION_STATUS_COLOR,
  MES_INSCRIPTION_STATUS_LABEL,
} from "@/components/club-registration/mes-inscriptions-shared";
import { MemberProfileMetric } from "./MemberProfileMetric";
import { SQYPING_GRADIENT } from "@/theme/sqyping-theme";

function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

type Props = {
  profile: MemberProfileResponse;
};

export function MemberProfileHeader({ profile }: Props) {
  const { identity, slots, attendance, finance } = profile;
  const statusLabel = identity.status
    ? MES_INSCRIPTION_STATUS_LABEL[identity.status] ?? identity.status
    : null;
  const statusColor = identity.status
    ? MES_INSCRIPTION_STATUS_COLOR[identity.status] ?? "default"
    : "default";

  const balanceTone =
    finance.totals.balanceCents <= 0
      ? "success"
      : finance.totals.receivedCents > 0
        ? "warning"
        : "default";

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box
        aria-hidden
        sx={{
          height: 6,
          background: SQYPING_GRADIENT,
        }}
      />
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={2} alignItems="center" minWidth={0}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: "primary.main",
                fontWeight: 800,
                fontSize: "1.25rem",
                letterSpacing: "0.02em",
              }}
            >
              {initials(identity.displayName)}
            </Avatar>
            <Box minWidth={0}>
              <Typography
                variant="overline"
                color="secondary.main"
                sx={{ display: "block", mb: 0.25 }}
              >
                Fiche adhérent
              </Typography>
              <Typography
                variant="h4"
                component="h1"
                color="primary.main"
                sx={{
                  fontSize: { xs: "1.5rem", sm: "1.75rem" },
                  wordBreak: "break-word",
                  lineHeight: 1.2,
                }}
              >
                {identity.displayName}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                sx={{ mt: 1 }}
              >
                {statusLabel ? (
                  <Chip size="small" label={statusLabel} color={statusColor} />
                ) : null}
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<CalendarMonthIcon />}
                  label={`Saison ${identity.seasonLabel}`}
                />
                {identity.ffttLicense ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<BadgeIcon />}
                    label={`Licence ${identity.ffttLicense}`}
                  />
                ) : null}
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<TagIcon />}
                  label={identity.registrationId}
                  sx={{ maxWidth: "100%" }}
                />
              </Stack>
            </Box>
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          useFlexGap
          flexWrap="wrap"
          sx={{ mt: 2.5 }}
        >
          <MemberProfileMetric
            label="Créneaux"
            value={String(slots.length)}
            hint={slots.length === 1 ? "inscrit" : "inscrits"}
          />
          <MemberProfileMetric
            label="Présences"
            value={String(attendance.length)}
            hint="pointages"
          />
          <MemberProfileMetric
            label="Facturé"
            value={formatEuros(finance.totals.invoicedCents)}
          />
          <MemberProfileMetric
            label="Solde"
            value={formatEuros(finance.totals.balanceCents)}
            emphasize
            tone={balanceTone}
            hint={
              finance.totals.balanceCents <= 0
                ? "À jour"
                : `${formatEuros(finance.totals.receivedCents)} encaissés`
            }
          />
        </Stack>
      </Box>
    </Box>
  );
}
