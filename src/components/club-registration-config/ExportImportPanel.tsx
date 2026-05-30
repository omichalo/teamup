"use client";

import { useRef, useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { Download, SwapHorizOutlined, Upload } from "@mui/icons-material";
import { downloadConfigBlob } from "@/lib/club-registration-config/export-import";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import {
  ConfigEditorCard,
  ConfigEditorHint,
  ConfigEditorInfoAlert,
  ConfigEditorRoot,
} from "./ConfigEditorLayout";

type Props = {
  config: RegistrationConfigV1;
  onImported: () => void;
};

export function ExportImportPanel({ config, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = (scope: "draft" | "active") => {
    if (scope === "draft") {
      downloadConfigBlob(config);
      return;
    }
    window.open(`/api/club/registration-config/export?scope=active`, "_blank");
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const res = await fetch("/api/club/registration-config/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const body = (await res.json()) as { error?: string; details?: string[] };
      if (!res.ok) {
        throw new Error(body.details?.join("\n") ?? body.error ?? "Import échoué");
      }
      onImported();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import échoué");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Exportez la configuration au format JSON versionné (
        <strong>.teamup-registration-config.json</strong>) pour la réutiliser sur un autre
        environnement ou conserver une sauvegarde.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        L&apos;import remplace le brouillon en cours. Publiez ensuite pour activer la configuration.
      </ConfigEditorHint>

      <ConfigEditorCard>
        <Typography variant="subtitle2" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SwapHorizOutlined fontSize="small" color="primary" />
          Actions
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" size="small" startIcon={<Download />} onClick={() => handleExport("draft")}>
            Exporter le brouillon
          </Button>
          <Button variant="outlined" size="small" startIcon={<Download />} onClick={() => handleExport("active")}>
            Exporter la config publiée
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Upload />}
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            Importer dans le brouillon
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json,.teamup-registration-config.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
            }}
          />
        </Stack>
      </ConfigEditorCard>

      {importError && (
        <Alert severity="error" sx={{ width: "100%", boxSizing: "border-box" }}>
          {importError}
        </Alert>
      )}
    </ConfigEditorRoot>
  );
}
