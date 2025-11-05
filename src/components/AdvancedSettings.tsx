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
  Alert,
  List,
  ListItem,
  ListItemText,
  // ListItemSecondaryAction,
  // IconButton,
  Chip,
  // Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  // Tooltip,
  Switch,
  FormControlLabel,
  // FormGroup,
  // Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  // CircularProgress,
  LinearProgress,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  // Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  // Security as SecurityIcon,
  // Storage as StorageIcon,
  // Speed as SpeedIcon,
  // NetworkCheck as NetworkIcon,
  // Memory as MemoryIcon,
  // Computer as CpuIcon,
  // Storage as StorageIcon2,
  // Dataset as DatabaseIcon,
  // Api as ApiIcon,
  // Lock as LockIcon,
  // Public as PublicIcon,
  // VpnLock as VpnLockIcon,
} from "@mui/icons-material";

interface AdvancedSettingsProps {
  settings: AdvancedSettings;
  onUpdateSettings: (settings: AdvancedSettings) => Promise<void>;
  onTestConnection: (type: string) => Promise<void>;
  onRestartService: (service: string) => Promise<void>;
  onClearCache: (type: string) => Promise<void>;
  onGetSystemInfo: () => Promise<SystemInfo>;
  loading?: boolean;
}

interface AdvancedSettings {
  database: {
    connectionPool: {
      min: number;
      max: number;
      idle: number;
      acquire: number;
      timeout: number;
    };
    query: {
      timeout: number;
      retries: number;
      batchSize: number;
      cacheSize: number;
    };
    backup: {
      enabled: boolean;
      frequency: string;
      retention: number;
      compression: boolean;
      encryption: boolean;
    };
  };
  cache: {
    redis: {
      enabled: boolean;
      host: string;
      port: number;
      password: string;
      database: number;
      ttl: number;
    };
    memory: {
      enabled: boolean;
      maxSize: number;
      evictionPolicy: string;
      ttl: number;
    };
  };
  security: {
    authentication: {
      jwt: {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
        algorithm: string;
      };
      session: {
        secret: string;
        maxAge: number;
        secure: boolean;
        httpOnly: boolean;
        sameSite: string;
      };
    };
    encryption: {
      algorithm: string;
      keyLength: number;
      saltRounds: number;
    };
    rateLimit: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
      skipSuccessfulRequests: boolean;
    };
    cors: {
      enabled: boolean;
      origin: string[];
      methods: string[];
      allowedHeaders: string[];
      credentials: boolean;
    };
  };
  performance: {
    compression: {
      enabled: boolean;
      level: number;
      threshold: number;
      algorithm: string;
    };
    clustering: {
      enabled: boolean;
      workers: number;
      strategy: string;
    };
    monitoring: {
      enabled: boolean;
      interval: number;
      metrics: string[];
      alerts: {
        cpu: number;
        memory: number;
        disk: number;
        responseTime: number;
      };
    };
  };
  logging: {
    level: string;
    format: string;
    destination: string;
    rotation: {
      enabled: boolean;
      maxSize: string;
      maxFiles: number;
      datePattern: string;
    };
    filters: {
      exclude: string[];
      include: string[];
    };
  };
  api: {
    versioning: {
      enabled: boolean;
      defaultVersion: string;
      supportedVersions: string[];
    };
    documentation: {
      enabled: boolean;
      path: string;
      auth: boolean;
    };
    rateLimit: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
      skipSuccessfulRequests: boolean;
    };
  };
}

interface SystemInfo {
  system: {
    platform: string;
    arch: string;
    release: string;
    uptime: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  network: {
    interfaces: {
      name: string;
      address: string;
      family: string;
    }[];
  };
  services: {
    name: string;
    status: "running" | "stopped" | "error";
    uptime: number;
    memory: number;
    cpu: number;
  }[];
}

export function AdvancedSettings({
  settings,
  onUpdateSettings,
  onTestConnection,
  onRestartService,
  onClearCache,
  onGetSystemInfo,
}: // loading = false,
AdvancedSettingsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [systemInfoDialogOpen, setSystemInfoDialogOpen] = useState(false);
  const [editingSettings, setEditingSettings] = useState(settings);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const handleUpdateSettings = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onUpdateSettings(editingSettings);
      setEditDialogOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleTestConnection = async (type: string) => {
    try {
      setTesting(type);
      setError(null);
      await onTestConnection(type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du test");
    } finally {
      setTesting(null);
    }
  };

  const handleRestartService = async (service: string) => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir redémarrer le service ${service} ?`
      )
    ) {
      try {
        setProcessing(true);
        setError(null);
        await onRestartService(service);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors du redémarrage"
        );
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleClearCache = async (type: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir vider le cache ${type} ?`)) {
      try {
        setProcessing(true);
        setError(null);
        await onClearCache(type);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors du vidage du cache"
        );
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleGetSystemInfo = async () => {
    try {
      setProcessing(true);
      setError(null);
      const info = await onGetSystemInfo();
      setSystemInfo(info);
      setSystemInfoDialogOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des informations système"
      );
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "success";
      case "stopped":
        return "error";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <CheckCircleIcon color="success" />;
      case "stopped":
        return <ErrorIcon color="error" />;
      case "error":
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="inherit" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}j ${hours}h ${minutes}m`;
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Paramètres avancés</Typography>
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
            startIcon={<InfoIcon />}
            onClick={handleGetSystemInfo}
            disabled={processing}
          >
            Informations système
          </Button>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => setEditDialogOpen(true)}
          >
            Modifier
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ width: "100%" }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Base de données
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Pool de connexions"
                    secondary={`Min: ${settings.database.connectionPool.min}, Max: ${settings.database.connectionPool.max}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Timeout des requêtes"
                    secondary={`${settings.database.query.timeout}ms`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Taille du cache"
                    secondary={`${settings.database.query.cacheSize} entrées`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Sauvegarde"
                    secondary={
                      settings.database.backup.enabled
                        ? "Activée"
                        : "Désactivée"
                    }
                  />
                </ListItem>
              </List>
              <Box display="flex" gap={1} mt={2}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleTestConnection("database")}
                  disabled={testing === "database"}
                >
                  {testing === "database" ? "Test..." : "Tester"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleRestartService("database")}
                  disabled={processing}
                >
                  Redémarrer
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: "100%" }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cache
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Redis"
                    secondary={
                      settings.cache.redis.enabled ? "Activé" : "Désactivé"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Mémoire"
                    secondary={
                      settings.cache.memory.enabled ? "Activé" : "Désactivé"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="TTL par défaut"
                    secondary={`${settings.cache.redis.ttl}s`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Taille max mémoire"
                    secondary={formatBytes(settings.cache.memory.maxSize)}
                  />
                </ListItem>
              </List>
              <Box display="flex" gap={1} mt={2}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleTestConnection("cache")}
                  disabled={testing === "cache"}
                >
                  {testing === "cache" ? "Test..." : "Tester"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleClearCache("all")}
                  disabled={processing}
                >
                  Vider
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: "100%" }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sécurité
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="JWT"
                    secondary={`Algorithme: ${settings.security.authentication.jwt.algorithm}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Expiration JWT"
                    secondary={settings.security.authentication.jwt.expiresIn}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Rate limiting"
                    secondary={
                      settings.security.rateLimit.enabled
                        ? "Activé"
                        : "Désactivé"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="CORS"
                    secondary={
                      settings.security.cors.enabled ? "Activé" : "Désactivé"
                    }
                  />
                </ListItem>
              </List>
              <Box display="flex" gap={1} mt={2}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleTestConnection("security")}
                  disabled={testing === "security"}
                >
                  {testing === "security" ? "Test..." : "Tester"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleRestartService("security")}
                  disabled={processing}
                >
                  Redémarrer
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: "100%" }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Compression"
                    secondary={
                      settings.performance.compression.enabled
                        ? "Activée"
                        : "Désactivée"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Clustering"
                    secondary={
                      settings.performance.clustering.enabled
                        ? "Activé"
                        : "Désactivé"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Workers"
                    secondary={settings.performance.clustering.workers}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Monitoring"
                    secondary={
                      settings.performance.monitoring.enabled
                        ? "Activé"
                        : "Désactivé"
                    }
                  />
                </ListItem>
              </List>
              <Box display="flex" gap={1} mt={2}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleTestConnection("performance")}
                  disabled={testing === "performance"}
                >
                  {testing === "performance" ? "Test..." : "Tester"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleRestartService("performance")}
                  disabled={processing}
                >
                  Redémarrer
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: "100%" }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Logging
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Niveau"
                    secondary={settings.logging.level}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Format"
                    secondary={settings.logging.format}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Rotation"
                    secondary={
                      settings.logging.rotation.enabled
                        ? "Activée"
                        : "Désactivée"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Taille max"
                    secondary={settings.logging.rotation.maxSize}
                  />
                </ListItem>
              </List>
              <Box display="flex" gap={1} mt={2}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleTestConnection("logging")}
                  disabled={testing === "logging"}
                >
                  {testing === "logging" ? "Test..." : "Tester"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleClearCache("logs")}
                  disabled={processing}
                >
                  Vider
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: "100%" }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Versioning"
                    secondary={
                      settings.api.versioning.enabled ? "Activé" : "Désactivé"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Version par défaut"
                    secondary={settings.api.versioning.defaultVersion}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Documentation"
                    secondary={
                      settings.api.documentation.enabled
                        ? "Activée"
                        : "Désactivée"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Rate limiting"
                    secondary={
                      settings.api.rateLimit.enabled ? "Activé" : "Désactivé"
                    }
                  />
                </ListItem>
              </List>
              <Box display="flex" gap={1} mt={2}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleTestConnection("api")}
                  disabled={testing === "api"}
                >
                  {testing === "api" ? "Test..." : "Tester"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleRestartService("api")}
                  disabled={processing}
                >
                  Redémarrer
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Dialog de modification */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Modifier les paramètres avancés</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Base de données</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Connexions min"
                      type="number"
                      value={editingSettings.database.connectionPool.min}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          database: {
                            ...editingSettings.database,
                            connectionPool: {
                              ...editingSettings.database.connectionPool,
                              min: parseInt(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Connexions max"
                      type="number"
                      value={editingSettings.database.connectionPool.max}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          database: {
                            ...editingSettings.database,
                            connectionPool: {
                              ...editingSettings.database.connectionPool,
                              max: parseInt(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Timeout des requêtes (ms)"
                      type="number"
                      value={editingSettings.database.query.timeout}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          database: {
                            ...editingSettings.database,
                            query: {
                              ...editingSettings.database.query,
                              timeout: parseInt(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Taille du cache"
                      type="number"
                      value={editingSettings.database.query.cacheSize}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          database: {
                            ...editingSettings.database,
                            query: {
                              ...editingSettings.database.query,
                              cacheSize: parseInt(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingSettings.database.backup.enabled}
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              database: {
                                ...editingSettings.database,
                                backup: {
                                  ...editingSettings.database.backup,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Sauvegarde automatique"
                    />
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Cache</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingSettings.cache.redis.enabled}
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              cache: {
                                ...editingSettings.cache,
                                redis: {
                                  ...editingSettings.cache.redis,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Redis activé"
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingSettings.cache.memory.enabled}
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              cache: {
                                ...editingSettings.cache,
                                memory: {
                                  ...editingSettings.cache.memory,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Cache mémoire activé"
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="TTL Redis (s)"
                      type="number"
                      value={editingSettings.cache.redis.ttl}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          cache: {
                            ...editingSettings.cache,
                            redis: {
                              ...editingSettings.cache.redis,
                              ttl: parseInt(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Taille max mémoire (bytes)"
                      type="number"
                      value={editingSettings.cache.memory.maxSize}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          cache: {
                            ...editingSettings.cache,
                            memory: {
                              ...editingSettings.cache.memory,
                              maxSize: parseInt(e.target.value) || 0,
                            },
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
                <Typography variant="h6">Sécurité</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Algorithme JWT"
                      value={
                        editingSettings.security.authentication.jwt.algorithm
                      }
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          security: {
                            ...editingSettings.security,
                            authentication: {
                              ...editingSettings.security.authentication,
                              jwt: {
                                ...editingSettings.security.authentication.jwt,
                                algorithm: e.target.value,
                              },
                            },
                          },
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Expiration JWT"
                      value={
                        editingSettings.security.authentication.jwt.expiresIn
                      }
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          security: {
                            ...editingSettings.security,
                            authentication: {
                              ...editingSettings.security.authentication,
                              jwt: {
                                ...editingSettings.security.authentication.jwt,
                                expiresIn: e.target.value,
                              },
                            },
                          },
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingSettings.security.rateLimit.enabled}
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              security: {
                                ...editingSettings.security,
                                rateLimit: {
                                  ...editingSettings.security.rateLimit,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Rate limiting activé"
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingSettings.security.cors.enabled}
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              security: {
                                ...editingSettings.security,
                                cors: {
                                  ...editingSettings.security.cors,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="CORS activé"
                    />
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Performance</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={
                            editingSettings.performance.compression.enabled
                          }
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              performance: {
                                ...editingSettings.performance,
                                compression: {
                                  ...editingSettings.performance.compression,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Compression activée"
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={
                            editingSettings.performance.clustering.enabled
                          }
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              performance: {
                                ...editingSettings.performance,
                                clustering: {
                                  ...editingSettings.performance.clustering,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Clustering activé"
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Nombre de workers"
                      type="number"
                      value={editingSettings.performance.clustering.workers}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          performance: {
                            ...editingSettings.performance,
                            clustering: {
                              ...editingSettings.performance.clustering,
                              workers: parseInt(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={
                            editingSettings.performance.monitoring.enabled
                          }
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              performance: {
                                ...editingSettings.performance,
                                monitoring: {
                                  ...editingSettings.performance.monitoring,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Monitoring activé"
                    />
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Logging</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ width: "100%" }}>
                    <FormControl fullWidth>
                      <FormLabel>Niveau de log</FormLabel>
                      <Select
                        value={editingSettings.logging.level}
                        onChange={(e) =>
                          setEditingSettings({
                            ...editingSettings,
                            logging: {
                              ...editingSettings.logging,
                              level: e.target.value,
                            },
                          })
                        }
                      >
                        <MenuItem value="error">Error</MenuItem>
                        <MenuItem value="warn">Warn</MenuItem>
                        <MenuItem value="info">Info</MenuItem>
                        <MenuItem value="debug">Debug</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormControl fullWidth>
                      <FormLabel>Format</FormLabel>
                      <Select
                        value={editingSettings.logging.format}
                        onChange={(e) =>
                          setEditingSettings({
                            ...editingSettings,
                            logging: {
                              ...editingSettings.logging,
                              format: e.target.value,
                            },
                          })
                        }
                      >
                        <MenuItem value="json">JSON</MenuItem>
                        <MenuItem value="text">Text</MenuItem>
                        <MenuItem value="combined">Combined</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingSettings.logging.rotation.enabled}
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              logging: {
                                ...editingSettings.logging,
                                rotation: {
                                  ...editingSettings.logging.rotation,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Rotation des logs activée"
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Taille max des fichiers"
                      value={editingSettings.logging.rotation.maxSize}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          logging: {
                            ...editingSettings.logging,
                            rotation: {
                              ...editingSettings.logging.rotation,
                              maxSize: e.target.value,
                            },
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
                <Typography variant="h6">API</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingSettings.api.versioning.enabled}
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              api: {
                                ...editingSettings.api,
                                versioning: {
                                  ...editingSettings.api.versioning,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Versioning activé"
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Version par défaut"
                      value={editingSettings.api.versioning.defaultVersion}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          api: {
                            ...editingSettings.api,
                            versioning: {
                              ...editingSettings.api.versioning,
                              defaultVersion: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingSettings.api.documentation.enabled}
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              api: {
                                ...editingSettings.api,
                                documentation: {
                                  ...editingSettings.api.documentation,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Documentation activée"
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingSettings.api.rateLimit.enabled}
                          onChange={(e) =>
                            setEditingSettings({
                              ...editingSettings,
                              api: {
                                ...editingSettings.api,
                                rateLimit: {
                                  ...editingSettings.api.rateLimit,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                        />
                      }
                      label="Rate limiting activé"
                    />
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleUpdateSettings}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={processing}
          >
            {processing ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog des informations système */}
      <Dialog
        open={systemInfoDialogOpen}
        onClose={() => setSystemInfoDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Informations système</DialogTitle>
        <DialogContent>
          {systemInfo && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box sx={{ width: "100%" }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Système
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Plateforme"
                            secondary={systemInfo.system.platform}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Architecture"
                            secondary={systemInfo.system.arch}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Version"
                            secondary={systemInfo.system.release}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Uptime"
                            secondary={formatUptime(systemInfo.system.uptime)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Charge moyenne"
                            secondary={systemInfo.system.loadAverage.join(", ")}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Box>

                <Box sx={{ width: "100%" }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Mémoire
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Totale"
                            secondary={formatBytes(systemInfo.memory.total)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Utilisée"
                            secondary={formatBytes(systemInfo.memory.used)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Libre"
                            secondary={formatBytes(systemInfo.memory.free)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Utilisation"
                            secondary={`${systemInfo.memory.percentage.toFixed(
                              1
                            )}%`}
                          />
                        </ListItem>
                      </List>
                      <LinearProgress
                        variant="determinate"
                        value={systemInfo.memory.percentage}
                        sx={{ mt: 2 }}
                      />
                    </CardContent>
                  </Card>
                </Box>

                <Box sx={{ width: "100%" }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        CPU
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Modèle"
                            secondary={systemInfo.cpu.model}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Cœurs"
                            secondary={systemInfo.cpu.cores}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Utilisation"
                            secondary={`${systemInfo.cpu.usage.toFixed(1)}%`}
                          />
                        </ListItem>
                      </List>
                      <LinearProgress
                        variant="determinate"
                        value={systemInfo.cpu.usage}
                        sx={{ mt: 2 }}
                      />
                    </CardContent>
                  </Card>
                </Box>

                <Box sx={{ width: "100%" }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Disque
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Totale"
                            secondary={formatBytes(systemInfo.disk.total)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Utilisée"
                            secondary={formatBytes(systemInfo.disk.used)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Libre"
                            secondary={formatBytes(systemInfo.disk.free)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Utilisation"
                            secondary={`${systemInfo.disk.percentage.toFixed(
                              1
                            )}%`}
                          />
                        </ListItem>
                      </List>
                      <LinearProgress
                        variant="determinate"
                        value={systemInfo.disk.percentage}
                        sx={{ mt: 2 }}
                      />
                    </CardContent>
                  </Card>
                </Box>

                <Box sx={{ width: "100%" }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Services
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Nom</TableCell>
                              <TableCell>Statut</TableCell>
                              <TableCell>Uptime</TableCell>
                              <TableCell>Mémoire</TableCell>
                              <TableCell>CPU</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {systemInfo.services.map((service, index) => (
                              <TableRow key={index}>
                                <TableCell>{service.name}</TableCell>
                                <TableCell>
                                  <Box
                                    display="flex"
                                    alignItems="center"
                                    gap={1}
                                  >
                                    {getStatusIcon(service.status)}
                                    <Chip
                                      label={service.status}
                                      color={
                                        getStatusColor(service.status) as
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
                                  {formatUptime(service.uptime)}
                                </TableCell>
                                <TableCell>
                                  {formatBytes(service.memory)}
                                </TableCell>
                                <TableCell>{service.cpu.toFixed(1)}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSystemInfoDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
