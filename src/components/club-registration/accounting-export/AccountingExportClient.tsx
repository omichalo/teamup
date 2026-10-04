"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import type { SageExportControl } from "@/lib/accounting-export";
import { formatCentsAsEuros } from "@/lib/pricing/format";
import { AccountingExportChartPanel } from "./AccountingExportChartPanel";

type LoadState = "idle" | "loading" | "ready" | "error";

function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function AccountingExportClient() {
  const [seasonLabel, setSeasonLabel] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [control, setControl] = useState<SageExportControl | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/club/accounting-export", {
          method: "GET",
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as {
          seasonLabel?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || "Impossible de charger la saison");
        }
        if (!cancelled) {
          setSeasonLabel(
            typeof data.seasonLabel === "string" ? data.seasonLabel : ""
          );
          setLoadState("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur de chargement");
          setLoadState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/club/accounting-export", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(seasonLabel.trim() ? { seasonLabel: seasonLabel.trim() } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        control?: SageExportControl;
        fileName?: string;
        zipBase64?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Export impossible");
      }
      if (!data.control || !data.fileName || !data.zipBase64) {
        throw new Error("Réponse d'export incomplète");
      }

      setControl(data.control);
      downloadBlob(
        data.fileName,
        base64ToBlob(data.zipBase64, "application/zip")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export impossible");
    } finally {
      setExporting(false);
    }
  }, [seasonLabel]);

  if (loadState === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", py: { xs: 2, md: 3 }, px: { xs: 2, md: 0 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Export comptable Sage
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Génère un ZIP avec les deux formats d&apos;écritures : XIMPORT.TXT
        (Sage 50 natif) et CSV TeamUp (import paramétrable), plus tiers,
        anomalies et contrôle. Importez l&apos;un ou l&apos;autre, pas les deux.
        Chaque ZIP est un journal complet de la saison.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Stack spacing={2}>
          <TextField
            label="Saison"
            value={seasonLabel}
            onChange={(event) => setSeasonLabel(event.target.value)}
            helperText="Par défaut : saison de la campagne active."
            fullWidth
            size="small"
          />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={
                exporting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <DownloadOutlinedIcon />
                )
              }
              onClick={() => void handleExport()}
              disabled={exporting || loadState === "error"}
            >
              {exporting ? "Génération…" : "Générer l'export"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DescriptionOutlinedIcon />}
              href="/docs/export-comptable-sage.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Guide PDF
            </Button>
          </Box>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {control ? (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Dernier export
          </Typography>
          <Stack spacing={0.75}>
            <Typography variant="body2">
              Saison : {control.seasonLabel ?? "toutes"}
            </Typography>
            <Typography variant="body2">
              Dossiers avec écritures : {control.registrationsWithEntries} /{" "}
              {control.registrationsRead}
            </Typography>
            <Typography variant="body2">
              Pièces : {control.summary.pieceCount} · Lignes :{" "}
              {control.summary.lineCount}
            </Typography>
            <Typography variant="body2">
              Totaux : {formatCentsAsEuros(control.summary.debitCents)} (D) ={" "}
              {formatCentsAsEuros(control.summary.creditCents)} (C)
              {control.summary.balanced ? " · équilibré" : " · déséquilibré"}
            </Typography>
            <Typography variant="body2">
              Tiers : {control.thirdPartyCount} dont{" "}
              {control.missingLicenseThirdPartyCount} sans licence FFTT
            </Typography>
            {Object.keys(control.anomalyCounts).length > 0 ? (
              <Typography variant="body2">
                Anomalies :{" "}
                {Object.entries(control.anomalyCounts)
                  .map(([code, count]) => `${code} (${count})`)
                  .join(", ")}
              </Typography>
            ) : (
              <Typography variant="body2">Aucune anomalie signalée.</Typography>
            )}
            {!control.summary.balanced ? (
              <Alert severity="warning" sx={{ mt: 1 }}>
                L&apos;export n&apos;est pas équilibré — n&apos;importez pas sans
                contrôle.
              </Alert>
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      <AccountingExportChartPanel />
    </Box>
  );
}
