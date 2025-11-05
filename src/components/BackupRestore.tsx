"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  Alert,
  // List,
  // ListItem,
  // ListItemText,
  // ListItemSecondaryAction,
  IconButton,
  Chip,
  // Divider,
  // Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  // LinearProgress,
  CircularProgress,
} from "@mui/material";
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  // Warning as WarningIcon,
  Info as InfoIcon,
  // Storage as StorageIcon,
  // CloudDownload as CloudDownloadIcon,
  // CloudUpload as CloudUploadIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

interface BackupRestoreProps {
  backups: Backup[];
  onCreateBackup: (options: BackupOptions) => Promise<void>;
  onRestoreBackup: (backupId: string) => Promise<void>;
  onDeleteBackup: (backupId: string) => Promise<void>;
  onDownloadBackup: (backupId: string) => Promise<void>;
  onUploadBackup: (file: File) => Promise<void>;
  onScheduleBackup: (schedule: BackupSchedule) => Promise<void>;
  onGetBackupSettings: () => Promise<BackupSettings>;
  onUpdateBackupSettings: (settings: BackupSettings) => Promise<void>;
  loading?: boolean;
}

interface Backup {
  id: string;
  name: string;
  type: "full" | "incremental" | "differential";
  status: "completed" | "failed" | "in_progress" | "scheduled";
  size: number;
  createdAt: string;
  createdBy: string;
  description?: string;
  metadata: {
    version: string;
    environment: string;
    dataTypes: string[];
    compression: boolean;
    encryption: boolean;
  };
  scheduleId?: string;
  parentBackupId?: string;
  checksum: string;
  location: string;
  retention: {
    expiresAt?: string;
    autoDelete: boolean;
  };
}

interface BackupOptions {
  name: string;
  type: "full" | "incremental" | "differential";
  description?: string;
  dataTypes: string[];
  compression: boolean;
  encryption: boolean;
  password?: string;
  scheduleId?: string;
  parentBackupId?: string;
}

interface BackupSchedule {
  id: string;
  name: string;
  type: "full" | "incremental" | "differential";
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  days: number[];
  enabled: boolean;
  retention: number;
  dataTypes: string[];
  compression: boolean;
  encryption: boolean;
}

interface BackupSettings {
  storage: {
    type: "local" | "s3" | "azure" | "gcp";
    path: string;
    credentials: {
      [key: string]: string;
    };
  };
  compression: {
    enabled: boolean;
    algorithm: "gzip" | "bzip2" | "lz4";
    level: number;
  };
  encryption: {
    enabled: boolean;
    algorithm: "aes256" | "aes128";
    keyRotation: number;
  };
  retention: {
    maxBackups: number;
    maxAge: number;
    autoDelete: boolean;
  };
  scheduling: {
    enabled: boolean;
    timezone: string;
    maxConcurrent: number;
  };
  notifications: {
    enabled: boolean;
    onSuccess: boolean;
    onFailure: boolean;
    onCompletion: boolean;
  };
}

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
  const [newBackup, setNewBackup] = useState<BackupOptions>({
    name: "",
    type: "full",
    description: "",
    dataTypes: ["players", "teams", "matches"],
    compression: true,
    encryption: false,
  });
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

  const dataTypes = [
    { value: "players", label: "Joueurs" },
    { value: "teams", label: "Équipes" },
    { value: "matches", label: "Matchs" },
    { value: "championships", label: "Championnats" },
    { value: "availabilities", label: "Disponibilités" },
    { value: "compositions", label: "Compositions" },
    { value: "users", label: "Utilisateurs" },
    { value: "settings", label: "Paramètres" },
    { value: "audit_logs", label: "Logs d&apos;audit" },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // const backupSettings = await onGetBackupSettings();
      // setSettings(backupSettings);
    } catch (err) {
      console.error("Erreur lors du chargement des paramètres:", err);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onCreateBackup(newBackup);
      setCreateDialogOpen(false);
      setNewBackup({
        name: "",
        type: "full",
        description: "",
        dataTypes: ["players", "teams", "matches"],
        compression: true,
        encryption: false,
      });
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "full":
        return <BackupIcon color="primary" />;
      case "incremental":
        return <BackupIcon color="secondary" />;
      case "differential":
        return <BackupIcon color="info" />;
      default:
        return <BackupIcon color="inherit" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "full":
        return "primary";
      case "incremental":
        return "secondary";
      case "differential":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon color="success" />;
      case "failed":
        return <ErrorIcon color="error" />;
      case "in_progress":
        return <CircularProgress size={20} />;
      case "scheduled":
        return <ScheduleIcon color="info" />;
      default:
        return <InfoIcon color="inherit" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "failed":
        return "error";
      case "in_progress":
        return "info";
      case "scheduled":
        return "info";
      default:
        return "default";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR");
  };

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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sauvegardes disponibles
              </Typography>
              {backups.length === 0 ? (
                <Alert severity="info">Aucune sauvegarde disponible</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nom</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Taille</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {backup.name}
                              </Typography>
                              {backup.description && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {backup.description}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getTypeIcon(backup.type)}
                              <Chip
                                label={backup.type}
                                color={
                                  getTypeColor(backup.type) as
                                    | "default"
                                    | "primary"
                                    | "secondary"
                                    | "error"
                                    | "info"
                                    | "success"
                                    | "warning"
                                }
                                size="small"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getStatusIcon(backup.status)}
                              <Chip
                                label={backup.status}
                                color={
                                  getStatusColor(backup.status) as
                                    | "default"
                                    | "primary"
                                    | "secondary"
                                    | "error"
                                    | "info"
                                    | "success"
                                    | "warning"
                                }
                                size="small"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatFileSize(backup.size)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(backup.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="Restaurer">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRestoreBackup(backup)}
                                  disabled={
                                    processing || backup.status !== "completed"
                                  }
                                >
                                  <RestoreIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Télécharger">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleDownloadBackup(backup.id)
                                  }
                                  disabled={
                                    processing || backup.status !== "completed"
                                  }
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteBackup(backup.id)}
                                  disabled={processing}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
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

      {/* Dialog de création */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Créer une sauvegarde</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Nom de la sauvegarde"
                  value={newBackup.name}
                  onChange={(e) =>
                    setNewBackup({
                      ...newBackup,
                      name: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={newBackup.type}
                    onChange={(e) =>
                      setNewBackup({
                        ...newBackup,
                        type: e.target.value as
                          | "full"
                          | "incremental"
                          | "differential",
                      })
                    }
                  >
                    <MenuItem value="full">Complète</MenuItem>
                    <MenuItem value="incremental">Incrémentale</MenuItem>
                    <MenuItem value="differential">Différentielle</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: "100%" }}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={newBackup.description}
                  onChange={(e) =>
                    setNewBackup({
                      ...newBackup,
                      description: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: "100%" }}>
                <FormControl fullWidth>
                  <FormLabel>Types de données</FormLabel>
                  <Select
                    multiple
                    value={newBackup.dataTypes}
                    onChange={(e) =>
                      setNewBackup({
                        ...newBackup,
                        dataTypes: e.target.value as string[],
                      })
                    }
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={
                              dataTypes.find((dt) => dt.value === value)?.label
                            }
                            size="small"
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {dataTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newBackup.compression}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewBackup({
                          ...newBackup,
                          compression: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Compression"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newBackup.encryption}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewBackup({
                          ...newBackup,
                          encryption: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Chiffrement"
                />
              </Box>
              {newBackup.encryption && (
                <Box sx={{ width: "100%" }}>
                  <TextField
                    fullWidth
                    label="Mot de passe"
                    type="password"
                    value={newBackup.password || ""}
                    onChange={(e) =>
                      setNewBackup({
                        ...newBackup,
                        password: e.target.value,
                      })
                    }
                  />
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleCreateBackup}
            variant="contained"
            startIcon={<BackupIcon />}
            disabled={processing || !newBackup.name}
          >
            {processing ? "Création..." : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d&apos;upload */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Importer une sauvegarde</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Sélectionnez un fichier de sauvegarde à importer.
            </Alert>
            <TextField
              fullWidth
              type="file"
              inputProps={{ accept: ".backup,.zip,.tar.gz" }}
              onChange={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  setSelectedFile(file);
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleUploadBackup}
            variant="contained"
            startIcon={<UploadIcon />}
            disabled={processing || !selectedFile}
          >
            {processing ? "Import..." : "Importer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
