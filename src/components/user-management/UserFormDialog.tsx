import { Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { LANGUAGES, ROLES, TIMEZONES } from "./constants";
import type { CreateUser, User } from "./types";

interface UserFormDialogProps {
  createDialogOpen: boolean;
  editDialogOpen: boolean;
  processing: boolean;
  selectedUser: User | null;
  newUser: CreateUser;
  onClose: () => void;
  onNewUserChange: (user: CreateUser) => void;
  onSubmit: () => void;
}

export function UserFormDialog({
  createDialogOpen,
  editDialogOpen,
  processing,
  newUser,
  onClose,
  onNewUserChange,
  onSubmit,
}: UserFormDialogProps) {
  const isCreateMode = createDialogOpen;

  return (
    <Dialog open={createDialogOpen || editDialogOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isCreateMode ? "Créer un utilisateur" : "Modifier l&apos;utilisateur"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
              <TextField
                fullWidth
                label="Prénom"
                value={newUser.firstName}
                onChange={(event) =>
                  onNewUserChange({
                    ...newUser,
                    firstName: event.target.value,
                  })
                }
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
              <TextField
                fullWidth
                label="Nom"
                value={newUser.lastName}
                onChange={(event) =>
                  onNewUserChange({
                    ...newUser,
                    lastName: event.target.value,
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
                onChange={(event) =>
                  onNewUserChange({
                    ...newUser,
                    email: event.target.value,
                  })
                }
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
              <FormControl fullWidth>
                <FormLabel>Rôle</FormLabel>
                <Select
                  value={newUser.role}
                  onChange={(event) =>
                    onNewUserChange({
                      ...newUser,
                      role: event.target.value,
                    })
                  }
                >
                  {ROLES.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {isCreateMode && (
              <Box sx={{ width: "100%" }}>
                <TextField
                  fullWidth
                  label="Mot de passe"
                  type="password"
                  value={newUser.password}
                  onChange={(event) =>
                    onNewUserChange({
                      ...newUser,
                      password: event.target.value,
                    })
                  }
                />
              </Box>
            )}

            <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
              <TextField
                fullWidth
                label="Téléphone"
                value={newUser.profile.phone ?? ""}
                onChange={(event) =>
                  onNewUserChange({
                    ...newUser,
                    profile: {
                      ...newUser.profile,
                      phone: event.target.value,
                    },
                  })
                }
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
              <TextField
                fullWidth
                label="Département"
                value={newUser.profile.department ?? ""}
                onChange={(event) =>
                  onNewUserChange({
                    ...newUser,
                    profile: {
                      ...newUser.profile,
                      department: event.target.value,
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
                  onChange={(event) =>
                    onNewUserChange({
                      ...newUser,
                      preferences: {
                        ...newUser.preferences,
                        language: event.target.value,
                      },
                    })
                  }
                >
                  {LANGUAGES.map((language) => (
                    <MenuItem key={language.value} value={language.value}>
                      {language.label}
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
                  onChange={(event) =>
                    onNewUserChange({
                      ...newUser,
                      preferences: {
                        ...newUser.preferences,
                        timezone: event.target.value,
                      },
                    })
                  }
                >
                  {TIMEZONES.map((timezone) => (
                    <MenuItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
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
                      onChange={(event) =>
                        onNewUserChange({
                          ...newUser,
                          preferences: {
                            ...newUser.preferences,
                            notifications: {
                              ...newUser.preferences.notifications,
                              email: event.target.checked,
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
                      onChange={(event) =>
                        onNewUserChange({
                          ...newUser,
                          preferences: {
                            ...newUser.preferences,
                            notifications: {
                              ...newUser.preferences.notifications,
                              sms: event.target.checked,
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
                      onChange={(event) =>
                        onNewUserChange({
                          ...newUser,
                          preferences: {
                            ...newUser.preferences,
                            notifications: {
                              ...newUser.preferences.notifications,
                              push: event.target.checked,
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
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          startIcon={isCreateMode ? <AddIcon /> : <EditIcon />}
          disabled={processing || !newUser.firstName || !newUser.lastName || !newUser.email}
        >
          {processing ? "Traitement..." : isCreateMode ? "Créer" : "Modifier"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
