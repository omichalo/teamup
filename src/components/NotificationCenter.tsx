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
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Badge,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Event as EventIcon,
  Settings as SettingsIcon,
  MarkEmailRead as MarkEmailReadIcon,
  MarkEmailUnread as MarkEmailUnreadIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAsUnread: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  onArchiveNotification: (id: string) => Promise<void>;
  onUnarchiveNotification: (id: string) => Promise<void>;
  onGetNotificationSettings: () => Promise<NotificationSettings>;
  onUpdateNotificationSettings: (
    settings: NotificationSettings
  ) => Promise<void>;
  onFilterNotifications: (filters: NotificationFilters) => Promise<void>;
  onSortNotifications: (
    sortBy: string,
    direction: "asc" | "desc"
  ) => Promise<void>;
  loading?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type:
    | "info"
    | "warning"
    | "error"
    | "success"
    | "system"
    | "user"
    | "team"
    | "match";
  priority: "low" | "medium" | "high" | "urgent";
  status: "unread" | "read" | "archived";
  category:
    | "general"
    | "team"
    | "match"
    | "player"
    | "system"
    | "security"
    | "maintenance";
  source: {
    type: "system" | "user" | "team" | "match" | "player";
    id: string;
    name: string;
  };
  recipients: {
    type: "all" | "players" | "teams" | "specific";
    ids: string[];
  };
  channels: ("email" | "sms" | "push" | "in_app")[];
  scheduledAt?: string;
  sentAt?: string;
  readAt?: string;
  archivedAt?: string;
  createdAt: string;
  createdBy: string;
  metadata?: {
    [key: string]: unknown;
  };
  actions?: {
    id: string;
    label: string;
    type: "button" | "link" | "dismiss";
    url?: string;
    onClick?: () => void;
  }[];
}

interface NotificationSettings {
  general: {
    enableNotifications: boolean;
    enableSounds: boolean;
    enableDesktop: boolean;
    enableMobile: boolean;
  };
  categories: {
    [key: string]: {
      enabled: boolean;
      channels: ("email" | "sms" | "push" | "in_app")[];
      priority: "low" | "medium" | "high" | "urgent";
    };
  };
  timing: {
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
    digest: {
      enabled: boolean;
      frequency: "daily" | "weekly" | "monthly";
      time: string;
    };
  };
  filters: {
    keywords: string[];
    sources: string[];
    types: string[];
    priorities: string[];
  };
}

interface NotificationFilters {
  status?: string[];
  type?: string[];
  category?: string[];
  priority?: string[];
  source?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAsUnread,
  onDeleteNotification,
  onArchiveNotification,
  onUnarchiveNotification,
  onGetNotificationSettings,
  onUpdateNotificationSettings,
  onFilterNotifications,
  loading = false,
}: NotificationCenterProps) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const categories = [
    { value: "general", label: "Général", icon: <InfoIcon />, color: "info" },
    { value: "team", label: "Équipe", icon: <GroupIcon />, color: "primary" },
    { value: "match", label: "Match", icon: <EventIcon />, color: "secondary" },
    {
      value: "player",
      label: "Joueur",
      icon: <PersonIcon />,
      color: "success",
    },
    {
      value: "system",
      label: "Système",
      icon: <SettingsIcon />,
      color: "default",
    },
    {
      value: "security",
      label: "Sécurité",
      icon: <WarningIcon />,
      color: "error",
    },
    {
      value: "maintenance",
      label: "Maintenance",
      icon: <SettingsIcon />,
      color: "warning",
    },
  ];

  const types = [
    { value: "info", label: "Information", icon: <InfoIcon />, color: "info" },
    {
      value: "warning",
      label: "Avertissement",
      icon: <WarningIcon />,
      color: "warning",
    },
    { value: "error", label: "Erreur", icon: <ErrorIcon />, color: "error" },
    {
      value: "success",
      label: "Succès",
      icon: <CheckCircleIcon />,
      color: "success",
    },
    {
      value: "system",
      label: "Système",
      icon: <SettingsIcon />,
      color: "default",
    },
    {
      value: "user",
      label: "Utilisateur",
      icon: <PersonIcon />,
      color: "primary",
    },
    { value: "team", label: "Équipe", icon: <GroupIcon />, color: "secondary" },
    { value: "match", label: "Match", icon: <EventIcon />, color: "info" },
  ];

  const priorities = [
    { value: "low", label: "Faible", color: "default" },
    { value: "medium", label: "Moyenne", color: "info" },
    { value: "high", label: "Élevée", color: "warning" },
    { value: "urgent", label: "Urgente", color: "error" },
  ];

  const statuses = [
    { value: "unread", label: "Non lu", color: "primary" },
    { value: "read", label: "Lu", color: "default" },
    { value: "archived", label: "Archivé", color: "secondary" },
  ];

  const loadSettings = useCallback(async () => {
    try {
      const notificationSettings = await onGetNotificationSettings();
      setSettings(notificationSettings);
    } catch (err) {
      console.error("Erreur lors du chargement des paramètres:", err);
    }
  }, [onGetNotificationSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await onMarkAsRead(id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    }
  };

  const handleMarkAsUnread = async (id: string) => {
    try {
      await onMarkAsUnread(id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (
      window.confirm("Êtes-vous sûr de vouloir supprimer cette notification ?")
    ) {
      try {
        await onDeleteNotification(id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
      }
    }
  };

  const handleArchiveNotification = async (id: string) => {
    try {
      await onArchiveNotification(id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l&apos;archivage"
      );
    }
  };

  const handleUnarchiveNotification = async (id: string) => {
    try {
      await onUnarchiveNotification(id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la désarchivage"
      );
    }
  };

  const handleUpdateSettings = async () => {
    if (!settings) return;

    try {
      setProcessing(true);
      setError(null);
      await onUpdateNotificationSettings(settings);
      setSettingsDialogOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleFilterNotifications = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onFilterNotifications(filters);
      setFiltersDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du filtrage");
    } finally {
      setProcessing(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const typeObj = types.find((t) => t.value === type);
    return typeObj ? typeObj.icon : <InfoIcon />;
  };

  const getTypeColor = (type: string) => {
    const typeObj = types.find((t) => t.value === type);
    return typeObj ? typeObj.color : "default";
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find((c) => c.value === category);
    return cat ? cat.icon : <InfoIcon />;
  };

  const getPriorityColor = (priority: string) => {
    const prio = priorities.find((p) => p.value === priority);
    return prio ? prio.color : "default";
  };

  const getStatusColor = (status: string) => {
    const stat = statuses.find((s) => s.value === status);
    return stat ? stat.color : "default";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const getUnreadCount = () => {
    return notifications.filter((n) => n.status === "unread").length;
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;

    if (activeTab === 0) {
      filtered = filtered.filter((n) => n.status === "unread");
    } else if (activeTab === 1) {
      filtered = filtered.filter((n) => n.status === "read");
    } else if (activeTab === 2) {
      filtered = filtered.filter((n) => n.status === "archived");
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((n) => filters.status!.includes(n.status));
    }

    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter((n) => filters.type!.includes(n.type));
    }

    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter((n) => filters.category!.includes(n.category));
    }

    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter((n) => filters.priority!.includes(n.priority));
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.message.toLowerCase().includes(search) ||
          n.source.name.toLowerCase().includes(search)
      );
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Badge badgeContent={getUnreadCount()} color="error">
            <NotificationsIcon />
          </Badge>
          <Typography variant="h5">Centre de notifications</Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFiltersDialogOpen(true)}
          >
            Filtres
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsDialogOpen(true)}
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
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
            >
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    Non lues
                    <Chip
                      label={
                        notifications.filter((n) => n.status === "unread")
                          .length
                      }
                      size="small"
                      color="primary"
                    />
                  </Box>
                }
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    Lues
                    <Chip
                      label={
                        notifications.filter((n) => n.status === "read").length
                      }
                      size="small"
                      color="default"
                    />
                  </Box>
                }
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    Archivées
                    <Chip
                      label={
                        notifications.filter((n) => n.status === "archived")
                          .length
                      }
                      size="small"
                      color="secondary"
                    />
                  </Box>
                }
              />
            </Tabs>
          </Box>

          <Box sx={{ pt: 2 }}>
            {loading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="200px"
              >
                <CircularProgress />
              </Box>
            ) : filteredNotifications.length === 0 ? (
              <Alert severity="info">Aucune notification trouvée</Alert>
            ) : (
              <List>
                {filteredNotifications.map((notification) => (
                  <ListItem key={notification.id} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          {getTypeIcon(notification.type)}
                          <Typography variant="subtitle1" fontWeight="medium">
                            {notification.title}
                          </Typography>
                          <Chip
                            label={
                              types.find((t) => t.value === notification.type)
                                ?.label
                            }
                            color={
                              getTypeColor(notification.type) as
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
                          <Chip
                            label={
                              priorities.find(
                                (p) => p.value === notification.priority
                              )?.label
                            }
                            color={
                              getPriorityColor(notification.priority) as
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
                          <Chip
                            label={
                              statuses.find(
                                (s) => s.value === notification.status
                              )?.label
                            }
                            color={
                              getStatusColor(notification.status) as
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
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1 }}
                          >
                            {notification.message}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getCategoryIcon(notification.category)}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {
                                  categories.find(
                                    (c) => c.value === notification.category
                                  )?.label
                                }
                              </Typography>
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {notification.source.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatDate(notification.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        {notification.status === "unread" ? (
                          <Tooltip title="Marquer comme lu">
                            <IconButton
                              size="small"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <MarkEmailReadIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Marquer comme non lu">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleMarkAsUnread(notification.id)
                              }
                            >
                              <MarkEmailUnreadIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {notification.status === "archived" ? (
                          <Tooltip title="Désarchiver">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleUnarchiveNotification(notification.id)
                              }
                            >
                              <UnarchiveIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Archiver">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleArchiveNotification(notification.id)
                              }
                            >
                              <ArchiveIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleDeleteNotification(notification.id)
                            }
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
          </Box>
        </CardContent>
      </Card>

      {/* Dialog des paramètres */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Paramètres des notifications</DialogTitle>
        <DialogContent>
          {settings && (
            <Box sx={{ pt: 2 }}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Paramètres généraux</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.general.enableNotifications}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              general: {
                                ...settings.general,
                                enableNotifications: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label="Activer les notifications"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.general.enableSounds}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              general: {
                                ...settings.general,
                                enableSounds: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label="Activer les sons"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.general.enableDesktop}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              general: {
                                ...settings.general,
                                enableDesktop: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label="Notifications bureau"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.general.enableMobile}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              general: {
                                ...settings.general,
                                enableMobile: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label="Notifications mobile"
                    />
                  </FormGroup>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Catégories</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    {categories.map((category) => (
                      <Box
                        sx={{ width: { xs: "100%", sm: "50%" } }}
                        key={category.value}
                      >
                        <Card variant="outlined">
                          <CardContent>
                            <Box
                              display="flex"
                              alignItems="center"
                              gap={1}
                              mb={2}
                            >
                              {category.icon}
                              <Typography variant="subtitle1">
                                {category.label}
                              </Typography>
                            </Box>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={
                                    settings.categories[category.value]
                                      ?.enabled || false
                                  }
                                  onChange={(e) =>
                                    setSettings({
                                      ...settings,
                                      categories: {
                                        ...settings.categories,
                                        [category.value]: {
                                          ...settings.categories[
                                            category.value
                                          ],
                                          enabled: e.target.checked,
                                        },
                                      },
                                    })
                                  }
                                />
                              }
                              label="Activé"
                            />
                          </CardContent>
                        </Card>
                      </Box>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Horaires</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.timing.quietHours.enabled}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                timing: {
                                  ...settings.timing,
                                  quietHours: {
                                    ...settings.timing.quietHours,
                                    enabled: e.target.checked,
                                  },
                                },
                              })
                            }
                          />
                        }
                        label="Heures silencieuses"
                      />
                    </Box>
                    <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                      <TextField
                        fullWidth
                        label="Début"
                        type="time"
                        value={settings.timing.quietHours.start}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            timing: {
                              ...settings.timing,
                              quietHours: {
                                ...settings.timing.quietHours,
                                start: e.target.value,
                              },
                            },
                          })
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                      <TextField
                        fullWidth
                        label="Fin"
                        type="time"
                        value={settings.timing.quietHours.end}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            timing: {
                              ...settings.timing,
                              quietHours: {
                                ...settings.timing.quietHours,
                                end: e.target.value,
                              },
                            },
                          })
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                      <TextField
                        fullWidth
                        label="Fuseau horaire"
                        value={settings.timing.quietHours.timezone}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            timing: {
                              ...settings.timing,
                              quietHours: {
                                ...settings.timing.quietHours,
                                timezone: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleUpdateSettings}
            variant="contained"
            startIcon={<SettingsIcon />}
            disabled={processing}
          >
            {processing ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog des filtres */}
      <Dialog
        open={filtersDialogOpen}
        onClose={() => setFiltersDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Filtres des notifications</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: "100%" }}>
                <TextField
                  fullWidth
                  label="Recherche"
                  value={filters.search || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      search: e.target.value,
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Statut</FormLabel>
                  <Select
                    multiple
                    value={filters.status || []}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        status: e.target.value as string[],
                      })
                    }
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={
                              statuses.find((s) => s.value === value)?.label
                            }
                            color={
                              statuses.find((s) => s.value === value)?.color as
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
                        ))}
                      </Box>
                    )}
                  >
                    {statuses.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Type</FormLabel>
                  <Select
                    multiple
                    value={filters.type || []}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        type: e.target.value as string[],
                      })
                    }
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={types.find((t) => t.value === value)?.label}
                            color={
                              types.find((t) => t.value === value)?.color as
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
                        ))}
                      </Box>
                    )}
                  >
                    {types.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Catégorie</FormLabel>
                  <Select
                    multiple
                    value={filters.category || []}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        category: e.target.value as string[],
                      })
                    }
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={
                              categories.find((c) => c.value === value)?.label
                            }
                            color={
                              categories.find((c) => c.value === value)
                                ?.color as
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
                        ))}
                      </Box>
                    )}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Priorité</FormLabel>
                  <Select
                    multiple
                    value={filters.priority || []}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        priority: e.target.value as string[],
                      })
                    }
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={
                              priorities.find((p) => p.value === value)?.label
                            }
                            color={
                              priorities.find((p) => p.value === value)
                                ?.color as
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
                        ))}
                      </Box>
                    )}
                  >
                    {priorities.map((priority) => (
                      <MenuItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Date de début"
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateFrom: e.target.value,
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
                  value={filters.dateTo || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateTo: e.target.value,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFiltersDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleFilterNotifications}
            variant="contained"
            startIcon={<FilterListIcon />}
            disabled={processing}
          >
            {processing ? "Filtrage..." : "Filtrer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
