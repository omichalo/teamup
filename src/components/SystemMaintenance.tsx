"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  IconButton,
  Chip,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Switch,
  FormControlLabel,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import {
  Build as BuildIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Dataset as DatabaseIcon,
  Memory as MemoryIcon,
  Update as UpdateIcon,
  Backup as BackupIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
} from "@mui/icons-material";

interface SystemMaintenanceProps {
  maintenanceTasks: MaintenanceTask[];
  onRunTask: (taskId: string) => Promise<void>;
  onScheduleTask: (taskId: string, schedule: TaskSchedule) => Promise<void>;
  onGetTaskStatus: (taskId: string) => Promise<TaskStatus>;
  onGetSystemHealth: () => Promise<SystemHealth>;
  onGetMaintenanceLogs: () => Promise<MaintenanceLog[]>;
  onClearLogs: (olderThan: string) => Promise<void>;
  loading?: boolean;
}

interface MaintenanceTask {
  id: string;
  name: string;
  description: string;
  category:
    | "database"
    | "cache"
    | "storage"
    | "security"
    | "performance"
    | "cleanup"
    | "backup"
    | "update";
  type: "manual" | "scheduled" | "automatic";
  status: "idle" | "running" | "completed" | "failed" | "paused";
  priority: "low" | "medium" | "high" | "critical";
  estimatedDuration: number;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  successRate: number;
  parameters: {
    [key: string]: unknown;
  };
  dependencies: string[];
  requirements: {
    maintenanceWindow: boolean;
    systemDown: boolean;
    userNotification: boolean;
  };
}

interface TaskSchedule {
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  time: string;
  days: number[];
  enabled: boolean;
  maintenanceWindow: {
    start: string;
    end: string;
  };
}

interface TaskStatus {
  taskId: string;
  status: "idle" | "running" | "completed" | "failed" | "paused";
  progress: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  logs: string[];
  errors: string[];
  warnings: string[];
}

interface SystemHealth {
  overall: "healthy" | "warning" | "critical";
  components: {
    database: "healthy" | "warning" | "critical";
    cache: "healthy" | "warning" | "critical";
    storage: "healthy" | "warning" | "critical";
    security: "healthy" | "warning" | "critical";
    performance: "healthy" | "warning" | "critical";
    network: "healthy" | "warning" | "critical";
  };
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    responseTime: number;
  };
  alerts: {
    type: "warning" | "error" | "info";
    message: string;
    timestamp: string;
  }[];
}

interface MaintenanceLog {
  id: string;
  taskId: string;
  taskName: string;
  status: "started" | "completed" | "failed" | "paused";
  startTime: string;
  endTime?: string;
  duration?: number;
  logs: string[];
  errors: string[];
  warnings: string[];
  parameters: {
    [key: string]: unknown;
  };
}

export function SystemMaintenance({
  maintenanceTasks,
  onRunTask,
  onScheduleTask,
  onGetTaskStatus,
  onGetSystemHealth,
  onGetMaintenanceLogs,
  onClearLogs,
  loading = false,
}: SystemMaintenanceProps) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(
    null
  );
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [newSchedule, setNewSchedule] = useState<TaskSchedule>({
    frequency: "daily",
    time: "02:00",
    days: [],
    enabled: true,
    maintenanceWindow: {
      start: "01:00",
      end: "05:00",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const categories = [
    {
      value: "database",
      label: "Base de données",
      icon: <DatabaseIcon />,
      color: "primary",
    },
    {
      value: "cache",
      label: "Cache",
      icon: <MemoryIcon />,
      color: "secondary",
    },
    {
      value: "storage",
      label: "Stockage",
      icon: <StorageIcon />,
      color: "info",
    },
    {
      value: "security",
      label: "Sécurité",
      icon: <SecurityIcon />,
      color: "error",
    },
    {
      value: "performance",
      label: "Performance",
      icon: <SpeedIcon />,
      color: "warning",
    },
    {
      value: "cleanup",
      label: "Nettoyage",
      icon: <DeleteIcon />,
      color: "default",
    },
    {
      value: "backup",
      label: "Sauvegarde",
      icon: <BackupIcon />,
      color: "success",
    },
    {
      value: "update",
      label: "Mise à jour",
      icon: <UpdateIcon />,
      color: "info",
    },
  ];

  const priorities = [
    { value: "low", label: "Faible", color: "default" },
    { value: "medium", label: "Moyenne", color: "info" },
    { value: "high", label: "Élevée", color: "warning" },
    { value: "critical", label: "Critique", color: "error" },
  ];

  const frequencies = [
    { value: "once", label: "Une fois" },
    { value: "daily", label: "Quotidien" },
    { value: "weekly", label: "Hebdomadaire" },
    { value: "monthly", label: "Mensuel" },
    { value: "yearly", label: "Annuel" },
  ];

  useEffect(() => {
    loadSystemHealth();
    loadMaintenanceLogs();
  }, [loadSystemHealth, loadMaintenanceLogs]);

  const loadSystemHealth = useCallback(async () => {
    try {
      const health = await onGetSystemHealth();
      setSystemHealth(health);
    } catch (err) {
      console.error(
        "Erreur lors du chargement de l&apos;état du système:",
        err
      );
    }
  }, [onGetSystemHealth]);

  const loadMaintenanceLogs = useCallback(async () => {
    try {
      const logs = await onGetMaintenanceLogs();
      setMaintenanceLogs(logs);
    } catch (err) {
      console.error("Erreur lors du chargement des logs de maintenance:", err);
    }
  }, [onGetMaintenanceLogs]);

  const handleRunTask = async (taskId: string) => {
    try {
      setProcessing(true);
      setError(null);
      await onRunTask(taskId);
      await loadMaintenanceLogs();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l&apos;exécution de la tâche"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleTask = async (taskId: string) => {
    try {
      setProcessing(true);
      setError(null);
      await onScheduleTask(taskId, newSchedule);
      setScheduleDialogOpen(false);
      setSelectedTask(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la planification"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleViewStatus = async (task: MaintenanceTask) => {
    try {
      setProcessing(true);
      setError(null);
      const status = await onGetTaskStatus(task.id);
      setSelectedTask(task);
      setTaskStatus(status);
      setStatusDialogOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement du statut"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleClearLogs = async (olderThan: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ces logs ?")) {
      try {
        setProcessing(true);
        setError(null);
        await onClearLogs(olderThan);
        await loadMaintenanceLogs();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de la suppression des logs"
        );
      } finally {
        setProcessing(false);
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find((c) => c.value === category);
    return cat ? cat.icon : <BuildIcon />;
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find((c) => c.value === category);
    return cat ? cat.color : "default";
  };

  const getPriorityColor = (priority: string) => {
    const prio = priorities.find((p) => p.value === priority);
    return prio ? prio.color : "default";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "running":
        return "info";
      case "failed":
        return "error";
      case "paused":
        return "warning";
      case "idle":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon color="success" />;
      case "running":
        return <CircularProgress size={20} />;
      case "failed":
        return <ErrorIcon color="error" />;
      case "paused":
        return <WarningIcon color="warning" />;
      case "idle":
        return <InfoIcon color="inherit" />;
      default:
        return <InfoIcon color="inherit" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "success";
      case "warning":
        return "warning";
      case "critical":
        return "error";
      default:
        return "default";
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "healthy":
        return <CheckCircleIcon color="success" />;
      case "warning":
        return <WarningIcon color="warning" />;
      case "critical":
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="inherit" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const formatDuration = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${Math.round(milliseconds / 1000)}s`;
    if (milliseconds < 3600000) return `${Math.round(milliseconds / 60000)}min`;
    return `${Math.round(milliseconds / 3600000)}h`;
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Maintenance du système</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadSystemHealth();
              loadMaintenanceLogs();
            }}
            disabled={processing}
          >
            Actualiser
          </Button>
          <Button
            variant="outlined"
            startIcon={<InfoIcon />}
            onClick={() => setLogsDialogOpen(true)}
          >
            Voir les logs
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
                Tâches de maintenance
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
              ) : maintenanceTasks.length === 0 ? (
                <Alert severity="info">
                  Aucune tâche de maintenance trouvée
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nom</TableCell>
                        <TableCell>Catégorie</TableCell>
                        <TableCell>Priorité</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Dernière exécution</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {maintenanceTasks.map((task) => (
                        <TableRow key={task.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {task.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {task.description}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getCategoryIcon(task.category)}
                              <Chip
                                label={
                                  categories.find(
                                    (c) => c.value === task.category
                                  )?.label
                                }
                                color={
                                  getCategoryColor(task.category) as
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
                            <Chip
                              label={
                                priorities.find(
                                  (p) => p.value === task.priority
                                )?.label
                              }
                              color={
                                getPriorityColor(task.priority) as
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
                            <Box display="flex" alignItems="center" gap={1}>
                              {getStatusIcon(task.status)}
                              <Chip
                                label={task.status}
                                color={
                                  getStatusColor(task.status) as
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
                              {task.lastRun
                                ? formatDate(task.lastRun)
                                : "Jamais"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {task.runCount} exécution(s)
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="Exécuter">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRunTask(task.id)}
                                  disabled={
                                    processing || task.status === "running"
                                  }
                                >
                                  <PlayIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Voir le statut">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewStatus(task)}
                                >
                                  <InfoIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Planifier">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setScheduleDialogOpen(true);
                                  }}
                                >
                                  <SettingsIcon />
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
                État du système
              </Typography>
              {systemHealth ? (
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    {getHealthIcon(systemHealth.overall)}
                    <Typography variant="body1" fontWeight="medium">
                      {systemHealth.overall === "healthy"
                        ? "Sain"
                        : systemHealth.overall === "warning"
                        ? "Avertissement"
                        : "Critique"}
                    </Typography>
                  </Box>

                  <List dense>
                    {Object.entries(systemHealth.components).map(
                      ([component, health]) => (
                        <ListItem key={component}>
                          <ListItemText
                            primary={component}
                            secondary={
                              <Box display="flex" alignItems="center" gap={1}>
                                {getHealthIcon(health)}
                                <Chip
                                  label={health}
                                  color={
                                    getHealthColor(health) as
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
                            }
                          />
                        </ListItem>
                      )
                    )}
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Métriques
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">CPU</Typography>
                      <Typography variant="body2">
                        {systemHealth.metrics.cpu.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={systemHealth.metrics.cpu}
                      sx={{ mb: 1 }}
                    />

                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Mémoire</Typography>
                      <Typography variant="body2">
                        {systemHealth.metrics.memory.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={systemHealth.metrics.memory}
                      sx={{ mb: 1 }}
                    />

                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Disque</Typography>
                      <Typography variant="body2">
                        {systemHealth.metrics.disk.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={systemHealth.metrics.disk}
                      sx={{ mb: 1 }}
                    />
                  </Box>

                  {systemHealth.alerts.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Alertes
                      </Typography>
                      <List dense>
                        {systemHealth.alerts.slice(0, 3).map((alert, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={alert.message}
                              secondary={formatDate(alert.timestamp)}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              ) : (
                <Alert severity="info">
                  Chargement de l&apos;état du système...
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Dialog de planification */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Planifier la tâche: {selectedTask?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Fréquence</FormLabel>
                  <Select
                    value={newSchedule.frequency}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        frequency: e.target.value as
                          | "once"
                          | "daily"
                          | "weekly"
                          | "monthly"
                          | "yearly",
                      })
                    }
                  >
                    {frequencies.map((freq) => (
                      <MenuItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Heure"
                  type="time"
                  value={newSchedule.time}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      time: e.target.value,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Début de la fenêtre de maintenance"
                  type="time"
                  value={newSchedule.maintenanceWindow.start}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      maintenanceWindow: {
                        ...newSchedule.maintenanceWindow,
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
                  label="Fin de la fenêtre de maintenance"
                  type="time"
                  value={newSchedule.maintenanceWindow.end}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      maintenanceWindow: {
                        ...newSchedule.maintenanceWindow,
                        end: e.target.value,
                      },
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ width: "100%" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newSchedule.enabled}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          enabled: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Activer la planification"
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={() => selectedTask && handleScheduleTask(selectedTask.id)}
            variant="contained"
            startIcon={<SettingsIcon />}
            disabled={processing}
          >
            {processing ? "Planification..." : "Planifier"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog du statut */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Statut de la tâche: {selectedTask?.name}</DialogTitle>
        <DialogContent>
          {taskStatus && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                  <Typography variant="h6" gutterBottom>
                    Informations générales
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Statut"
                        secondary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {getStatusIcon(taskStatus.status)}
                            <Chip
                              label={taskStatus.status}
                              color={
                                getStatusColor(taskStatus.status) as
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
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Progression"
                        secondary={`${taskStatus.progress}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Heure de début"
                        secondary={
                          taskStatus.startTime
                            ? formatDate(taskStatus.startTime)
                            : "N/A"
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Heure de fin"
                        secondary={
                          taskStatus.endTime
                            ? formatDate(taskStatus.endTime)
                            : "N/A"
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Durée"
                        secondary={
                          taskStatus.duration
                            ? formatDuration(taskStatus.duration)
                            : "N/A"
                        }
                      />
                    </ListItem>
                  </List>
                </Box>

                <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                  <Typography variant="h6" gutterBottom>
                    Progression
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={taskStatus.progress}
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {taskStatus.progress}% terminé
                  </Typography>
                </Box>

                {taskStatus.logs.length > 0 && (
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="h6" gutterBottom>
                      Logs
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, maxHeight: 200, overflow: "auto" }}
                    >
                      <pre style={{ margin: 0, fontSize: "12px" }}>
                        {taskStatus.logs.join("\n")}
                      </pre>
                    </Paper>
                  </Box>
                )}

                {taskStatus.errors.length > 0 && (
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="h6" gutterBottom color="error">
                      Erreurs
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, maxHeight: 200, overflow: "auto" }}
                    >
                      <pre
                        style={{ margin: 0, fontSize: "12px", color: "red" }}
                      >
                        {taskStatus.errors.join("\n")}
                      </pre>
                    </Paper>
                  </Box>
                )}

                {taskStatus.warnings.length > 0 && (
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="h6" gutterBottom color="warning">
                      Avertissements
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, maxHeight: 200, overflow: "auto" }}
                    >
                      <pre
                        style={{ margin: 0, fontSize: "12px", color: "orange" }}
                      >
                        {taskStatus.warnings.join("\n")}
                      </pre>
                    </Paper>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog des logs */}
      <Dialog
        open={logsDialogOpen}
        onClose={() => setLogsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Logs de maintenance</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Historique des exécutions</Typography>
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleClearLogs("7d")}
                  disabled={processing}
                >
                  Supprimer les logs &gt; 7j
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleClearLogs("30d")}
                  disabled={processing}
                >
                  Supprimer les logs &gt; 30j
                </Button>
              </Box>
            </Box>

            {maintenanceLogs.length === 0 ? (
              <Alert severity="info">Aucun log de maintenance trouvé</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tâche</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Début</TableCell>
                      <TableCell>Fin</TableCell>
                      <TableCell>Durée</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {maintenanceLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {log.taskName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getStatusIcon(log.status)}
                            <Chip
                              label={log.status}
                              color={
                                getStatusColor(log.status) as
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
                            {formatDate(log.startTime)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.endTime ? formatDate(log.endTime) : "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.duration
                              ? formatDuration(log.duration)
                              : "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => {
                              // Afficher les détails du log
                              console.log("Log details:", log);
                            }}
                          >
                            Voir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
