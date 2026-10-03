"use client";

import { Chip, Stack } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";
import { ATTENDANCE_ALERT_LABELS, type AttendanceAlert } from "@/lib/attendance/constants";
import { buildMemberProfileHref } from "@/lib/member-profile/urls";

type Props = {
  alerts: AttendanceAlert[];
  /** Si présent, chaque alerte devient un lien vers la fiche adhérent. */
  registrationId?: string;
};

function alertChipLabel(alert: AttendanceAlert, linked: boolean): string {
  const base = ATTENDANCE_ALERT_LABELS[alert];
  if (!linked) {
    return base;
  }
  if (alert === "unpaid") {
    return "Paiement · Voir fiche";
  }
  return `${base} · Voir fiche`;
}

/**
 * Alertes dossier sur le pointage. Avec `registrationId`, les chips sont des
 * liens vers la fiche (cible tactile large pour usage coach sur téléphone).
 */
export function AttendanceAlertChips({ alerts, registrationId }: Props) {
  if (alerts.length === 0) {
    return null;
  }

  const href = registrationId ? buildMemberProfileHref(registrationId) : null;

  return (
    <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
      {alerts.map((alert) => {
        const label = alertChipLabel(alert, Boolean(href));
        const isPayment = alert === "unpaid";

        if (href) {
          return (
            <Chip
              key={alert}
              component={Link}
              href={href}
              clickable
              color="warning"
              variant={isPayment ? "filled" : "outlined"}
              icon={<OpenInNewIcon />}
              label={label}
              onClick={(event) => {
                // Évite qu'un futur wrapper cliqueable absorbe le tap.
                event.stopPropagation();
              }}
              sx={{
                minHeight: 40,
                fontWeight: 700,
                fontSize: "0.875rem",
                px: 0.5,
                textDecoration: "none",
                boxShadow: isPayment ? 1 : 0,
                "& .MuiChip-icon": {
                  fontSize: "1.05rem",
                  ml: 0.75,
                },
                "& .MuiChip-label": {
                  px: 1,
                },
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            />
          );
        }

        return (
          <Chip
            key={alert}
            size="small"
            color="warning"
            label={label}
          />
        );
      })}
    </Stack>
  );
}
