"use client";

import { useState } from "react";
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
  Alert,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from "@mui/material";
import {
  Palette as PaletteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
import { DEFAULT_THEME_DRAFT } from "@/components/theme-manager/constants";
import type {
  CreateTheme,
  Theme,
  ThemeManagerProps,
} from "@/components/theme-manager/types";
import {
  formatThemeDate,
  getThemeStatus,
  getThemeStatusColor,
} from "@/components/theme-manager/utils";

export function ThemeManager({
  themes,
  currentTheme,
  onApplyTheme,
  onCreateTheme,
  onUpdateTheme,
  onDeleteTheme,
  onExportTheme,
  onImportTheme,
  onPreviewTheme,
  loading = false,
}: ThemeManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [newTheme, setNewTheme] = useState<CreateTheme>(DEFAULT_THEME_DRAFT);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleCreateTheme = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onCreateTheme(newTheme);
      setCreateDialogOpen(false);
      setNewTheme(DEFAULT_THEME_DRAFT);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateTheme = async () => {
    if (!selectedTheme) return;

    try {
      setProcessing(true);
      setError(null);
      await onUpdateTheme(selectedTheme.id, newTheme);
      setEditDialogOpen(false);
      setSelectedTheme(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce thème ?")) {
      try {
        await onDeleteTheme(themeId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
      }
    }
  };

  const handleApplyTheme = async (themeId: string) => {
    try {
      await onApplyTheme(themeId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'application"
      );
    }
  };

  const handleExportTheme = async (themeId: string) => {
    try {
      await onExportTheme(themeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'export");
    }
  };

  const handleImportTheme = async () => {
    if (!selectedFile) return;

    try {
      setProcessing(true);
      setError(null);
      await onImportTheme(selectedFile);
      setImportDialogOpen(false);
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setProcessing(false);
    }
  };

  const handlePreviewTheme = (theme: Theme) => {
    setSelectedTheme(theme);
    onPreviewTheme(theme);
    setPreviewDialogOpen(true);
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Gestion des thèmes</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Actualiser
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            Importer
          </Button>
          <Button
            variant="contained"
            startIcon={<PaletteIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Nouveau thème
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
                Thèmes disponibles
              </Typography>
              {loading ? (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  minHeight="200px"
                >
                  <CircularProgress />
                </Box>
              ) : themes.length === 0 ? (
                <Alert severity="info">Aucun thème trouvé</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nom</TableCell>
                        <TableCell>Version</TableCell>
                        <TableCell>Auteur</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Dernière modification</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {themes.map((theme) => (
                        <TableRow key={theme.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {theme.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {theme.description}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={theme.version}
                              size="small"
                              color="info"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {theme.author}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getThemeStatus(theme, currentTheme)}
                              color={
                                getThemeStatusColor(theme, currentTheme) as
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
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatThemeDate(theme.updatedAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="Appliquer">
                                <IconButton
                                  size="small"
                                  onClick={() => handleApplyTheme(theme.id)}
                                  disabled={theme.id === currentTheme}
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Aperçu">
                                <IconButton
                                  size="small"
                                  onClick={() => handlePreviewTheme(theme)}
                                >
                                  <PreviewIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Modifier">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedTheme(theme);
                                    setNewTheme({
                                      name: theme.name,
                                      description: theme.description,
                                      colors: theme.colors,
                                      typography: theme.typography,
                                      spacing: theme.spacing,
                                      shape: theme.shape,
                                      shadows: theme.shadows,
                                      components: theme.components,
                                    });
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <SettingsIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Exporter">
                                <IconButton
                                  size="small"
                                  onClick={() => handleExportTheme(theme.id)}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteTheme(theme.id)}
                                  disabled={theme.isDefault}
                                >
                                  <ErrorIcon />
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
                  startIcon={<PaletteIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  disabled={processing}
                >
                  Créer un thème
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => setImportDialogOpen(true)}
                  disabled={processing}
                >
                  Importer un thème
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={() => setPreviewDialogOpen(true)}
                  disabled={processing}
                >
                  Aperçu des thèmes
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Dialog de création/modification */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          setSelectedTheme(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {createDialogOpen ? "Créer un thème" : "Modifier le thème"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Nom du thème"
                  value={newTheme.name}
                  onChange={(e) =>
                    setNewTheme({
                      ...newTheme,
                      name: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: "100%" }}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={newTheme.description}
                  onChange={(e) =>
                    setNewTheme({
                      ...newTheme,
                      description: e.target.value,
                    })
                  }
                />
              </Box>

              <Box sx={{ width: "100%" }}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Couleurs</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                      <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Couleur primaire
                        </Typography>
                        <Box display="flex" gap={1}>
                          <TextField
                            size="small"
                            label="Main"
                            value={newTheme.colors.primary.main}
                            onChange={(e) =>
                              setNewTheme({
                                ...newTheme,
                                colors: {
                                  ...newTheme.colors,
                                  primary: {
                                    ...newTheme.colors.primary,
                                    main: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                          <TextField
                            size="small"
                            label="Light"
                            value={newTheme.colors.primary.light}
                            onChange={(e) =>
                              setNewTheme({
                                ...newTheme,
                                colors: {
                                  ...newTheme.colors,
                                  primary: {
                                    ...newTheme.colors.primary,
                                    light: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                          <TextField
                            size="small"
                            label="Dark"
                            value={newTheme.colors.primary.dark}
                            onChange={(e) =>
                              setNewTheme({
                                ...newTheme,
                                colors: {
                                  ...newTheme.colors,
                                  primary: {
                                    ...newTheme.colors.primary,
                                    dark: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </Box>
                      </Box>
                      <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Couleur secondaire
                        </Typography>
                        <Box display="flex" gap={1}>
                          <TextField
                            size="small"
                            label="Main"
                            value={newTheme.colors.secondary.main}
                            onChange={(e) =>
                              setNewTheme({
                                ...newTheme,
                                colors: {
                                  ...newTheme.colors,
                                  secondary: {
                                    ...newTheme.colors.secondary,
                                    main: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                          <TextField
                            size="small"
                            label="Light"
                            value={newTheme.colors.secondary.light}
                            onChange={(e) =>
                              setNewTheme({
                                ...newTheme,
                                colors: {
                                  ...newTheme.colors,
                                  secondary: {
                                    ...newTheme.colors.secondary,
                                    light: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                          <TextField
                            size="small"
                            label="Dark"
                            value={newTheme.colors.secondary.dark}
                            onChange={(e) =>
                              setNewTheme({
                                ...newTheme,
                                colors: {
                                  ...newTheme.colors,
                                  secondary: {
                                    ...newTheme.colors.secondary,
                                    dark: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </Box>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Typographie</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                      <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                        <TextField
                          fullWidth
                          label="Famille de police"
                          value={newTheme.typography.fontFamily}
                          onChange={(e) =>
                            setNewTheme({
                              ...newTheme,
                              typography: {
                                ...newTheme.typography,
                                fontFamily: e.target.value,
                              },
                            })
                          }
                        />
                      </Box>
                      <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                        <TextField
                          fullWidth
                          label="Taille de police"
                          type="number"
                          value={newTheme.typography.fontSize}
                          onChange={(e) =>
                            setNewTheme({
                              ...newTheme,
                              typography: {
                                ...newTheme.typography,
                                fontSize: parseInt(e.target.value) || 14,
                              },
                            })
                          }
                        />
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Espacement</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                      <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                        <TextField
                          fullWidth
                          label="Unité de base"
                          type="number"
                          value={newTheme.spacing.unit}
                          onChange={(e) =>
                            setNewTheme({
                              ...newTheme,
                              spacing: {
                                ...newTheme.spacing,
                                unit: parseInt(e.target.value) || 8,
                              },
                            })
                          }
                        />
                      </Box>
                      <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                        <TextField
                          fullWidth
                          label="Rayon de bordure"
                          type="number"
                          value={newTheme.shape.borderRadius}
                          onChange={(e) =>
                            setNewTheme({
                              ...newTheme,
                              shape: {
                                ...newTheme.shape,
                                borderRadius: parseInt(e.target.value) || 4,
                              },
                            })
                          }
                        />
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              setSelectedTheme(null);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={createDialogOpen ? handleCreateTheme : handleUpdateTheme}
            variant="contained"
            startIcon={createDialogOpen ? <PaletteIcon /> : <SettingsIcon />}
            disabled={processing || !newTheme.name}
          >
            {processing
              ? "Traitement..."
              : createDialogOpen
              ? "Créer"
              : "Modifier"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'import */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Importer un thème</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Sélectionnez un fichier de thème à importer.
            </Alert>
            <TextField
              fullWidth
              type="file"
              inputProps={{ accept: ".json,.theme" }}
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
          <Button onClick={() => setImportDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleImportTheme}
            variant="contained"
            startIcon={<UploadIcon />}
            disabled={processing || !selectedFile}
          >
            {processing ? "Import..." : "Importer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'aperçu */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Aperçu du thème: {selectedTheme?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Aperçu des composants avec ce thème
            </Typography>
            {/* Ici, vous pouvez ajouter un aperçu des composants avec le thème sélectionné */}
            <Box sx={{ p: 2, border: "1px solid #ccc", borderRadius: 1 }}>
              <Typography variant="h1" gutterBottom>
                Titre H1
              </Typography>
              <Typography variant="h2" gutterBottom>
                Titre H2
              </Typography>
              <Typography variant="h3" gutterBottom>
                Titre H3
              </Typography>
              <Typography variant="body1" gutterBottom>
                Texte de corps normal
              </Typography>
              <Typography variant="body2" gutterBottom>
                Texte de corps secondaire
              </Typography>
              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                <Button variant="contained" color="primary">
                  Bouton primaire
                </Button>
                <Button variant="contained" color="secondary">
                  Bouton secondaire
                </Button>
                <Button variant="outlined">Bouton contour</Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Fermer</Button>
          <Button
            onClick={() => selectedTheme && handleApplyTheme(selectedTheme.id)}
            variant="contained"
            startIcon={<CheckCircleIcon />}
          >
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
