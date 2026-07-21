"use client";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  LICENSE_VALIDATION_STATUS_LABELS,
  LICENSE_VALIDATION_STATUS_VALUES,
  type LicenseValidationListFilter,
} from "@/lib/license-validation/license-validation-status";
import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";
import { LicenseValidationLineSecondaryText } from "@/components/license-validation/LicenseValidationLineSecondaryText";

type Props = {
  registrations: LicenseValidationListItem[];
  selectedId: string | null;
  statusFilter: LicenseValidationListFilter;
  searchInput: string;
  loading: boolean;
  loadingMore: boolean;
  hasNextPage: boolean;
  onSelect: (id: string) => void;
  onStatusFilterChange: (filter: LicenseValidationListFilter) => void;
  onSearchInputChange: (value: string) => void;
  onLoadMore: () => void;
};

export function LicenseValidationListPanel({
  registrations,
  selectedId,
  statusFilter,
  searchInput,
  loading,
  loadingMore,
  hasNextPage,
  onSelect,
  onStatusFilterChange,
  onSearchInputChange,
  onLoadMore,
}: Props) {
  return (
    <Stack spacing={2}>
      <TextField
        label="Rechercher (nom, e-mail, licence)"
        value={searchInput}
        onChange={(e) => onSearchInputChange(e.target.value)}
        size="small"
        fullWidth
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          label="Tous"
          clickable
          color={statusFilter === "all" ? "primary" : "default"}
          onClick={() => onStatusFilterChange("all")}
        />
        {LICENSE_VALIDATION_STATUS_VALUES.map((status) => (
          <Chip
            key={status}
            label={LICENSE_VALIDATION_STATUS_LABELS[status]}
            clickable
            color={statusFilter === status ? "primary" : "default"}
            onClick={() => onStatusFilterChange(status)}
          />
        ))}
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Statuts d’une ligne :
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Licence = suivi licence FFTT / Compétiteur = Oui/Non / Paiement =
          statut paiement.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : registrations.length === 0 ? (
        <Typography color="text.secondary">Aucun dossier trouvé.</Typography>
      ) : (
        <List disablePadding>
          {registrations.map((registration) => {
            const name = [registration.firstName, registration.lastName]
              .filter(Boolean)
              .join(" ");
            return (
              <ListItemButton
                key={registration.id}
                selected={registration.id === selectedId}
                onClick={() => onSelect(registration.id)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemText
                  primary={name || "Adhérent"}
                  secondary={
                    <LicenseValidationLineSecondaryText registration={registration} />
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      )}

      {hasNextPage ? (
        <Button onClick={() => void onLoadMore()} disabled={loadingMore}>
          {loadingMore ? "Chargement…" : "Charger plus"}
        </Button>
      ) : null}
    </Stack>
  );
}
