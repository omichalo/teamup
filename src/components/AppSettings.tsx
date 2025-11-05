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
  Switch,
  FormControlLabel,
  Alert,
  // Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  // IconButton,
  Chip,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  // Warning as WarningIcon,
  // Info as InfoIcon,
  // Delete as DeleteIcon,
  // Add as AddIcon,
} from "@mui/icons-material";

interface AppSettingsProps {
  settings: {
    general: {
      appName: string;
      appVersion: string;
      environment: "development" | "staging" | "production";
      timezone: string;
      language: string;
      currency: string;
      dateFormat: string;
      timeFormat: "12h" | "24h";
    };
    features: {
      enableNotifications: boolean;
      enableAuditLog: boolean;
      enableBackup: boolean;
      enableMaintenance: boolean;
      enableReports: boolean;
      enableUserManagement: boolean;
      enableThemeCustomization: boolean;
    };
    limits: {
      maxUsers: number;
      maxTeams: number;
      maxPlayers: number;
      maxMatches: number;
      maxFileSize: number;
      maxBackups: number;
    };
    security: {
      sessionTimeout: number;
      maxLoginAttempts: number;
      passwordMinLength: number;
      requireTwoFactor: boolean;
      allowedOrigins: string[];
      enableCORS: boolean;
    };
    performance: {
      cacheEnabled: boolean;
      cacheTtl: number;
      maxConcurrentRequests: number;
      requestTimeout: number;
      enableCompression: boolean;
      enableGzip: boolean;
    };
  };
  onSaveSettings: (settings: Record<string, unknown>) => Promise<void>;
  onResetSettings: () => Promise<void>;
  onTestConnection: (type: string) => Promise<void>;
}

export function AppSettings({
  settings,
  onSaveSettings,
  onResetSettings,
  onTestConnection,
}: AppSettingsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSettings, setEditingSettings] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const handleEditSettings = () => {
    setEditingSettings({ ...settings });
    setEditDialogOpen(true);
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await onSaveSettings(editingSettings);
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async () => {
    if (
      window.confirm(
        "Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?"
      )
    ) {
      try {
        await onResetSettings();
      } catch (error) {
        console.error("Erreur lors de la réinitialisation:", error);
      }
    }
  };

  const handleTestConnection = async (type: string) => {
    try {
      setTesting(type);
      await onTestConnection(type);
    } catch (error) {
      console.error("Erreur lors du test:", error);
    } finally {
      setTesting(null);
    }
  };

  const handleCancel = () => {
    setEditDialogOpen(false);
    setEditingSettings(settings);
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "development":
        return "info";
      case "staging":
        return "warning";
      case "production":
        return "success";
      default:
        return "default";
    }
  };

  const getEnvironmentLabel = (env: string) => {
    switch (env) {
      case "development":
        return "Développement";
      case "staging":
        return "Staging";
      case "production":
        return "Production";
      default:
        return env;
    }
  };

  const getFeatureStatus = (enabled: boolean) => {
    return enabled ? "Activé" : "Désactivé";
  };

  const getFeatureColor = (enabled: boolean) => {
    return enabled ? "success" : "default";
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">
              Paramètres de l&apos;application
            </Typography>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={handleEditSettings}
            >
              Modifier
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configuration générale de l&apos;application et de ses
            fonctionnalités.
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            <Box sx={{ width: { xs: "100%", md: "50%" } }}>
              <Typography variant="h6" gutterBottom>
                Informations générales
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Nom de l'application"
                    secondary={settings.general.appName}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Version"
                    secondary={settings.general.appVersion}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Environnement"
                    secondary={
                      <Chip
                        label={getEnvironmentLabel(
                          settings.general.environment
                        )}
                        color={getEnvironmentColor(
                          settings.general.environment
                        )}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Fuseau horaire"
                    secondary={settings.general.timezone}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Langue"
                    secondary={settings.general.language}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Devise"
                    secondary={settings.general.currency}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Format de date"
                    secondary={settings.general.dateFormat}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Format d'heure"
                    secondary={settings.general.timeFormat}
                  />
                </ListItem>
              </List>
            </Box>

            <Box sx={{ width: { xs: "100%", md: "50%" } }}>
              <Typography variant="h6" gutterBottom>
                Fonctionnalités
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Notifications"
                    secondary={getFeatureStatus(
                      settings.features.enableNotifications
                    )}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={getFeatureStatus(
                        settings.features.enableNotifications
                      )}
                      color={getFeatureColor(
                        settings.features.enableNotifications
                      )}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Log d'audit"
                    secondary={getFeatureStatus(
                      settings.features.enableAuditLog
                    )}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={getFeatureStatus(settings.features.enableAuditLog)}
                      color={getFeatureColor(settings.features.enableAuditLog)}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Sauvegarde"
                    secondary={getFeatureStatus(settings.features.enableBackup)}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={getFeatureStatus(settings.features.enableBackup)}
                      color={getFeatureColor(settings.features.enableBackup)}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Maintenance"
                    secondary={getFeatureStatus(
                      settings.features.enableMaintenance
                    )}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={getFeatureStatus(
                        settings.features.enableMaintenance
                      )}
                      color={getFeatureColor(
                        settings.features.enableMaintenance
                      )}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Rapports"
                    secondary={getFeatureStatus(
                      settings.features.enableReports
                    )}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={getFeatureStatus(settings.features.enableReports)}
                      color={getFeatureColor(settings.features.enableReports)}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Gestion des utilisateurs"
                    secondary={getFeatureStatus(
                      settings.features.enableUserManagement
                    )}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={getFeatureStatus(
                        settings.features.enableUserManagement
                      )}
                      color={getFeatureColor(
                        settings.features.enableUserManagement
                      )}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Personnalisation du thème"
                    secondary={getFeatureStatus(
                      settings.features.enableThemeCustomization
                    )}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={getFeatureStatus(
                        settings.features.enableThemeCustomization
                      )}
                      color={getFeatureColor(
                        settings.features.enableThemeCustomization
                      )}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Box>

            <Box sx={{ width: { xs: "100%", md: "50%" } }}>
              <Typography variant="h6" gutterBottom>
                Limites
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Utilisateurs maximum"
                    secondary={settings.limits.maxUsers}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Équipes maximum"
                    secondary={settings.limits.maxTeams}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Joueurs maximum"
                    secondary={settings.limits.maxPlayers}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Matchs maximum"
                    secondary={settings.limits.maxMatches}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Taille de fichier max (MB)"
                    secondary={settings.limits.maxFileSize}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Sauvegardes maximum"
                    secondary={settings.limits.maxBackups}
                  />
                </ListItem>
              </List>
            </Box>

            <Box sx={{ width: { xs: "100%", md: "50%" } }}>
              <Typography variant="h6" gutterBottom>
                Sécurité
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Timeout de session (min)"
                    secondary={settings.security.sessionTimeout}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Tentatives de connexion max"
                    secondary={settings.security.maxLoginAttempts}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Longueur min du mot de passe"
                    secondary={settings.security.passwordMinLength}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Authentification à deux facteurs"
                    secondary={
                      settings.security.requireTwoFactor
                        ? "Activée"
                        : "Désactivée"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Origines autorisées"
                    secondary={settings.security.allowedOrigins.join(", ")}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="CORS activé"
                    secondary={settings.security.enableCORS ? "Oui" : "Non"}
                  />
                </ListItem>
              </List>
            </Box>

            <Box sx={{ width: "100%" }}>
              <Typography variant="h6" gutterBottom>
                Performance
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Cache activé"
                    secondary={
                      settings.performance.cacheEnabled ? "Oui" : "Non"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="TTL du cache (s)"
                    secondary={settings.performance.cacheTtl}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Requêtes concurrentes max"
                    secondary={settings.performance.maxConcurrentRequests}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Timeout des requêtes (ms)"
                    secondary={settings.performance.requestTimeout}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Compression activée"
                    secondary={
                      settings.performance.enableCompression ? "Oui" : "Non"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Gzip activé"
                    secondary={settings.performance.enableGzip ? "Oui" : "Non"}
                  />
                </ListItem>
              </List>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => handleTestConnection("database")}
              disabled={testing === "database"}
            >
              {testing === "database" ? "Test..." : "Tester la base de données"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => handleTestConnection("api")}
              disabled={testing === "api"}
            >
              {testing === "api" ? "Test..." : "Tester l&apos;API"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => handleTestConnection("cache")}
              disabled={testing === "cache"}
            >
              {testing === "cache" ? "Test..." : "Tester le cache"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleResetSettings}
              color="warning"
            >
              Réinitialiser
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={editDialogOpen}
        onClose={handleCancel}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Modifier les paramètres</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Informations générales
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Nom de l'application"
                  value={editingSettings.general.appName}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      general: {
                        ...editingSettings.general,
                        appName: e.target.value,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Version"
                  value={editingSettings.general.appVersion}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      general: {
                        ...editingSettings.general,
                        appVersion: e.target.value,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Environnement</FormLabel>
                  <Select
                    value={editingSettings.general.environment}
                    onChange={(e) =>
                      setEditingSettings({
                        ...editingSettings,
                        general: {
                          ...editingSettings.general,
                          environment: e.target.value as
                            | "development"
                            | "staging"
                            | "production",
                        },
                      })
                    }
                  >
                    <MenuItem value="development">Développement</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="production">Production</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Fuseau horaire"
                  value={editingSettings.general.timezone}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      general: {
                        ...editingSettings.general,
                        timezone: e.target.value,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Langue"
                  value={editingSettings.general.language}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      general: {
                        ...editingSettings.general,
                        language: e.target.value,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Devise"
                  value={editingSettings.general.currency}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      general: {
                        ...editingSettings.general,
                        currency: e.target.value,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Format de date"
                  value={editingSettings.general.dateFormat}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      general: {
                        ...editingSettings.general,
                        dateFormat: e.target.value,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Format d&apos;heure</FormLabel>
                  <Select
                    value={editingSettings.general.timeFormat}
                    onChange={(e) =>
                      setEditingSettings({
                        ...editingSettings,
                        general: {
                          ...editingSettings.general,
                          timeFormat: e.target.value as "12h" | "24h",
                        },
                      })
                    }
                  >
                    <MenuItem value="12h">12 heures</MenuItem>
                    <MenuItem value="24h">24 heures</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Fonctionnalités
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              {Object.entries(editingSettings.features).map(([key, value]) => (
                <Box
                  sx={{ width: { xs: "100%", sm: "50%", md: "33.33%" } }}
                  key={key}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        onChange={(e) =>
                          setEditingSettings({
                            ...editingSettings,
                            features: {
                              ...editingSettings.features,
                              [key]: e.target.checked,
                            },
                          })
                        }
                      />
                    }
                    label={key
                      .replace("enable", "")
                      .replace(/([A-Z])/g, " $1")
                      .trim()}
                  />
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Limites
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              {Object.entries(editingSettings.limits).map(([key, value]) => (
                <Box
                  sx={{ width: { xs: "100%", sm: "50%", md: "33.33%" } }}
                  key={key}
                >
                  <TextField
                    fullWidth
                    label={key.replace(/([A-Z])/g, " $1").trim()}
                    type="number"
                    value={value}
                    onChange={(e) =>
                      setEditingSettings({
                        ...editingSettings,
                        limits: {
                          ...editingSettings.limits,
                          [key]: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Sécurité
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Timeout de session (minutes)"
                  type="number"
                  value={editingSettings.security.sessionTimeout}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      security: {
                        ...editingSettings.security,
                        sessionTimeout: parseInt(e.target.value) || 30,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Tentatives de connexion max"
                  type="number"
                  value={editingSettings.security.maxLoginAttempts}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      security: {
                        ...editingSettings.security,
                        maxLoginAttempts: parseInt(e.target.value) || 5,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Longueur min du mot de passe"
                  type="number"
                  value={editingSettings.security.passwordMinLength}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      security: {
                        ...editingSettings.security,
                        passwordMinLength: parseInt(e.target.value) || 8,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingSettings.security.requireTwoFactor}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          security: {
                            ...editingSettings.security,
                            requireTwoFactor: e.target.checked,
                          },
                        })
                      }
                    />
                  }
                  label="Authentification à deux facteurs"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingSettings.security.enableCORS}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          security: {
                            ...editingSettings.security,
                            enableCORS: e.target.checked,
                          },
                        })
                      }
                    />
                  }
                  label="CORS activé"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Performance
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingSettings.performance.cacheEnabled}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          performance: {
                            ...editingSettings.performance,
                            cacheEnabled: e.target.checked,
                          },
                        })
                      }
                    />
                  }
                  label="Cache activé"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="TTL du cache (secondes)"
                  type="number"
                  value={editingSettings.performance.cacheTtl}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      performance: {
                        ...editingSettings.performance,
                        cacheTtl: parseInt(e.target.value) || 300,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Requêtes concurrentes max"
                  type="number"
                  value={editingSettings.performance.maxConcurrentRequests}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      performance: {
                        ...editingSettings.performance,
                        maxConcurrentRequests: parseInt(e.target.value) || 10,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Timeout des requêtes (ms)"
                  type="number"
                  value={editingSettings.performance.requestTimeout}
                  onChange={(e) =>
                    setEditingSettings({
                      ...editingSettings,
                      performance: {
                        ...editingSettings.performance,
                        requestTimeout: parseInt(e.target.value) || 10000,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingSettings.performance.enableCompression}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          performance: {
                            ...editingSettings.performance,
                            enableCompression: e.target.checked,
                          },
                        })
                      }
                    />
                  }
                  label="Compression activée"
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingSettings.performance.enableGzip}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          performance: {
                            ...editingSettings.performance,
                            enableGzip: e.target.checked,
                          },
                        })
                      }
                    />
                  }
                  label="Gzip activé"
                />
              </Box>
            </Box>

            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Attention :</strong> La modification de ces paramètres
                peut affecter le fonctionnement de l&apos;application.
                Assurez-vous de bien comprendre les implications avant de
                sauvegarder.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Annuler</Button>
          <Button
            onClick={handleSaveSettings}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
