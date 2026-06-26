import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { SuggestionStatus, SuggestionStatusHistoryEntry } from "@/lib/app-suggestions/types";
import { SUGGESTION_STATUS_COLORS, SUGGESTION_STATUS_LABELS } from "@/lib/app-suggestions/status";
import { formatSuggestionDate } from "@/components/app-suggestions/format-utils";

type Props = {
  currentStatus: SuggestionStatus;
  history: SuggestionStatusHistoryEntry[];
  statusUpdatedAt: string | null;
  statusUpdatedByDisplayName: string | null;
};

export function SuggestionStatusHistorySection({
  currentStatus,
  history,
  statusUpdatedAt,
  statusUpdatedByDisplayName,
}: Props) {
  const entries =
    history.length > 0
      ? history
      : statusUpdatedAt
        ? [
            {
              status: currentStatus,
              updatedAt: statusUpdatedAt,
              updatedByUid: "",
              updatedByDisplayName: statusUpdatedByDisplayName,
            },
          ]
        : [];

  if (entries.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.8 }}>
        Historique
      </Typography>
      <Stack
        spacing={0}
        sx={{
          pl: 1.5,
          borderLeft: "2px solid",
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.15),
        }}
      >
        {entries.map((entry, index) => (
          <Box
            key={`${entry.updatedAt}-${index}`}
            sx={{
              position: "relative",
              pl: 2,
              pb: index < entries.length - 1 ? 1.5 : 0,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                left: -7,
                top: 6,
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: (theme) => {
                  const colorKey = SUGGESTION_STATUS_COLORS[entry.status];
                  if (colorKey === "default") {
                    return alpha(theme.palette.text.secondary, 0.35);
                  }
                  return theme.palette[colorKey].main;
                },
                boxShadow: (theme) => `0 0 0 3px ${theme.palette.background.paper}`,
              }}
            />
            <Typography variant="body2" fontWeight={600}>
              {SUGGESTION_STATUS_LABELS[entry.status]}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {formatSuggestionDate(entry.updatedAt)}
              {entry.updatedByDisplayName
                ? ` · ${entry.updatedByDisplayName}`
                : null}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
