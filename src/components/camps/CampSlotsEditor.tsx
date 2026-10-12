"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { Camp, CampSlot } from "@/lib/camps/types";

type Props = {
  campId: string;
  camp: Camp;
  slots: CampSlot[];
  onSlotsChange: (slots: CampSlot[]) => void;
};

function eachDateInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function CampSlotsEditor({ campId, camp, slots, onSlotsChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...slots].sort((a, b) =>
        a.date === b.date
          ? a.startMinutes - b.startMinutes
          : a.date.localeCompare(b.date)
      ),
    [slots]
  );

  async function generateDefaults() {
    setBusy(true);
    setError(null);
    try {
      if (camp.sites.length === 0) {
        throw new Error(
          "Ajoutez et enregistrez au moins un site avant de générer les créneaux."
        );
      }
      if (!camp.startDate || !camp.endDate) {
        throw new Error("Les dates du stage sont incomplètes.");
      }

      const dates = eachDateInclusive(camp.startDate, camp.endDate);
      const payload: Array<{
        siteId: string;
        siteLabel: string;
        formulaId: string;
        formulaLabel: string;
        date: string;
        startMinutes: number;
        endMinutes: number;
        label: string;
        capacity: null;
      }> = [];

      for (const date of dates) {
        for (const site of camp.sites) {
          for (const formula of site.formulas) {
            if (formula.sessions.length === 0) {
              throw new Error(
                `La formule « ${formula.label} » n’a aucun horaire configuré.`
              );
            }
            for (const session of formula.sessions) {
              const label =
                `${site.label} · ${formula.label} · ${session.label}`.slice(0, 200);
              payload.push({
                siteId: site.id,
                siteLabel: site.label,
                formulaId: formula.id,
                formulaLabel: formula.label,
                date,
                startMinutes: session.startMinutes,
                endMinutes: session.endMinutes,
                label,
                capacity: null,
              });
            }
          }
        }
      }

      if (payload.length === 0) {
        throw new Error(
          "Aucun créneau à générer — vérifiez sites, formules et horaires."
        );
      }

      const created: CampSlot[] = [];
      const chunkSize = 150;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const res = await fetch(`/api/club/camps/${campId}/slots`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots: chunk }),
        });
        const json = (await res.json()) as { slots?: CampSlot[]; error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "Génération impossible");
        }
        created.push(...(json.slots ?? []));
      }
      onSlotsChange([...(slots ?? []), ...created]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCancelled(slot: CampSlot) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/camps/slots/${slot.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelled: !slot.cancelled }),
      });
      const json = (await res.json()) as { slot?: CampSlot; error?: string };
      if (!res.ok || !json.slot) {
        throw new Error(json.error ?? "Mise à jour impossible");
      }
      onSlotsChange(slots.map((s) => (s.id === slot.id ? json.slot! : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "flex-start" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            2. Créneaux ({slots.length})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Grille générée à partir des dates du stage et des horaires
            enregistrés sur chaque formule.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          disabled={busy || camp.sites.length === 0}
          onClick={() => {
            if (
              slots.length > 0 &&
              !window.confirm(
                "Des créneaux existent déjà. Générer à nouveau en ajoutera d’autres. Continuer ?"
              )
            ) {
              return;
            }
            void generateDefaults();
          }}
        >
          Générer la grille
        </Button>
      </Stack>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {sorted.length === 0 ? (
        <Alert severity="info">
          {camp.sites.length === 0
            ? "Étape 1 : ajoutez et enregistrez au moins un site."
            : "Aucun créneau pour l’instant — cliquez sur « Générer la grille »."}
        </Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Horaires</TableCell>
              <TableCell>Libellé</TableCell>
              <TableCell>État</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((slot) => (
              <TableRow key={slot.id}>
                <TableCell>{slot.date}</TableCell>
                <TableCell>
                  {formatMinutes(slot.startMinutes)}–{formatMinutes(slot.endMinutes)}
                </TableCell>
                <TableCell>{slot.label}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={slot.cancelled ? "Annulé" : "Actif"}
                    color={slot.cancelled ? "warning" : "success"}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    disabled={busy}
                    onClick={() => void toggleCancelled(slot)}
                  >
                    {slot.cancelled ? "Restaurer" : "Annuler"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
