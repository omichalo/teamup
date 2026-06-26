"use client";

import type { MouseEvent } from "react";
import {
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { SUGGESTION_CATEGORIES } from "@/lib/app-suggestions/types";
import {
  SUGGESTION_CATEGORY_LABELS,
  SUGGESTION_STATUS_LABELS,
} from "@/lib/app-suggestions/status";
import { formatSuggestionDate } from "@/components/app-suggestions/format-utils";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "received", label: SUGGESTION_STATUS_LABELS.received },
  { value: "reviewing", label: SUGGESTION_STATUS_LABELS.reviewing },
  { value: "planned", label: SUGGESTION_STATUS_LABELS.planned },
  { value: "in_progress", label: SUGGESTION_STATUS_LABELS.in_progress },
  { value: "released", label: SUGGESTION_STATUS_LABELS.released },
  { value: "declined", label: SUGGESTION_STATUS_LABELS.declined },
] as const;

const CATEGORY_FILTER_OPTIONS = [
  { value: "all", label: "Toutes les catégories" },
  ...SUGGESTION_CATEGORIES.map((value) => ({
    value,
    label: SUGGESTION_CATEGORY_LABELS[value],
  })),
] as const;

type SuggestionsFiltersBarProps = {
  statusFilter: string;
  categoryFilter: string;
  mineOnly: boolean;
  loading: boolean;
  lastRefreshedAt: Date | null;
  onStatusFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onMineOnlyChange: (value: boolean) => void;
  onRefresh: () => void;
};

export function SuggestionsFiltersBar({
  statusFilter,
  categoryFilter,
  mineOnly,
  loading,
  lastRefreshedAt,
  onStatusFilterChange,
  onCategoryFilterChange,
  onMineOnlyChange,
  onRefresh,
}: SuggestionsFiltersBarProps) {
  const handleScopeChange = (
    _event: MouseEvent<HTMLElement>,
    value: "all" | "mine" | null
  ) => {
    if (value !== null) {
      onMineOnlyChange(value === "mine");
    }
  };

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    onCategoryFilterChange(event.target.value);
  };

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          flexWrap="wrap"
          useFlexGap
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mineOnly ? "mine" : "all"}
            onChange={handleScopeChange}
            aria-label="Périmètre des idées"
            sx={{
              bgcolor: "background.paper",
              "& .MuiToggleButton-root": {
                px: 2,
                textTransform: "none",
                fontWeight: 500,
              },
            }}
          >
            <ToggleButton value="all">Toutes les idées</ToggleButton>
            <ToggleButton value="mine">Mes idées</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
            <InputLabel id="suggestions-category-filter-label">Catégorie</InputLabel>
            <Select
              labelId="suggestions-category-filter-label"
              label="Catégorie"
              value={categoryFilter}
              onChange={handleCategoryChange}
              sx={{ bgcolor: "background.paper" }}
            >
              {CATEGORY_FILTER_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
          {lastRefreshedAt ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: "none", md: "block" } }}
            >
              Actualisé {formatSuggestionDate(lastRefreshedAt.toISOString())}
            </Typography>
          ) : null}
          <Tooltip title="Actualiser la liste">
            <span>
              <IconButton
                aria-label="Actualiser la liste"
                onClick={onRefresh}
                disabled={loading}
                size="small"
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={0.75}
        flexWrap="wrap"
        useFlexGap
        role="group"
        aria-label="Filtrer par statut"
      >
        {STATUS_FILTER_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value;

          return (
            <Chip
              key={option.value}
              label={option.label}
              size="small"
              clickable
              onClick={() => onStatusFilterChange(option.value)}
              variant={isActive ? "filled" : "outlined"}
              color={isActive ? "primary" : "default"}
              sx={{
                fontWeight: isActive ? 600 : 500,
                borderColor: isActive ? undefined : "divider",
              }}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
