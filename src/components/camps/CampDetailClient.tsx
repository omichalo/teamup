"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import type { Camp, CampSlot } from "@/lib/camps/types";
import type { CampStatus } from "@/lib/camps/constants";
import { CampConfigEditor } from "./CampConfigEditor";
import { CampSlotsEditor } from "./CampSlotsEditor";

type Props = { campId: string };

const STATUS_LABEL: Record<CampStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  closed: "Fermé",
};

export function CampDetailClient({ campId }: Props) {
  const router = useRouter();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [slots, setSlots] = useState<CampSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/camps/${campId}`, { credentials: "include" });
      const json = (await res.json()) as {
        camp?: Camp;
        slots?: CampSlot[];
        error?: string;
      };
      if (!res.ok || !json.camp) {
        throw new Error(json.error ?? "Chargement impossible");
      }
      setCamp(json.camp);
      setSlots(json.slots ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [campId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchCamp(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/camps/${campId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { camp?: Camp; error?: string };
      if (!res.ok || !json.camp) {
        throw new Error(json.error ?? "Mise à jour impossible");
      }
      setCamp(json.camp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: CampStatus) {
    if (status === "open" && camp && camp.sites.length === 0) {
      setError("Ajoutez et enregistrez au moins un site avant d’ouvrir.");
      return;
    }
    try {
      await patchCamp({ status });
    } catch {
      // error already set
    }
  }

  async function confirmDeleteDraft() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/camps/${campId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Suppression impossible");
      }
      setDeleteOpen(false);
      router.push("/club/stages");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!camp) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error ?? "Stage introuvable"}</Alert>
      </Box>
    );
  }

  const canOpen = camp.sites.length > 0;
  const hasSlots = slots.length > 0;

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: 2, py: 3 }}>
      <Button
        component={Link}
        href="/club/stages"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Stages
      </Button>

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="h4" component="h1" fontWeight={700}>
              {camp.title}
            </Typography>
            <Chip
              size="small"
              label={STATUS_LABEL[camp.status]}
              color={camp.status === "open" ? "success" : "default"}
            />
          </Stack>
          <Typography color="text.secondary">
            {camp.startDate} → {camp.endDate} · {camp.seasonLabel}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {camp.status === "draft" ? (
            <>
              <Button
                variant="contained"
                disabled={saving || !canOpen}
                onClick={() => void updateStatus("open")}
              >
                Ouvrir les inscriptions
              </Button>
              <Button
                color="error"
                variant="outlined"
                disabled={saving || deleting}
                onClick={() => setDeleteOpen(true)}
              >
                Supprimer
              </Button>
            </>
          ) : null}
          {camp.status === "open" ? (
            <>
              <Button
                component={Link}
                href={`/club/stages/${campId}/inscription`}
                variant="contained"
              >
                Formulaire public
              </Button>
              <Button
                component={Link}
                href={`/club/stages/${campId}/saisie`}
                variant="outlined"
              >
                Saisie secrétariat
              </Button>
              <Button
                variant="outlined"
                disabled={saving}
                onClick={() => void updateStatus("closed")}
              >
                Fermer
              </Button>
            </>
          ) : null}
          {camp.status === "closed" ? (
            <>
              <Button
                component={Link}
                href={`/club/stages/${campId}/saisie`}
                variant="outlined"
              >
                Saisie secrétariat
              </Button>
              <Button
                variant="contained"
                disabled={saving || !canOpen}
                onClick={() => void updateStatus("open")}
              >
                Réouvrir
              </Button>
            </>
          ) : null}
        </Stack>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {camp.status === "draft" ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Parcours brouillon : (1) sites & tarifs → Enregistrer · (2) générer les
          créneaux · (3) ouvrir les inscriptions.
          {!canOpen ? " Étape 1 incomplète." : null}
          {canOpen && !hasSlots ? " Étape 2 à faire." : null}
          {canOpen && hasSlots ? " Prêt à ouvrir." : null}
        </Alert>
      ) : null}

      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}>
        <DialogTitle>Supprimer ce brouillon ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Le stage « {camp.title} » et ses créneaux seront définitivement
            supprimés.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void confirmDeleteDraft()}
            disabled={deleting}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <CampConfigEditor
        key={camp.updatedAt}
        camp={camp}
        saving={saving}
        onSave={async (patch) => {
          await patchCamp(patch);
        }}
      />

      <CampSlotsEditor
        campId={campId}
        camp={camp}
        slots={slots}
        onSlotsChange={setSlots}
      />
    </Box>
  );
}
