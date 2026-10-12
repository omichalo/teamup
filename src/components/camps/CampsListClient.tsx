"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { CampListItem } from "@/lib/camps/types";
import { CampCreateDialog } from "./CampCreateDialog";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  closed: "Fermé",
};

export function CampsListClient() {
  const [camps, setCamps] = useState<CampListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CampListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/club/camps", { credentials: "include" });
      const json = (await res.json()) as { camps?: CampListItem[]; error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Chargement impossible");
      }
      setCamps(json.camps ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/camps/${pendingDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Suppression impossible");
      }
      setPendingDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", px: 2, py: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Stages
          </Typography>
          <Typography color="text.secondary">
            Administrer les stages vacances, créneaux et inscriptions.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button component={Link} href="/club/stages/catalogue" variant="outlined">
            Catalogue
          </Button>
          <Button component={Link} href="/club/stages/paiements" variant="outlined">
            Paiements
          </Button>
          <Button component={Link} href="/club/stages/tableau" variant="outlined">
            Inscriptions
          </Button>
          <Button
            component={Link}
            href="/club/stages/statistiques"
            variant="outlined"
          >
            Statistiques
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Nouveau stage
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : camps.length === 0 ? (
        <Alert severity="info">Aucun stage pour le moment.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {camps.map((camp) => (
            <Box
              key={camp.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
              }}
            >
              <Box
                component={Link}
                href={`/club/stages/${camp.id}`}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Typography fontWeight={700}>{camp.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {camp.startDate} → {camp.endDate} · {camp.seasonLabel}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={STATUS_LABEL[camp.status] ?? camp.status}
                color={camp.status === "open" ? "success" : "default"}
              />
              {camp.status === "draft" ? (
                <IconButton
                  aria-label={`Supprimer le brouillon ${camp.title}`}
                  color="error"
                  size="small"
                  onClick={() => setPendingDelete(camp)}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              ) : null}
            </Box>
          ))}
        </Stack>
      )}

      <Dialog
        open={pendingDelete !== null}
        onClose={() => !deleting && setPendingDelete(null)}
      >
        <DialogTitle>Supprimer ce brouillon ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Le stage « {pendingDelete?.title} » et ses créneaux seront
            définitivement supprimés.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} disabled={deleting}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void confirmDelete()}
            disabled={deleting}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <CampCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void load();
        }}
      />
    </Box>
  );
}
