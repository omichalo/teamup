"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import type { MemberProfileAttendanceItem } from "@/lib/member-profile/types";
import { MemberProfileSection } from "./MemberProfileSection";

const KIND_LABELS: Record<string, string> = {
  enrolled: "Inscrit",
  walkin: "Hors créneau",
  guest: "Essai",
};

const KIND_COLOR: Record<string, "primary" | "secondary" | "default"> = {
  enrolled: "primary",
  walkin: "secondary",
  guest: "default",
};

const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const DAY_MONTH = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

function formatDateParts(ymd: string): { weekday: string; dayMonth: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) {
    return { weekday: "", dayMonth: ymd };
  }
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`);
  return {
    weekday: WEEKDAY.format(date).replace(/\.$/, ""),
    dayMonth: DAY_MONTH.format(date),
  };
}

type Props = {
  attendance: MemberProfileAttendanceItem[];
};

export function MemberAttendanceSection({ attendance }: Props) {
  const visible = attendance.slice(0, 25);
  const remaining = Math.max(0, attendance.length - visible.length);

  return (
    <MemberProfileSection
      title="Présences"
      subtitle={
        attendance.length === 0
          ? "Aucun pointage pour l’instant"
          : `${attendance.length} séance${attendance.length > 1 ? "s" : ""} pointée${attendance.length > 1 ? "s" : ""}`
      }
      icon={EventAvailableIcon}
    >
      {attendance.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Les entraînements pointés pour cet adhérent apparaîtront ici.
        </Typography>
      ) : (
        <Stack spacing={1}>
          <Box
            sx={{
              maxHeight: { xs: 320, md: 420 },
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            <Stack spacing={1}>
              {visible.map((item) => {
                const { weekday, dayMonth } = formatDateParts(item.date);
                return (
                  <Stack
                    key={item.id}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{
                      px: 1.25,
                      py: 1,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "rgba(40, 48, 109, 0.02)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 58,
                        flexShrink: 0,
                        textAlign: "center",
                        lineHeight: 1.15,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="secondary.main"
                        sx={{
                          display: "block",
                          textTransform: "uppercase",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        }}
                      >
                        {weekday}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {dayMonth}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ wordBreak: "break-word" }}
                      >
                        {item.slotLabel}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={KIND_LABELS[item.kind] ?? item.kind}
                      color={KIND_COLOR[item.kind] ?? "default"}
                      variant="outlined"
                    />
                  </Stack>
                );
              })}
            </Stack>
          </Box>
          {remaining > 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
              + {remaining} autre{remaining > 1 ? "s" : ""} présence
              {remaining > 1 ? "s" : ""} non affichée{remaining > 1 ? "s" : ""}
              {" "}(les plus récentes sont listées en premier)
            </Typography>
          ) : null}
        </Stack>
      )}
    </MemberProfileSection>
  );
}
