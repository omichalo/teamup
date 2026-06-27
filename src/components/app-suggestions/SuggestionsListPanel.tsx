"use client";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { ChatBubbleOutline as ChatBubbleOutlineIcon } from "@mui/icons-material";
import type { AppSuggestionSummary } from "@/lib/app-suggestions/types";
import {
  formatSuggestionCategoryLabel,
  SUGGESTION_KIND_COLORS,
  SUGGESTION_KIND_LABELS,
  SUGGESTION_STATUS_COLORS,
  SUGGESTION_STATUS_LABELS,
} from "@/lib/app-suggestions/status";
import { formatSuggestionDate } from "@/components/app-suggestions/format-utils";
import { SuggestionPriorityChip } from "@/components/app-suggestions/SuggestionPriorityChip";
import { suggestionListItemSx } from "@/components/app-suggestions/suggestions-surface-styles";

type SuggestionsListPanelProps = {
  suggestions: AppSuggestionSummary[];
  selectedId: string | null;
  loading: boolean;
  hasNextPage: boolean;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
};

export function SuggestionsListPanel({
  suggestions,
  selectedId,
  loading,
  hasNextPage,
  onSelect,
  onLoadMore,
}: SuggestionsListPanelProps) {
  return (
    <Stack spacing={1.5} sx={{ minHeight: 0 }}>
      {loading && suggestions.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {!loading && suggestions.length === 0 ? (
        <Box
          sx={{
            py: 5,
            px: 2,
            textAlign: "center",
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Aucun retour pour le moment
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lancez une idée ou signalez un problème avec les boutons en haut de
            page.
          </Typography>
        </Box>
      ) : null}

      <Stack
        spacing={0.75}
        sx={{
          maxHeight: { lg: "calc(100vh - 380px)" },
          overflowY: "auto",
          pr: { lg: 0.5 },
        }}
      >
        {suggestions.map((suggestion) => {
          const isSelected = selectedId === suggestion.id;

          return (
            <Box
              key={suggestion.id}
              component="button"
              type="button"
              onClick={() => onSelect(suggestion.id)}
              sx={[
                suggestionListItemSx(isSelected),
                {
                  width: "100%",
                  textAlign: "left",
                  font: "inherit",
                  color: "inherit",
                  display: "block",
                },
              ]}
            >
              <Stack spacing={0.75}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={isSelected ? 700 : 600}
                    sx={{ lineHeight: 1.35, pr: 0.5 }}
                  >
                    {suggestion.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={SUGGESTION_STATUS_LABELS[suggestion.status]}
                    color={SUGGESTION_STATUS_COLORS[suggestion.status]}
                    sx={{ flexShrink: 0, height: 22, fontSize: "0.7rem" }}
                  />
                </Stack>

                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={SUGGESTION_KIND_LABELS[suggestion.kind]}
                    size="small"
                    color={SUGGESTION_KIND_COLORS[suggestion.kind]}
                    sx={{ height: 22, fontSize: "0.7rem" }}
                  />
                  <Chip
                    label={formatSuggestionCategoryLabel(suggestion.category)}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: "0.7rem" }}
                  />
                  <SuggestionPriorityChip priority={suggestion.priority} />
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                    {suggestion.submitterDisplayName || "Utilisateur"} ·{" "}
                    {formatSuggestionDate(suggestion.createdAt)}
                  </Typography>
                </Stack>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    fontSize: "0.8125rem",
                    lineHeight: 1.45,
                  }}
                >
                  {suggestion.descriptionExcerpt}
                </Typography>

                {suggestion.commentCount > 0 ? (
                  <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                    <ChatBubbleOutlineIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption" fontWeight={500}>
                      {suggestion.commentCount}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {hasNextPage ? (
        <Button
          onClick={onLoadMore}
          disabled={loading}
          size="small"
          variant="outlined"
          sx={{ alignSelf: "center", borderRadius: 2 }}
        >
          Charger plus
        </Button>
      ) : null}
    </Stack>
  );
}
