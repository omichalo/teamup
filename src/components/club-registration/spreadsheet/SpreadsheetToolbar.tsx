"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import type { PaymentStatusId } from "@/lib/club-registration/payment-constants";
import type { RegistrationStatus } from "@/lib/club-registration/registration-status";
import type { SpreadsheetQuickFilters, SpreadsheetSavedViewId } from "@/lib/club-registration/spreadsheet/quick-filters";
import type { SpreadsheetTableDensity } from "@/lib/club-registration/spreadsheet/preferences";
import { FilterCard } from "@/components/ui";
import { SpreadsheetQuickFilterChips } from "./SpreadsheetQuickFilterChips";
import { SpreadsheetSavedViewsBar } from "./SpreadsheetSavedViewsBar";

type Props = {
  embedded?: boolean;
  rowCount: number;
  totalCount: number;
  truncated: boolean;
  searchQuery: string;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  showColumnFilters: boolean;
  hasActiveFilters: boolean;
  activeColumnFilterCount: number;
  quickFilters: SpreadsheetQuickFilters;
  activeViewId: SpreadsheetSavedViewId | null;
  exportDisabled: boolean;
  onSearchQueryChange: (value: string) => void;
  onShowColumnFiltersChange: (value: boolean) => void;
  onClearAllFilters: () => void;
  onOpenColumnPicker: () => void;
  onReload: () => void;
  onExportCsv: () => void;
  onSelectSavedView: (viewId: SpreadsheetSavedViewId) => void;
  onToggleRegistrationStatus: (status: RegistrationStatus) => void;
  onTogglePaymentStatus: (status: PaymentStatusId) => void;
  loading: boolean;
  tableDensity?: SpreadsheetTableDensity;
  onTableDensityChange?: (density: SpreadsheetTableDensity) => void;
};

export function SpreadsheetToolbar({
  embedded = false,
  rowCount,
  totalCount,
  truncated,
  searchQuery,
  searchInputRef,
  showColumnFilters,
  hasActiveFilters,
  activeColumnFilterCount,
  quickFilters,
  activeViewId,
  exportDisabled,
  onSearchQueryChange,
  onShowColumnFiltersChange,
  onClearAllFilters,
  onOpenColumnPicker,
  onReload,
  onExportCsv,
  onSelectSavedView,
  onToggleRegistrationStatus,
  onTogglePaymentStatus,
  loading,
  tableDensity = "comfortable",
  onTableDensityChange,
}: Props) {
  const sectionSpacing = embedded ? 1.25 : 2;

  const content = (
    <Stack spacing={sectionSpacing}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.25}
        alignItems={{ md: "center" }}
        justifyContent="space-between"
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SpreadsheetSavedViewsBar compact={embedded} activeViewId={activeViewId} onSelectView={onSelectSavedView} />
        </Box>

        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          {!embedded ? (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mr: 0.5 }}>
              <Chip
                label={`${rowCount} affiché${rowCount > 1 ? "s" : ""}`}
                color={rowCount < totalCount ? "primary" : "default"}
                variant={rowCount < totalCount ? "filled" : "outlined"}
                size="small"
              />
              <Chip
                label={`${totalCount} dossier${totalCount > 1 ? "s" : ""}`}
                variant="outlined"
                size="small"
              />
              {activeColumnFilterCount > 0 ? (
                <Chip
                  label={`${activeColumnFilterCount} filtre${activeColumnFilterCount > 1 ? "s" : ""} colonne`}
                  color="secondary"
                  size="small"
                  variant="outlined"
                />
              ) : null}
            </Stack>
          ) : null}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={tableDensity}
            onChange={(_, value: SpreadsheetTableDensity | null) => {
              if (value && onTableDensityChange) {
                onTableDensityChange(value);
              }
            }}
            aria-label="Densité du tableau"
          >
            <ToggleButton value="comfortable" sx={{ px: 1.25, py: 0.5 }}>
              Confort
            </ToggleButton>
            <ToggleButton value="compact" sx={{ px: 1.25, py: 0.5 }}>
              Compact
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={showColumnFilters ? "on" : "off"}
            onChange={(_, value: "on" | "off" | null) => {
              if (value) onShowColumnFiltersChange(value === "on");
            }}
            aria-label="Afficher les filtres par colonne"
          >
            <ToggleButton value="off" sx={{ px: 1.25, py: 0.5 }}>
              Sans filtres
            </ToggleButton>
            <ToggleButton value="on" sx={{ px: 1.25, py: 0.5 }}>
              Filtres colonnes
            </ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" size="small" startIcon={<ViewColumnIcon />} onClick={onOpenColumnPicker}>
            Colonnes
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={onExportCsv}
            disabled={exportDisabled}
          >
            CSV
          </Button>
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={onReload} disabled={loading}>
            Actualiser
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: "column", xl: "row" }}
        spacing={1.5}
        alignItems={{ xl: "flex-start" }}
      >
        <TextField
          label="Rechercher"
          placeholder="Nom, prénom ou e-mail — / pour focaliser"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          size="small"
          inputRef={searchInputRef}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: { xs: "100%", xl: 280 },
            flexShrink: 0,
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <SpreadsheetQuickFilterChips
            quickFilters={quickFilters}
            onToggleRegistrationStatus={onToggleRegistrationStatus}
            onTogglePaymentStatus={onTogglePaymentStatus}
          />
          {hasActiveFilters ? (
            <Button
              size="small"
              variant="text"
              startIcon={<FilterAltOffIcon />}
              onClick={() => void onClearAllFilters()}
              sx={{ mt: 0.75, px: 0.5 }}
            >
              Réinitialiser tous les filtres
            </Button>
          ) : null}
        </Box>
      </Stack>

      {truncated ? (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          Seuls les {totalCount} dossiers les plus récents sont chargés.
        </Alert>
      ) : null}

      {showColumnFilters ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <FilterAltIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            Filtrez sous chaque en-tête de colonne.
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );

  if (embedded) {
    return (
      <Box sx={{ pb: 1.25, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
        {content}
      </Box>
    );
  }

  return (
    <FilterCard marginBottom={0} cardContentSx={{ pt: 2, pb: 2 }}>
      {content}
    </FilterCard>
  );
}
