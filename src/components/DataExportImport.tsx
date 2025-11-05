"use client";

import React, { useState } from "react";
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
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  FileDownload as FileDownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
} from "@mui/icons-material";

interface DataExportImportProps {
  onExport: (options: ExportOptions) => Promise<void>;
  onImport: (file: File, options: ImportOptions) => Promise<void>;
  onBackup: () => Promise<void>;
  onRestore: (file: File) => Promise<void>;
  onDeleteBackup: (backupId: string) => Promise<void>;
  onListBackups: () => Promise<BackupInfo[]>;
  onGetExportHistory: () => Promise<ExportHistoryItem[]>;
  onGetImportHistory: () => Promise<ImportHistoryItem[]>;
  loading?: boolean;
}

interface ExportOptions {
  format: "csv" | "excel" | "pdf" | "json";
  dataTypes: string[];
  dateRange: {
    start: string;
    end: string;
  };
  includeMetadata: boolean;
  includeHistory: boolean;
  compression: boolean;
  password?: string;
}

interface ImportOptions {
  format: "csv" | "excel" | "json";
  dataTypes: string[];
  updateExisting: boolean;
  validateData: boolean;
  createBackup: boolean;
  mapping?: { [key: string]: string };
}

interface BackupInfo {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  type: "full" | "incremental";
  status: "completed" | "failed" | "in_progress";
}

interface ExportHistoryItem {
  id: string;
  format: string;
  dataTypes: string[];
  size: number;
  createdAt: string;
  status: "completed" | "failed" | "in_progress";
  downloadUrl?: string;
}

interface ImportHistoryItem {
  id: string;
  format: string;
  dataTypes: string[];
  size: number;
  createdAt: string;
  status: "completed" | "failed" | "in_progress";
  recordsProcessed: number;
  recordsFailed: number;
}

export function DataExportImport({
  onExport,
  onImport,
  onBackup,
  onRestore,
  onDeleteBackup,
  onListBackups,
  onGetExportHistory,
  onGetImportHistory,
}: DataExportImportProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "csv",
    dataTypes: ["players", "teams", "matches"],
    dateRange: {
      start: "",
      end: "",
    },
    includeMetadata: true,
    includeHistory: false,
    compression: false,
  });
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    format: "csv",
    dataTypes: ["players"],
    updateExisting: false,
    validateData: true,
    createBackup: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataTypes = [
    { value: "players", label: "Joueurs" },
    { value: "teams", label: "Équipes" },
    { value: "matches", label: "Matchs" },
    { value: "championships", label: "Championnats" },
    { value: "availabilities", label: "Disponibilités" },
    { value: "compositions", label: "Compositions" },
    { value: "settings", label: "Paramètres" },
    { value: "users", label: "Utilisateurs" },
    { value: "audit_logs", label: "Logs d&apos;audit" },
  ];

  const handleExport = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onExport(exportOptions);
      setExportDialogOpen(false);
      await loadExportHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l&apos;export");
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      setProcessing(true);
      setError(null);
      await onImport(selectedFile, importOptions);
      setImportDialogOpen(false);
      setSelectedFile(null);
      await loadImportHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l&apos;import");
    } finally {
      setProcessing(false);
    }
  };

  const handleBackup = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onBackup();
      setBackupDialogOpen(false);
      await loadBackups();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async (backup: BackupInfo) => {
    try {
      setProcessing(true);
      setError(null);
      // Simuler la sélection d&apos;un fichier de sauvegarde
      const file = new File([], backup.name);
      await onRestore(file);
      setRestoreDialogOpen(false);
      await loadBackups();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la restauration"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (
      window.confirm("Êtes-vous sûr de vouloir supprimer cette sauvegarde ?")
    ) {
      try {
        await onDeleteBackup(backupId);
        await loadBackups();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
      }
    }
  };

  const loadBackups = async () => {
    try {
      const backupList = await onListBackups();
      setBackups(backupList);
    } catch (err) {
      console.error("Erreur lors du chargement des sauvegardes:", err);
    }
  };

  const loadExportHistory = async () => {
    try {
      const history = await onGetExportHistory();
      setExportHistory(history);
    } catch (err) {
      console.error("Erreur lors du chargement de l&apos;historique d&apos;export:", err);
    }
  };

  const loadImportHistory = async () => {
    try {
      const history = await onGetImportHistory();
      setImportHistory(history);
    } catch (err) {
      console.error("Erreur lors du chargement de l&apos;historique d&apos;import:", err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon color="success" />;
      case "failed":
        return <ErrorIcon color="error" />;
      case "in_progress":
        return <LinearProgress />;
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

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Export / Import de données</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadBackups();
              loadExportHistory();
              loadImportHistory();
            }}
          >
            Actualiser
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          gap: 3,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Export de données
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Exportez vos données dans différents formats pour sauvegarde ou
                analyse.
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => setExportDialogOpen(true)}
                  disabled={processing}
                >
                  Exporter
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloudDownloadIcon />}
                  onClick={() => setBackupDialogOpen(true)}
                  disabled={processing}
                >
                  Sauvegarder
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Import de données
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Importez des données depuis des fichiers externes ou restaurez
                une sauvegarde.
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => setImportDialogOpen(true)}
                  disabled={processing}
                >
                  Importer
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => setRestoreDialogOpen(true)}
                  disabled={processing}
                >
                  Restaurer
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sauvegardes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Gérez vos sauvegardes automatiques et manuelles.
              </Typography>
              {backups.length === 0 ? (
                <Alert severity="info">Aucune sauvegarde disponible</Alert>
              ) : (
                <List dense>
                  {backups.map((backup) => (
                    <ListItem key={backup.id}>
                      <ListItemText
                        primary={backup.name}
                        secondary={`${formatFileSize(
                          backup.size
                        )} - ${formatDate(backup.createdAt)}`}
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" gap={1}>
                          <Chip
                            label={backup.type}
                            color={
                              backup.type === "full" ? "primary" : "secondary"
                            }
                            size="small"
                          />
                          <Chip
                            label={backup.status}
                            color={getStatusColor(backup.status)}
                            size="small"
                          />
                          <Tooltip title="Restaurer">
                            <IconButton
                              size="small"
                              onClick={() => handleRestore(backup)}
                              disabled={
                                processing || backup.status !== "completed"
                              }
                            >
                              <RestoreIcon />
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
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Historique des exports
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Consultez l&apos;historique de vos exports de données.
              </Typography>
              {exportHistory.length === 0 ? (
                <Alert severity="info">Aucun export récent</Alert>
              ) : (
                <List dense>
                  {exportHistory.slice(0, 5).map((item) => (
                    <ListItem key={item.id}>
                      <ListItemText
                        primary={`${item.format.toUpperCase()} - ${item.dataTypes.join(
                          ", "
                        )}`}
                        secondary={`${formatFileSize(item.size)} - ${formatDate(
                          item.createdAt
                        )}`}
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" gap={1}>
                          {getStatusIcon(item.status)}
                          {item.downloadUrl && (
                            <Tooltip title="Télécharger">
                              <IconButton size="small" href={item.downloadUrl}>
                                <FileDownloadIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: "100%" }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Historique des imports
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Consultez l&apos;historique de vos imports de données.
              </Typography>
              {importHistory.length === 0 ? (
                <Alert severity="info">Aucun import récent</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Format</TableCell>
                        <TableCell>Types de données</TableCell>
                        <TableCell>Taille</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Enregistrements</TableCell>
                        <TableCell>Échecs</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importHistory.slice(0, 10).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.format.toUpperCase()}</TableCell>
                          <TableCell>{item.dataTypes.join(", ")}</TableCell>
                          <TableCell>{formatFileSize(item.size)}</TableCell>
                          <TableCell>{formatDate(item.createdAt)}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getStatusIcon(item.status)}
                              <Chip
                                label={item.status}
                                color={getStatusColor(item.status)}
                                size="small"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>{item.recordsProcessed}</TableCell>
                          <TableCell>{item.recordsFailed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Dialog d&apos;export */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Exporter les données</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Format d&apos;export</FormLabel>
                  <Select
                    value={exportOptions.format}
                    onChange={(e) =>
                      setExportOptions({
                        ...exportOptions,
                        format: e.target.value as
                          | "csv"
                          | "excel"
                          | "pdf"
                          | "json",
                      })
                    }
                  >
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="excel">Excel</MenuItem>
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Types de données</FormLabel>
                  <FormGroup>
                    {dataTypes.map((type) => (
                      <FormControlLabel
                        key={type.value}
                        control={
                          <Checkbox
                            checked={exportOptions.dataTypes.includes(
                              type.value
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExportOptions({
                                  ...exportOptions,
                                  dataTypes: [
                                    ...exportOptions.dataTypes,
                                    type.value,
                                  ],
                                });
                              } else {
                                setExportOptions({
                                  ...exportOptions,
                                  dataTypes: exportOptions.dataTypes.filter(
                                    (t) => t !== type.value
                                  ),
                                });
                              }
                            }}
                          />
                        }
                        label={type.label}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Date de début"
                  type="date"
                  value={exportOptions.dateRange.start}
                  onChange={(e) =>
                    setExportOptions({
                      ...exportOptions,
                      dateRange: {
                        ...exportOptions.dateRange,
                        start: e.target.value,
                      },
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Date de fin"
                  type="date"
                  value={exportOptions.dateRange.end}
                  onChange={(e) =>
                    setExportOptions({
                      ...exportOptions,
                      dateRange: {
                        ...exportOptions.dateRange,
                        end: e.target.value,
                      },
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ width: "100%" }}>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeMetadata}
                        onChange={(e) =>
                          setExportOptions({
                            ...exportOptions,
                            includeMetadata: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Inclure les métadonnées"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeHistory}
                        onChange={(e) =>
                          setExportOptions({
                            ...exportOptions,
                            includeHistory: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Inclure l&apos;historique"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.compression}
                        onChange={(e) =>
                          setExportOptions({
                            ...exportOptions,
                            compression: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Compression"
                  />
                </FormGroup>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={processing || exportOptions.dataTypes.length === 0}
          >
            {processing ? "Export..." : "Exporter"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d&apos;import */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Importer des données</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: "100%" }}>
                <TextField
                  fullWidth
                  type="file"
                  inputProps={{ accept: ".csv,.xlsx,.json" }}
                  onChange={(e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      setSelectedFile(file);
                    }
                  }}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Format du fichier</FormLabel>
                  <Select
                    value={importOptions.format}
                    onChange={(e) =>
                      setImportOptions({
                        ...importOptions,
                        format: e.target.value as "csv" | "excel" | "json",
                      })
                    }
                  >
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="excel">Excel</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Types de données</FormLabel>
                  <FormGroup>
                    {dataTypes.map((type) => (
                      <FormControlLabel
                        key={type.value}
                        control={
                          <Checkbox
                            checked={importOptions.dataTypes.includes(
                              type.value
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setImportOptions({
                                  ...importOptions,
                                  dataTypes: [
                                    ...importOptions.dataTypes,
                                    type.value,
                                  ],
                                });
                              } else {
                                setImportOptions({
                                  ...importOptions,
                                  dataTypes: importOptions.dataTypes.filter(
                                    (t) => t !== type.value
                                  ),
                                });
                              }
                            }}
                          />
                        }
                        label={type.label}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </Box>
              <Box sx={{ width: "100%" }}>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={importOptions.updateExisting}
                        onChange={(e) =>
                          setImportOptions({
                            ...importOptions,
                            updateExisting: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Mettre à jour les enregistrements existants"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={importOptions.validateData}
                        onChange={(e) =>
                          setImportOptions({
                            ...importOptions,
                            validateData: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Valider les données avant import"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={importOptions.createBackup}
                        onChange={(e) =>
                          setImportOptions({
                            ...importOptions,
                            createBackup: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Créer une sauvegarde avant import"
                  />
                </FormGroup>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleImport}
            variant="contained"
            startIcon={<UploadIcon />}
            disabled={
              processing ||
              !selectedFile ||
              importOptions.dataTypes.length === 0
            }
          >
            {processing ? "Import..." : "Importer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de sauvegarde */}
      <Dialog
        open={backupDialogOpen}
        onClose={() => setBackupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Créer une sauvegarde</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Une sauvegarde complète de toutes les données sera créée.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Cette opération peut prendre quelques minutes selon la quantité de
              données.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleBackup}
            variant="contained"
            startIcon={<BackupIcon />}
            disabled={processing}
          >
            {processing ? "Sauvegarde..." : "Créer la sauvegarde"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de restauration */}
      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Restaurer une sauvegarde</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Attention :</strong> La restauration remplacera toutes les
              données actuelles. Assurez-vous d&apos;avoir une sauvegarde récente
              avant de continuer.
            </Alert>
            {backups.length === 0 ? (
              <Alert severity="info">Aucune sauvegarde disponible</Alert>
            ) : (
              <List>
                {backups.map((backup) => (
                  <ListItem key={backup.id}>
                    <ListItemText
                      primary={backup.name}
                      secondary={`${formatFileSize(backup.size)} - ${formatDate(
                        backup.createdAt
                      )}`}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        startIcon={<RestoreIcon />}
                        onClick={() => handleRestore(backup)}
                        disabled={processing || backup.status !== "completed"}
                      >
                        Restaurer
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Annuler</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
