"use client";

import { useState } from "react";
import {
  Backup as BackupIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
import { Alert, Box, Button, Card, CardContent, Typography } from "@mui/material";
import { BackupsTableCard } from "@/components/backup-restore/BackupsTableCard";
import { DEFAULT_BACKUP_OPTIONS } from "@/components/backup-restore/constants";
import { CreateBackupDialog } from "@/components/backup-restore/CreateBackupDialog";
import type { Backup, BackupOptions, BackupRestoreProps } from "@/components/backup-restore/types";
import { UploadBackupDialog } from "@/components/backup-restore/UploadBackupDialog";


export function BackupRestore({
  backups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
  onDownloadBackup,
  onUploadBackup,
}: // onScheduleBackup,
// onGetBackupSettings,
// onUpdateBackupSettings,
// loading = false,
BackupRestoreProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  // const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  // const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  // const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [newBackup, setNewBackup] = useState<BackupOptions>(DEFAULT_BACKUP_OPTIONS);
  // const [newSchedule, setNewSchedule] = useState<BackupSchedule>({
  //   id: "",
  //   name: "",
  //   type: "full",
  //   frequency: "daily",
  //   time: "02:00",
  //   days: [],
  //   enabled: true,
  //   retention: 30,
  //   dataTypes: ["players", "teams", "matches"],
  //   compression: true,
  //   encryption: false,
  // });
  // const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleCreateBackup = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onCreateBackup(newBackup);
      setCreateDialogOpen(false);
      setNewBackup(DEFAULT_BACKUP_OPTIONS);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleRestoreBackup = async (backup: Backup) => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir restaurer la sauvegarde "${backup.name}" ?`
      )
    ) {
      try {
        setProcessing(true);
        setError(null);
        await onRestoreBackup(backup.id);
        // setRestoreDialogOpen(false);
        // setSelectedBackup(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la restauration"
        );
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (
      window.confirm("Êtes-vous sûr de vouloir supprimer cette sauvegarde ?")
    ) {
      try {
        await onDeleteBackup(backupId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
      }
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      await onDownloadBackup(backupId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors du téléchargement"
      );
    }
  };

  const handleUploadBackup = async () => {
    if (!selectedFile) return;

    try {
      setProcessing(true);
      setError(null);
      await onUploadBackup(selectedFile);
      setUploadDialogOpen(false);
      setSelectedFile(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l&apos;upload"
      );
    } finally {
      setProcessing(false);
    }
  };

  // const handleScheduleBackup = async () => {
  //   try {
  //     setProcessing(true);
  //     setError(null);
  //     await onScheduleBackup(newSchedule);
  //     // setScheduleDialogOpen(false);
  //     setNewSchedule({
  //       id: "",
  //       name: "",
  //       type: "full",
  //       frequency: "daily",
  //       time: "02:00",
  //       days: [],
  //       enabled: true,
  //       retention: 30,
  //       dataTypes: ["players", "teams", "matches"],
  //       compression: true,
  //       encryption: false,
  //     });
  //   } catch (err) {
  //     setError(
  //       err instanceof Error ? err.message : "Erreur lors de la planification"
  //     );
  //   } finally {
  //     setProcessing(false);
  //   }
  // };

  // const handleUpdateSettings = async () => {
  //   if (!settings) return;

  //   try {
  //     setProcessing(true);
  //     setError(null);
  //     await onUpdateBackupSettings(settings);
  //     // setSettingsDialogOpen(false);
  //   } catch (err) {
  //     setError(
  //       err instanceof Error ? err.message : "Erreur lors de la sauvegarde"
  //     );
  //   } finally {
  //     setProcessing(false);
  //   }
  // };

  // const isBackupExpired = (backup: Backup) => {
  //   if (!backup.retention.expiresAt) return false;
  //   return new Date(backup.retention.expiresAt) < new Date();
  // };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Sauvegarde et restauration</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => {}}
          >
            Paramètres
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Actualiser
          </Button>
          <Button
            variant="contained"
            startIcon={<BackupIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Nouvelle sauvegarde
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        <Box sx={{ width: { xs: "100%", md: "66.67%" } }}>
          <BackupsTableCard
            backups={backups}
            processing={processing}
            onRestoreBackup={handleRestoreBackup}
            onDownloadBackup={handleDownloadBackup}
            onDeleteBackup={handleDeleteBackup}
          />
        </Box>

        <Box sx={{ width: { xs: "100%", md: "33.33%" } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions rapides
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<BackupIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  disabled={processing}
                >
                  Créer une sauvegarde
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialogOpen(true)}
                  disabled={processing}
                >
                  Importer une sauvegarde
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => {}}
                  disabled={processing}
                >
                  Planifier une sauvegarde
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => {}}
                  disabled={processing}
                >
                  Paramètres
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <CreateBackupDialog
        open={createDialogOpen}
        backup={newBackup}
        processing={processing}
        onClose={() => setCreateDialogOpen(false)}
        onBackupChange={setNewBackup}
        onCreate={handleCreateBackup}
      />

      <UploadBackupDialog
        open={uploadDialogOpen}
        processing={processing}
        selectedFile={selectedFile}
        onClose={() => setUploadDialogOpen(false)}
        onSelectFile={setSelectedFile}
        onUpload={handleUploadBackup}
      />
    </Box>
  );
}
