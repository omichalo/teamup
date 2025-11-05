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
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip,
  Badge,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Event as EventIcon,
  Sports as SportsIcon,
} from "@mui/icons-material";

interface NotificationManagerProps {
  notifications: Notification[];
  onSendNotification: (notification: CreateNotification) => Promise<void>;
  onUpdateNotification: (
    id: string,
    notification: UpdateNotification
  ) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onGetNotificationSettings: () => Promise<NotificationSettings>;
  onUpdateNotificationSettings: (
    settings: NotificationSettings
  ) => Promise<void>;
  loading?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  priority: "low" | "medium" | "high" | "urgent";
  status: "draft" | "scheduled" | "sent" | "failed";
  recipients: {
    type: "all" | "players" | "teams" | "specific";
    ids: string[];
  };
  channels: ("email" | "sms" | "push" | "in_app")[];
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  createdBy: string;
  readBy: string[];
  metadata?: {
    [key: string]: unknown;
  };
}

interface CreateNotification {
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  priority: "low" | "medium" | "high" | "urgent";
  recipients: {
    type: "all" | "players" | "teams" | "specific";
    ids: string[];
  };
  channels: ("email" | "sms" | "push" | "in_app")[];
  scheduledAt?: string;
  metadata?: {
    [key: string]: unknown;
  };
}

interface UpdateNotification {
  title?: string;
  message?: string;
  type?: "info" | "warning" | "error" | "success";
  priority?: "low" | "medium" | "high" | "urgent";
  recipients?: {
    type: "all" | "players" | "teams" | "specific";
    ids: string[];
  };
  channels?: ("email" | "sms" | "push" | "in_app")[];
  scheduledAt?: string;
  metadata?: {
    [key: string]: unknown;
  };
}

interface NotificationSettings {
  email: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    templates: {
      [key: string]: string;
    };
  };
  sms: {
    enabled: boolean;
    provider: string;
    apiKey: string;
    templates: {
      [key: string]: string;
    };
  };
  push: {
    enabled: boolean;
    firebase: {
      serverKey: string;
      projectId: string;
    };
  };
  inApp: {
    enabled: boolean;
    retention: number;
    maxPerUser: number;
  };
  scheduling: {
    enabled: boolean;
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
  };
  limits: {
    maxPerDay: number;
    maxPerUser: number;
    maxMessageLength: number;
  };
}

export function NotificationManager({
  notifications,
  onSendNotification,
  onUpdateNotification,
  onDeleteNotification,
  onMarkAllAsRead,
  onGetNotificationSettings,
  onUpdateNotificationSettings,
}: NotificationManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [newNotification, setNewNotification] = useState<CreateNotification>({
    title: "",
    message: "",
    type: "info",
    priority: "medium",
    recipients: {
      type: "all",
      ids: [],
    },
    channels: ["in_app"],
    metadata: {},
  });
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadSettings = useCallback(async () => {
    try {
      const notificationSettings = await onGetNotificationSettings();
      setSettings(notificationSettings);
    } catch (err) {
      console.error("Erreur lors du chargement des paramètres:", err);
    }
  }, [onGetNotificationSettings]);

  const handleCreateNotification = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onSendNotification(newNotification);
      setCreateDialogOpen(false);
      setNewNotification({
        title: "",
        message: "",
        type: "info",
        priority: "medium",
        recipients: {
          type: "all",
          ids: [],
        },
        channels: ["in_app"],
        metadata: {},
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateNotification = async () => {
    if (!selectedNotification) return;

    try {
      setProcessing(true);
      setError(null);
      await onUpdateNotification(selectedNotification.id, newNotification);
      setEditDialogOpen(false);
      setSelectedNotification(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setProcessing(false);
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

  const handleMarkAllAsRead = async () => {
    try {
      await onMarkAllAsRead();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "info":
        return <InfoIcon color="info" />;
      case "warning":
        return <WarningIcon color="warning" />;
      case "error":
        return <ErrorIcon color="error" />;
      case "success":
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon color="inherit" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "success";
      case "failed":
        return "error";
      case "scheduled":
        return "info";
      case "draft":
        return "default";
      default:
        return "default";
    }
  };

  const getRecipientsIcon = (type: string) => {
    switch (type) {
      case "all":
        return <GroupIcon />;
      case "players":
        return <PersonIcon />;
      case "teams":
        return <SportsIcon />;
      case "specific":
        return <EventIcon />;
      default:
        return <GroupIcon />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const unreadCount = notifications.filter(
    (n) => n.status === "sent" && n.readBy.length === 0
  ).length;

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
          <Typography variant="h5">Gestion des notifications</Typography>
        </Box>
        <Box display="flex" gap={2}>
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
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Nouvelle notification
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
                Notifications récentes
              </Typography>
              {notifications.length === 0 ? (
                <Alert severity="info">Aucune notification</Alert>
              ) : (
                <List>
                  {notifications.map((notification) => (
                    <ListItem key={notification.id} divider>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {getTypeIcon(notification.type)}
                            <Typography variant="subtitle1">
                              {notification.title}
                            </Typography>
                            <Chip
                              label={notification.priority}
                              color={getPriorityColor(notification.priority)}
                              size="small"
                            />
                            <Chip
                              label={notification.status}
                              color={getStatusColor(notification.status)}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {notification.message}
                            </Typography>
                            <Box
                              display="flex"
                              alignItems="center"
                              gap={2}
                              mt={1}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {getRecipientsIcon(
                                  notification.recipients.type
                                )}
                                {notification.recipients.type === "all"
                                  ? "Tous"
                                  : notification.recipients.type === "players"
                                  ? "Joueurs"
                                  : notification.recipients.type === "teams"
                                  ? "Équipes"
                                  : "Spécifiques"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {notification.channels.join(", ")}
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
                          <Tooltip title="Modifier">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedNotification(notification);
                                setNewNotification({
                                  title: notification.title,
                                  message: notification.message,
                                  type: notification.type,
                                  priority: notification.priority,
                                  recipients: notification.recipients,
                                  channels: notification.channels,
                                  scheduledAt: notification.scheduledAt,
                                  metadata: notification.metadata,
                                } as CreateNotification);
                                setEditDialogOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
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
                  startIcon={<CheckCircleIcon />}
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                >
                  Marquer tout comme lu ({unreadCount})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Programmer une notification
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SendIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Envoyer immédiatement
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
          setSelectedNotification(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {createDialogOpen
            ? "Créer une notification"
            : "Modifier la notification"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Titre"
                  value={newNotification.title}
                  onChange={(e) =>
                    setNewNotification({
                      ...newNotification,
                      title: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={newNotification.type}
                    onChange={(e) =>
                      setNewNotification({
                        ...newNotification,
                        type: e.target.value as
                          | "info"
                          | "warning"
                          | "error"
                          | "success",
                      })
                    }
                  >
                    <MenuItem value="info">Information</MenuItem>
                    <MenuItem value="warning">Avertissement</MenuItem>
                    <MenuItem value="error">Erreur</MenuItem>
                    <MenuItem value="success">Succès</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Priorité</FormLabel>
                  <Select
                    value={newNotification.priority}
                    onChange={(e) =>
                      setNewNotification({
                        ...newNotification,
                        priority: e.target.value as
                          | "low"
                          | "medium"
                          | "high"
                          | "urgent",
                      })
                    }
                  >
                    <MenuItem value="low">Faible</MenuItem>
                    <MenuItem value="medium">Moyenne</MenuItem>
                    <MenuItem value="high">Élevée</MenuItem>
                    <MenuItem value="urgent">Urgente</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Destinataires</FormLabel>
                  <Select
                    value={newNotification.recipients.type}
                    onChange={(e) =>
                      setNewNotification({
                        ...newNotification,
                        recipients: {
                          ...newNotification.recipients,
                          type: e.target.value as
                            | "all"
                            | "players"
                            | "teams"
                            | "specific",
                        },
                      })
                    }
                  >
                    <MenuItem value="all">Tous</MenuItem>
                    <MenuItem value="players">Joueurs</MenuItem>
                    <MenuItem value="teams">Équipes</MenuItem>
                    <MenuItem value="specific">Spécifiques</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: "100%" }}>
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={4}
                  value={newNotification.message}
                  onChange={(e) =>
                    setNewNotification({
                      ...newNotification,
                      message: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: "100%" }}>
                <FormControl fullWidth>
                  <FormLabel>Canal de communication</FormLabel>
                  <FormGroup row>
                    {["email", "sms", "push", "in_app"].map((channel) => (
                      <FormControlLabel
                        key={channel}
                        control={
                          <Checkbox
                            checked={newNotification.channels.includes(
                              channel as "email" | "sms" | "push" | "in_app"
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewNotification({
                                  ...newNotification,
                                  channels: [
                                    ...newNotification.channels,
                                    channel as
                                      | "email"
                                      | "sms"
                                      | "push"
                                      | "in_app",
                                  ],
                                });
                              } else {
                                setNewNotification({
                                  ...newNotification,
                                  channels: newNotification.channels.filter(
                                    (c) => c !== channel
                                  ),
                                });
                              }
                            }}
                          />
                        }
                        label={channel}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Programmer (optionnel)"
                  type="datetime-local"
                  value={newNotification.scheduledAt || ""}
                  onChange={(e) =>
                    setNewNotification({
                      ...newNotification,
                      scheduledAt: e.target.value,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              setSelectedNotification(null);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={
              createDialogOpen
                ? handleCreateNotification
                : handleUpdateNotification
            }
            variant="contained"
            startIcon={createDialogOpen ? <AddIcon /> : <EditIcon />}
            disabled={
              processing || !newNotification.title || !newNotification.message
            }
          >
            {processing
              ? "Traitement..."
              : createDialogOpen
              ? "Créer"
              : "Modifier"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog des paramètres */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Paramètres des notifications</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {settings && (
              <Box>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Email</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.email.enabled}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              email: {
                                ...settings.email,
                                enabled: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label="Activer les notifications par email"
                    />
                    <TextField
                      fullWidth
                      label="Serveur SMTP"
                      value={settings.email.smtp.host}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          email: {
                            ...settings.email,
                            smtp: {
                              ...settings.email.smtp,
                              host: e.target.value,
                            },
                          },
                        })
                      }
                      sx={{ mt: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Port"
                      type="number"
                      value={settings.email.smtp.port}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          email: {
                            ...settings.email,
                            smtp: {
                              ...settings.email.smtp,
                              port: parseInt(e.target.value) || 587,
                            },
                          },
                        })
                      }
                      sx={{ mt: 2 }}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">SMS</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.sms.enabled}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              sms: {
                                ...settings.sms,
                                enabled: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label="Activer les notifications par SMS"
                    />
                    <TextField
                      fullWidth
                      label="Fournisseur"
                      value={settings.sms.provider}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sms: {
                            ...settings.sms,
                            provider: e.target.value,
                          },
                        })
                      }
                      sx={{ mt: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Clé API"
                      type="password"
                      value={settings.sms.apiKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sms: {
                            ...settings.sms,
                            apiKey: e.target.value,
                          },
                        })
                      }
                      sx={{ mt: 2 }}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Notifications push</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.push.enabled}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              push: {
                                ...settings.push,
                                enabled: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label="Activer les notifications push"
                    />
                    <TextField
                      fullWidth
                      label="Clé serveur Firebase"
                      type="password"
                      value={settings.push.firebase.serverKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          push: {
                            ...settings.push,
                            firebase: {
                              ...settings.push.firebase,
                              serverKey: e.target.value,
                            },
                          },
                        })
                      }
                      sx={{ mt: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="ID du projet Firebase"
                      value={settings.push.firebase.projectId}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          push: {
                            ...settings.push,
                            firebase: {
                              ...settings.push.firebase,
                              projectId: e.target.value,
                            },
                          },
                        })
                      }
                      sx={{ mt: 2 }}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Notifications in-app</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.inApp.enabled}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              inApp: {
                                ...settings.inApp,
                                enabled: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label="Activer les notifications in-app"
                    />
                    <TextField
                      fullWidth
                      label="Rétention (jours)"
                      type="number"
                      value={settings.inApp.retention}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          inApp: {
                            ...settings.inApp,
                            retention: parseInt(e.target.value) || 30,
                          },
                        })
                      }
                      sx={{ mt: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Maximum par utilisateur"
                      type="number"
                      value={settings.inApp.maxPerUser}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          inApp: {
                            ...settings.inApp,
                            maxPerUser: parseInt(e.target.value) || 100,
                          },
                        })
                      }
                      sx={{ mt: 2 }}
                    />
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
          </Box>
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
    </Box>
  );
}
