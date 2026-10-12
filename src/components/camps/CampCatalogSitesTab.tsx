"use client";

import {
  Alert,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import type { CampCatalogSite } from "@/lib/camps/types";

type Props = {
  sites: CampCatalogSite[];
  busy: boolean;
  newSiteLabel: string;
  editingSiteId: string | null;
  editingSiteLabel: string;
  onNewSiteLabelChange: (value: string) => void;
  onCreate: () => void;
  onStartEdit: (site: CampCatalogSite) => void;
  onEditingLabelChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: (siteId: string) => void;
};

export function CampCatalogSitesTab({
  sites,
  busy,
  newSiteLabel,
  editingSiteId,
  editingSiteLabel,
  onNewSiteLabelChange,
  onCreate,
  onStartEdit,
  onEditingLabelChange,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: Props) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Nouveau site"
          value={newSiteLabel}
          onChange={(e) => onNewSiteLabelChange(e.target.value)}
          size="small"
          fullWidth
          disabled={busy}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreate}
          disabled={busy || !newSiteLabel.trim()}
        >
          Ajouter
        </Button>
      </Stack>
      {sites.length === 0 ? (
        <Alert severity="info">Aucun site catalogue pour l’instant.</Alert>
      ) : (
        sites.map((site) => (
          <Stack
            key={site.id}
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              p: 1.5,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            {editingSiteId === site.id ? (
              <>
                <TextField
                  size="small"
                  value={editingSiteLabel}
                  onChange={(e) => onEditingLabelChange(e.target.value)}
                  fullWidth
                  disabled={busy}
                />
                <Button size="small" onClick={onCancelEdit}>
                  Annuler
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={onSaveEdit}
                  disabled={busy}
                >
                  OK
                </Button>
              </>
            ) : (
              <>
                <Typography fontWeight={600} sx={{ flex: 1 }}>
                  {site.label}
                </Typography>
                <IconButton
                  size="small"
                  aria-label={`Modifier ${site.label}`}
                  disabled={busy}
                  onClick={() => onStartEdit(site)}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={`Supprimer ${site.label}`}
                  disabled={busy}
                  onClick={() => onRemove(site.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Stack>
        ))
      )}
    </Stack>
  );
}
