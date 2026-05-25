"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { CloudUpload, Save } from "@mui/icons-material";
import { configSurfacePaddingSx, configSurfaceSx } from "./config-editor-layout";

type Props = {
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  draftCatalogVersion: string | null;
  activeCatalogVersion: string | null;
  activePublishedAt: string | null;
  onSave: () => void;
  onPublish: () => void;
};

export function ConfigPublishBar({
  dirty,
  saving,
  publishing,
  draftCatalogVersion,
  activeCatalogVersion,
  activePublishedAt,
  onSave,
  onPublish,
}: Props) {
  const versionsDiffer = draftCatalogVersion !== activeCatalogVersion;

  return (
    <Box
      sx={{
        ...configSurfaceSx,
        ...configSurfacePaddingSx,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
      >
        <Stack spacing={1}>
          <Typography variant="h6">Paramétrage inscription club</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={`Brouillon : ${draftCatalogVersion ?? "—"}`}
              color={dirty ? "warning" : "default"}
            />
            <Chip
              size="small"
              label={`Publié : ${activeCatalogVersion ?? "—"}`}
              color={versionsDiffer ? "info" : "success"}
            />
            {activePublishedAt && (
              <Chip
                size="small"
                variant="outlined"
                label={`Dernière publication : ${new Date(activePublishedAt).toLocaleString("fr-FR")}`}
              />
            )}
          </Stack>
          {dirty && (
            <Alert severity="warning" sx={{ py: 0.5, width: "100%", boxSizing: "border-box" }}>
              Modifications non enregistrées
            </Alert>
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={saving ? <CircularProgress size={16} /> : <Save />}
            disabled={!dirty || saving || publishing}
            onClick={onSave}
          >
            Enregistrer le brouillon
          </Button>
          <Button
            variant="contained"
            startIcon={publishing ? <CircularProgress size={16} /> : <CloudUpload />}
            disabled={saving || publishing}
            onClick={onPublish}
          >
            Publier
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
