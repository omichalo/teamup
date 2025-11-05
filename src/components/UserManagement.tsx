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
  // List,
  // ListItem,
  // ListItemText,
  // ListItemSecondaryAction,
  IconButton,
  Chip,
  // Divider,
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
  FormGroup,
  Checkbox,
  Avatar,
  // Badge,
  CircularProgress,
} from "@mui/material";
import {
  // Person as PersonIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  AdminPanelSettings as AdminIcon,
  // PersonAdd as PersonAddIcon,
  Security as SecurityIcon,
  // Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

interface UserManagementProps {
  users: User[];
  onCreateUser: (user: CreateUser) => Promise<void>;
  onUpdateUser: (id: string, user: UpdateUser) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onToggleUserStatus: (id: string) => Promise<void>;
  onResetPassword: (id: string) => Promise<void>;
  onAssignRole: (id: string, role: string) => Promise<void>;
  onGetUserPermissions: (id: string) => Promise<Permission[]>;
  onUpdateUserPermissions: (id: string, permissions: string[]) => Promise<void>;
  loading?: boolean;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: "active" | "inactive" | "suspended" | "pending";
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  profile: {
    avatar?: string;
    phone?: string;
    department?: string;
    position?: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  security: {
    twoFactorEnabled: boolean;
    passwordChangedAt: string;
    failedLoginAttempts: number;
    lockedUntil?: string;
  };
}

interface CreateUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password: string;
  permissions: string[];
  profile: {
    phone?: string;
    department?: string;
    position?: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}

interface UpdateUser {
  firstName?: string;
  lastName?: string;
  role?: string;
  permissions?: string[];
  profile?: {
    phone?: string;
    department?: string;
    position?: string;
  };
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
}

export function UserManagement({
  users,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onResetPassword,
  onGetUserPermissions,
  onUpdateUserPermissions,
  loading = false,
}: UserManagementProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<CreateUser>({
    email: "",
    firstName: "",
    lastName: "",
    role: "user",
    password: "",
    permissions: [],
    profile: {},
    preferences: {
      language: "fr",
      timezone: "Europe/Paris",
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
    },
  });
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const roles = [
    { value: "admin", label: "Administrateur", color: "error" },
    { value: "manager", label: "Gestionnaire", color: "warning" },
    { value: "user", label: "Utilisateur", color: "primary" },
    { value: "viewer", label: "Observateur", color: "default" },
  ];

  const statuses = [
    { value: "active", label: "Actif", color: "success" },
    { value: "inactive", label: "Inactif", color: "default" },
    { value: "suspended", label: "Suspendu", color: "error" },
    { value: "pending", label: "En attente", color: "warning" },
  ];

  const languages = [
    { value: "fr", label: "Français" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "de", label: "Deutsch" },
  ];

  const timezones = [
    { value: "Europe/Paris", label: "Europe/Paris" },
    { value: "Europe/London", label: "Europe/London" },
    { value: "America/New_York", label: "America/New_York" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  ];

  const handleCreateUser = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onCreateUser(newUser);
      setCreateDialogOpen(false);
      setNewUser({
        email: "",
        firstName: "",
        lastName: "",
        role: "user",
        password: "",
        permissions: [],
        profile: {},
        preferences: {
          language: "fr",
          timezone: "Europe/Paris",
          notifications: {
            email: true,
            sms: false,
            push: true,
          },
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setProcessing(true);
      setError(null);
      await onUpdateUser(selectedUser.id, newUser);
      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (
      window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")
    ) {
      try {
        await onDeleteUser(id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
      }
    }
  };

  const handleResetPassword = async (id: string) => {
    if (
      window.confirm(
        "Êtes-vous sûr de vouloir réinitialiser le mot de passe de cet utilisateur ?"
      )
    ) {
      try {
        await onResetPassword(id);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de la réinitialisation"
        );
      }
    }
  };

  const handleViewPermissions = async (user: User) => {
    try {
      setProcessing(true);
      setError(null);
      const permissions = await onGetUserPermissions(user.id);
      setSelectedUser(user);
      setUserPermissions(permissions);
      setSelectedPermissions(user.permissions);
      setPermissionsDialogOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des permissions"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    try {
      setProcessing(true);
      setError(null);
      await onUpdateUserPermissions(selectedUser.id, selectedPermissions);
      setPermissionsDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la mise à jour des permissions"
      );
    } finally {
      setProcessing(false);
    }
  };

  const getRoleColor = (role: string) => {
    const roleObj = roles.find((r) => r.value === role);
    return roleObj ? roleObj.color : "default";
  };

  const getStatusColor = (status: string) => {
    const statusObj = statuses.find((s) => s.value === status);
    return statusObj ? statusObj.color : "default";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon color="success" />;
      case "inactive":
        return <InfoIcon color="inherit" />;
      case "suspended":
        return <ErrorIcon color="error" />;
      case "pending":
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="inherit" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const isUserLocked = (user: User) => {
    if (!user.security.lockedUntil) return false;
    return new Date(user.security.lockedUntil) > new Date();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Gestion des utilisateurs</Typography>
        <Box display="flex" gap={2}>
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
            Nouvel utilisateur
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
          <Typography variant="h6" gutterBottom>
            Utilisateurs ({users.length})
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
          ) : users.length === 0 ? (
            <Alert severity="info">Aucun utilisateur trouvé</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Utilisateur</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Dernière connexion</TableCell>
                    <TableCell>Sécurité</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar
                            {...(user.profile.avatar && {
                              src: user.profile.avatar,
                            })}
                            sx={{ width: 32, height: 32 }}
                          >
                            {getInitials(user.firstName, user.lastName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            roles.find((r) => r.value === user.role)?.label
                          }
                          color={
                            getRoleColor(user.role) as
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
                          {getStatusIcon(user.status)}
                          <Chip
                            label={
                              statuses.find((s) => s.value === user.status)
                                ?.label
                            }
                            color={
                              getStatusColor(user.status) as
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
                          {user.lastLogin
                            ? formatDate(user.lastLogin)
                            : "Jamais"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {user.security.twoFactorEnabled && (
                            <Tooltip title="Authentification à deux facteurs activée">
                              <SecurityIcon color="success" fontSize="small" />
                            </Tooltip>
                          )}
                          {isUserLocked(user) && (
                            <Tooltip title="Compte verrouillé">
                              <LockIcon color="error" fontSize="small" />
                            </Tooltip>
                          )}
                          {user.security.failedLoginAttempts > 0 && (
                            <Tooltip
                              title={`${user.security.failedLoginAttempts} tentatives échouées`}
                            >
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Modifier">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewUser({
                                  email: user.email,
                                  firstName: user.firstName,
                                  lastName: user.lastName,
                                  role: user.role,
                                  password: "",
                                  permissions: user.permissions,
                                  profile: user.profile,
                                  preferences: user.preferences,
                                });
                                setEditDialogOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Permissions">
                            <IconButton
                              size="small"
                              onClick={() => handleViewPermissions(user)}
                            >
                              <AdminIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Réinitialiser le mot de passe">
                            <IconButton
                              size="small"
                              onClick={() => handleResetPassword(user.id)}
                            >
                              <LockOpenIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUser(user.id)}
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

      {/* Dialog de création/modification */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          setSelectedUser(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {createDialogOpen ? "Créer un utilisateur" : "Modifier l&apos;utilisateur"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Prénom"
                  value={newUser.firstName}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      firstName: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Nom"
                  value={newUser.lastName}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      lastName: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      email: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Rôle</FormLabel>
                  <Select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        role: e.target.value,
                      })
                    }
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              {createDialogOpen && (
                <Box sx={{ width: "100%" }}>
                  <TextField
                    fullWidth
                    label="Mot de passe"
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        password: e.target.value,
                      })
                    }
                  />
                </Box>
              )}
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Téléphone"
                  value={newUser.profile.phone || ""}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      profile: {
                        ...newUser.profile,
                        phone: e.target.value,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Département"
                  value={newUser.profile.department || ""}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      profile: {
                        ...newUser.profile,
                        department: e.target.value,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Langue</FormLabel>
                  <Select
                    value={newUser.preferences.language}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        preferences: {
                          ...newUser.preferences,
                          language: e.target.value,
                        },
                      })
                    }
                  >
                    {languages.map((lang) => (
                      <MenuItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Fuseau horaire</FormLabel>
                  <Select
                    value={newUser.preferences.timezone}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        preferences: {
                          ...newUser.preferences,
                          timezone: e.target.value,
                        },
                      })
                    }
                  >
                    {timezones.map((tz) => (
                      <MenuItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: "100%" }}>
                <Typography variant="subtitle2" gutterBottom>
                  Notifications
                </Typography>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newUser.preferences.notifications.email}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            preferences: {
                              ...newUser.preferences,
                              notifications: {
                                ...newUser.preferences.notifications,
                                email: e.target.checked,
                              },
                            },
                          })
                        }
                      />
                    }
                    label="Email"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newUser.preferences.notifications.sms}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            preferences: {
                              ...newUser.preferences,
                              notifications: {
                                ...newUser.preferences.notifications,
                                sms: e.target.checked,
                              },
                            },
                          })
                        }
                      />
                    }
                    label="SMS"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newUser.preferences.notifications.push}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            preferences: {
                              ...newUser.preferences,
                              notifications: {
                                ...newUser.preferences.notifications,
                                push: e.target.checked,
                              },
                            },
                          })
                        }
                      />
                    }
                    label="Push"
                  />
                </FormGroup>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              setSelectedUser(null);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={createDialogOpen ? handleCreateUser : handleUpdateUser}
            variant="contained"
            startIcon={createDialogOpen ? <AddIcon /> : <EditIcon />}
            disabled={
              processing ||
              !newUser.firstName ||
              !newUser.lastName ||
              !newUser.email
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

      {/* Dialog des permissions */}
      <Dialog
        open={permissionsDialogOpen}
        onClose={() => setPermissionsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Permissions de {selectedUser?.firstName} {selectedUser?.lastName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sélectionnez les permissions à accorder à cet utilisateur.
            </Typography>
            <FormGroup>
              {userPermissions.map((permission) => (
                <FormControlLabel
                  key={permission.id}
                  control={
                    <Checkbox
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermissions([
                            ...selectedPermissions,
                            permission.id,
                          ]);
                        } else {
                          setSelectedPermissions(
                            selectedPermissions.filter(
                              (p) => p !== permission.id
                            )
                          );
                        }
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {permission.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {permission.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionsDialogOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleUpdatePermissions}
            variant="contained"
            startIcon={<AdminIcon />}
            disabled={processing}
          >
            {processing ? "Mise à jour..." : "Mettre à jour"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
