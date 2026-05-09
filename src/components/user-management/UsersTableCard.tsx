import {
  AdminPanelSettings as AdminIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { ROLES, STATUSES } from "./constants";
import type { User } from "./types";
import {
  formatDate,
  getInitials,
  getRoleColor,
  getStatusColor,
  getStatusIcon,
  isUserLocked,
} from "./utils";

interface UsersTableCardProps {
  users: User[];
  loading: boolean;
  onEditUser: (user: User) => void;
  onViewPermissions: (user: User) => void;
  onResetPassword: (id: string) => void;
  onDeleteUser: (id: string) => void;
}

export function UsersTableCard({
  users,
  loading,
  onEditUser,
  onViewPermissions,
  onResetPassword,
  onDeleteUser,
}: UsersTableCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Utilisateurs ({users.length})
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
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
                          {...(user.profile.avatar ? { src: user.profile.avatar } : {})}
                          sx={{ width: 32, height: 32 }}
                        >
                          {getInitials(user.firstName, user.lastName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ROLES.find((role) => role.value === user.role)?.label ?? user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(user.status)}
                        <Chip
                          label={
                            STATUSES.find((status) => status.value === user.status)?.label ??
                            user.status
                          }
                          color={getStatusColor(user.status)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.lastLogin ? formatDate(user.lastLogin) : "Jamais"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {user.security.twoFactorEnabled && (
                          <Tooltip title="Authentification à deux facteurs activée">
                            <SecurityIcon color="success" fontSize="small" />
                          </Tooltip>
                        )}
                        {isUserLocked(user.security.lockedUntil) && (
                          <Tooltip title="Compte verrouillé">
                            <LockIcon color="error" fontSize="small" />
                          </Tooltip>
                        )}
                        {user.security.failedLoginAttempts > 0 && (
                          <Tooltip title={`${user.security.failedLoginAttempts} tentatives échouées`}>
                            <WarningIcon color="warning" fontSize="small" />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Modifier">
                          <IconButton size="small" onClick={() => onEditUser(user)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Permissions">
                          <IconButton size="small" onClick={() => onViewPermissions(user)}>
                            <AdminIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Réinitialiser le mot de passe">
                          <IconButton size="small" onClick={() => onResetPassword(user.id)}>
                            <LockOpenIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton size="small" onClick={() => onDeleteUser(user.id)}>
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
  );
}
